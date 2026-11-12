import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import {
  persistTranslationOutcomes,
  translateArticlesBatch,
} from "@/lib/claude/translate-articles";

// translation_status가 'failed'인 기존 기사만 다시 번역/요약한다.
// RSS 재수집이나 기사 삭제 없이, 이미 DB에 저장된 기사만 대상으로 한다.
// 실행: node --env-file=.env.local node_modules/.bin/tsx src/scripts/retry-failed-translations.ts
async function main() {
  const failedArticles = await db
    .select({
      id: articles.id,
      titleOriginal: articles.titleOriginal,
      contentOriginal: articles.contentOriginal,
    })
    .from(articles)
    .where(eq(articles.translationStatus, "failed"));

  if (failedArticles.length === 0) {
    console.log("재시도할 실패 기사가 없습니다.");
    return;
  }

  console.log(`${failedArticles.length}건의 실패한 기사를 재번역합니다.`);

  const outcomes = await translateArticlesBatch(failedArticles);
  await persistTranslationOutcomes(outcomes);

  const succeeded = outcomes.filter((o) => o.status === "completed").length;
  const failed = outcomes.filter((o) => o.status === "failed").length;
  console.log(`완료: ${succeeded}건, 실패: ${failed}건`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
