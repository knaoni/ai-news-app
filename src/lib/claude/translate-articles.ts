import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { anthropicClient, CLAUDE_BATCH_CHUNK_SIZE, CLAUDE_HAIKU_MODEL } from "./client";
import { chunkArray } from "./chunk";
import { buildTranslationSystemPrompt, buildTranslationUserMessage } from "./prompts";
import type { TranslationOutcome, TranslationTarget } from "./types";

const TOOL_NAME = "submit_translations";

type RawTranslationItem = { id: string; title_ko: string; summary_ko: string };

// Anthropic strict tool schema는 array 타입에 minItems(0/1 외)·maxItems를 지원하지
// 않으므로(실제 호출 시 400 invalid_request_error), 개수/구조 길이 제약은 스키마에
// 넣지 않고 아래 isRawTranslationItem()으로 코드에서 직접 검증한다.
function buildTool(): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description: "번역/요약 결과를 제출합니다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        translations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title_ko: { type: "string" },
              summary_ko: { type: "string" },
            },
            required: ["id", "title_ko", "summary_ko"],
            additionalProperties: false,
          },
        },
      },
      required: ["translations"],
      additionalProperties: false,
    },
  };
}

function isRawTranslationItem(item: unknown): item is RawTranslationItem {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as Record<string, unknown>).id === "string" &&
    typeof (item as Record<string, unknown>).title_ko === "string" &&
    typeof (item as Record<string, unknown>).summary_ko === "string"
  );
}

async function translateChunk(
  chunk: TranslationTarget[],
): Promise<TranslationOutcome[]> {
  let rawResults: RawTranslationItem[];

  try {
    const response = await anthropicClient.messages.create({
      model: CLAUDE_HAIKU_MODEL,
      max_tokens: 8192,
      system: buildTranslationSystemPrompt(),
      messages: [{ role: "user", content: buildTranslationUserMessage(chunk) }],
      tools: [buildTool()],
      tool_choice: { type: "tool", name: TOOL_NAME },
    });

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use" && block.name === TOOL_NAME,
    );

    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      throw new Error("번역 응답에서 tool_use 블록을 찾지 못했습니다.");
    }

    const translations = (toolUseBlock.input as { translations?: unknown })
      .translations;

    if (!Array.isArray(translations)) {
      throw new Error("번역 응답의 translations 필드가 배열이 아닙니다.");
    }

    // 개별 항목의 구조(id/title_ko/summary_ko가 모두 문자열인지)는 스키마가 아니라
    // 여기서 직접 검증한다. 구조가 깨진 항목은 걸러내고, 아래 id 매칭 단계에서
    // "누락된 항목"으로 취급되어 해당 기사만 failed 처리된다.
    rawResults = translations.filter(isRawTranslationItem);
  } catch (error) {
    const reason =
      error instanceof Anthropic.APIError
        ? `Claude API 오류: ${error.message}`
        : "번역 API 호출에 실패했습니다.";

    return chunk.map((article) => ({
      id: article.id,
      status: "failed" as const,
      error: reason,
    }));
  }

  const byId = new Map(rawResults.map((item) => [item.id, item]));

  return chunk.map((article) => {
    const result = byId.get(article.id);

    if (!result || !result.title_ko.trim() || !result.summary_ko.trim()) {
      return {
        id: article.id,
        status: "failed" as const,
        error: "번역 결과가 누락되었습니다.",
      };
    }

    return {
      id: article.id,
      status: "completed" as const,
      titleKo: result.title_ko,
      summaryKo: result.summary_ko,
    };
  });
}

export async function translateArticlesBatch(
  targets: TranslationTarget[],
): Promise<TranslationOutcome[]> {
  if (targets.length === 0) return [];

  const outcomes: TranslationOutcome[] = [];
  for (const chunk of chunkArray(targets, CLAUDE_BATCH_CHUNK_SIZE)) {
    outcomes.push(...(await translateChunk(chunk)));
  }

  return outcomes;
}

export async function persistTranslationOutcomes(
  outcomes: TranslationOutcome[],
) {
  await Promise.all(
    outcomes.map((outcome) =>
      outcome.status === "completed"
        ? db
            .update(articles)
            .set({
              titleKo: outcome.titleKo,
              summaryKo: outcome.summaryKo,
              translationStatus: "completed",
              translationError: null,
            })
            .where(eq(articles.id, outcome.id))
        : db
            .update(articles)
            .set({
              translationStatus: "failed",
              translationError: outcome.error,
            })
            .where(eq(articles.id, outcome.id)),
    ),
  );
}
