import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { articleClassifications } from "@/lib/db/schema";
import {
  classifyArticlesBatch,
  loadClassificationTargetsForUser,
  loadUserCategories,
  persistClassificationOutcomes,
} from "@/lib/claude/classify-articles";

// articleClassifications에서 classificationStatus가 pending/failed인 행이 있는
// 모든 사용자에 대해, 그 사용자의 카테고리 기준으로 분류를 다시 수행한다.
// 기사 삭제나 RSS 재수집 없이, 이미 DB에 저장된 분류 대기 행만 대상으로 한다.
// 실행: node --env-file=.env.local node_modules/.bin/tsx src/scripts/retry-classifications.ts
async function main() {
  const userRows = await db
    .selectDistinct({ userId: articleClassifications.userId })
    .from(articleClassifications)
    .where(sql`${articleClassifications.classificationStatus} in ('pending', 'failed')`);

  if (userRows.length === 0) {
    console.log("재분류할 대상이 없습니다.");
    return;
  }

  for (const { userId } of userRows) {
    const categories = await loadUserCategories(userId);

    if (categories.length === 0) {
      console.log(`사용자 ${userId}: 카테고리가 없어 분류를 건너뜁니다.`);
      continue;
    }

    const targets = await loadClassificationTargetsForUser(userId);
    if (targets.length === 0) continue;

    console.log(`사용자 ${userId}: ${targets.length}건 분류 시도`);
    const outcomes = await classifyArticlesBatch(categories, targets);
    await persistClassificationOutcomes(userId, outcomes);

    const succeeded = outcomes.filter((o) => o.status === "classified").length;
    const failed = outcomes.filter((o) => o.status === "failed").length;
    console.log(`사용자 ${userId}: 완료 ${succeeded}건, 실패 ${failed}건`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
