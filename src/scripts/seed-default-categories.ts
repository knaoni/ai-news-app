import { db } from "@/lib/db";
import { articleClassifications } from "@/lib/db/schema";
import { ensureDefaultCategories } from "@/lib/categories/ensure-default-categories";

// article_classifications에 데이터가 있는(=실제로 뉴스를 가져온 적 있는) 모든
// 사용자에 대해 기본 카테고리 4개를 시딩한다(이미 카테고리가 있으면 건너뜀).
// 실행: node --env-file=.env.local node_modules/.bin/tsx src/scripts/seed-default-categories.ts
async function main() {
  const userRows = await db.selectDistinct({ userId: articleClassifications.userId }).from(
    articleClassifications,
  );

  for (const { userId } of userRows) {
    await ensureDefaultCategories(userId);
    console.log(`사용자 ${userId}: 기본 카테고리 확인/생성 완료`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
