import type {
  ClassificationCategoryOption,
  ClassificationTarget,
  TranslationTarget,
} from "./types";

const CONTENT_TRUNCATE_LENGTH = 4000;

function truncateForPrompt(text: string, maxLength: number) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}

export function buildTranslationSystemPrompt() {
  return [
    "당신은 한국 테크 업계 독자를 위한 AI 뉴스 전문 번역가입니다.",
    "입력으로 주어진 각 기사에 대해 다음을 작성하세요:",
    "1. 자연스러운 한국어 제목 번역 (title_ko)",
    "2. 핵심 내용을 담은 2~3문장의 한국어 요약 (summary_ko)",
    "",
    "반드시 입력에 주어진 id를 그대로 보존해서 반환하세요.",
    "입력된 기사 수와 정확히 같은 수의 결과를 반환해야 합니다.",
    "내용이 짧거나 모호해도 주어진 정보만으로 최선을 다해 번역/요약하세요.",
    "반드시 submit_translations 도구만 호출하세요.",
  ].join("\n");
}

export function buildTranslationUserMessage(chunk: TranslationTarget[]) {
  const payload = chunk.map((article) => ({
    id: article.id,
    titleOriginal: article.titleOriginal,
    contentOriginal: truncateForPrompt(
      article.contentOriginal,
      CONTENT_TRUNCATE_LENGTH,
    ),
  }));

  return JSON.stringify(payload);
}

export function buildClassificationSystemPrompt(
  categories: ClassificationCategoryOption[],
) {
  const categoryList = categories
    .map((category, index) => {
      const description = category.description
        ? ` — ${category.description}`
        : "";
      return `${index + 1}. [${category.id}] ${category.name}${description}`;
    })
    .join("\n");

  return [
    "당신은 AI 뉴스 기사를 사용자가 정의한 카테고리로 분류하는 분류기입니다.",
    "아래 카테고리 목록 중에서만 각 기사를 정확히 하나의 카테고리로 분류하세요.",
    "",
    "카테고리 목록:",
    categoryList,
    "",
    "적합한 카테고리가 전혀 없으면 category_id에 \"NONE\"을 반환하세요.",
    "목록에 없는 임의의 id를 만들어내지 마세요.",
    "입력된 기사 수와 정확히 같은 수의 결과를 반환해야 합니다.",
    "반드시 submit_classifications 도구만 호출하세요.",
  ].join("\n");
}

export function buildClassificationUserMessage(chunk: ClassificationTarget[]) {
  const payload = chunk.map((target) => ({
    articleId: target.articleId,
    title: target.title,
    summary: target.summary,
  }));

  return JSON.stringify(payload);
}
