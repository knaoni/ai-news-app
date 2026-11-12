import Anthropic from "@anthropic-ai/sdk";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { articleClassifications, categories } from "@/lib/db/schema";
import { anthropicClient, CLAUDE_BATCH_CHUNK_SIZE, CLAUDE_HAIKU_MODEL } from "./client";
import { chunkArray } from "./chunk";
import {
  buildClassificationSystemPrompt,
  buildClassificationUserMessage,
} from "./prompts";
import type {
  ClassificationCategoryOption,
  ClassificationOutcome,
  ClassificationTarget,
} from "./types";

const TOOL_NAME = "submit_classifications";
const SUMMARY_FALLBACK_LENGTH = 300;
const NONE_CATEGORY_ID = "NONE";

export async function loadUserCategories(
  userId: string,
): Promise<ClassificationCategoryOption[]> {
  const rows = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
    orderBy: [asc(categories.position), asc(categories.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
  }));
}

export async function loadClassificationTargetsForUser(
  userId: string,
): Promise<ClassificationTarget[]> {
  const rows = await db.query.articleClassifications.findMany({
    where: and(
      eq(articleClassifications.userId, userId),
      inArray(articleClassifications.classificationStatus, ["pending", "failed"]),
    ),
    with: { article: true },
  });

  return rows.map((row) => ({
    articleId: row.article.id,
    title: row.article.titleKo ?? row.article.titleOriginal,
    summary:
      row.article.summaryKo ??
      row.article.contentOriginal.trim().slice(0, SUMMARY_FALLBACK_LENGTH),
  }));
}

type RawClassificationItem = { article_id: string; category_id: string };

// Anthropic strict tool schema는 array 타입에 minItems(0/1 외)·maxItems를 지원하지
// 않으므로(실제 호출 시 400 invalid_request_error), 개수/구조 길이 제약은 스키마에
// 넣지 않고 아래 isRawClassificationItem()으로 코드에서 직접 검증한다.
function buildTool(categoryIds: string[]): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description: "카테고리 분류 결과를 제출합니다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        classifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              article_id: { type: "string" },
              category_id: {
                type: "string",
                enum: [...categoryIds, NONE_CATEGORY_ID],
              },
            },
            required: ["article_id", "category_id"],
            additionalProperties: false,
          },
        },
      },
      required: ["classifications"],
      additionalProperties: false,
    },
  };
}

function isRawClassificationItem(item: unknown): item is RawClassificationItem {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as Record<string, unknown>).article_id === "string" &&
    typeof (item as Record<string, unknown>).category_id === "string"
  );
}

async function classifyChunk(
  categoryOptions: ClassificationCategoryOption[],
  chunk: ClassificationTarget[],
): Promise<ClassificationOutcome[]> {
  let rawResults: RawClassificationItem[];

  try {
    const response = await anthropicClient.messages.create({
      model: CLAUDE_HAIKU_MODEL,
      max_tokens: 8192,
      system: buildClassificationSystemPrompt(categoryOptions),
      messages: [
        { role: "user", content: buildClassificationUserMessage(chunk) },
      ],
      tools: [buildTool(categoryOptions.map((c) => c.id))],
      tool_choice: { type: "tool", name: TOOL_NAME },
    });

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use" && block.name === TOOL_NAME,
    );

    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      throw new Error("분류 응답에서 tool_use 블록을 찾지 못했습니다.");
    }

    const classifications = (
      toolUseBlock.input as { classifications?: unknown }
    ).classifications;

    if (!Array.isArray(classifications)) {
      throw new Error("분류 응답의 classifications 필드가 배열이 아닙니다.");
    }

    // 개별 항목의 구조(article_id/category_id가 모두 문자열인지)는 스키마가 아니라
    // 여기서 직접 검증한다. 구조가 깨진 항목은 걸러내고, 아래 id 매칭 단계에서
    // "누락된 항목"으로 취급되어 해당 기사만 failed 처리된다.
    rawResults = classifications.filter(isRawClassificationItem);
  } catch {
    return chunk.map((target) => ({
      articleId: target.articleId,
      status: "failed" as const,
    }));
  }

  const byId = new Map(rawResults.map((item) => [item.article_id, item]));

  return chunk.map((target) => {
    const result = byId.get(target.articleId);

    if (!result) {
      return { articleId: target.articleId, status: "failed" as const };
    }

    return {
      articleId: target.articleId,
      status: "classified" as const,
      categoryId:
        result.category_id === NONE_CATEGORY_ID ? null : result.category_id,
    };
  });
}

export async function classifyArticlesBatch(
  categoryOptions: ClassificationCategoryOption[],
  targets: ClassificationTarget[],
): Promise<ClassificationOutcome[]> {
  if (categoryOptions.length === 0 || targets.length === 0) return [];

  const outcomes: ClassificationOutcome[] = [];
  for (const chunk of chunkArray(targets, CLAUDE_BATCH_CHUNK_SIZE)) {
    outcomes.push(...(await classifyChunk(categoryOptions, chunk)));
  }

  return outcomes;
}

export async function persistClassificationOutcomes(
  userId: string,
  outcomes: ClassificationOutcome[],
) {
  await Promise.all(
    outcomes.map((outcome) =>
      db
        .update(articleClassifications)
        .set(
          outcome.status === "classified"
            ? { classificationStatus: "classified", categoryId: outcome.categoryId }
            : { classificationStatus: "failed" },
        )
        .where(
          and(
            eq(articleClassifications.userId, userId),
            eq(articleClassifications.articleId, outcome.articleId),
          ),
        ),
    ),
  );
}
