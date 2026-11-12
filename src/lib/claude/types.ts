// articles 테이블에서 아직 번역/요약이 끝나지 않은(pending/failed) 기사.
// RSS 파싱 결과인 FetchedArticle(fetch-feeds.ts)과는 별개 타입 — 이쪽은 DB id를
// 포함하는, 이미 저장된 기사만을 가리킨다.
export type TranslationTarget = {
  id: string;
  titleOriginal: string;
  contentOriginal: string;
};

export type TranslationOutcome =
  | { id: string; status: "completed"; titleKo: string; summaryKo: string }
  | { id: string; status: "failed"; error: string };

export type ClassificationCategoryOption = {
  id: string;
  name: string;
  description: string | null;
};

// 분류 입력 — 번역이 끝난 기사는 한국어 제목/요약을, 아직 pending/failed인 기사는
// 원문으로 폴백해서 넘긴다.
export type ClassificationTarget = {
  articleId: string;
  title: string;
  summary: string;
};

export type ClassificationOutcome =
  | { articleId: string; status: "classified"; categoryId: string | null }
  | { articleId: string; status: "failed" };
