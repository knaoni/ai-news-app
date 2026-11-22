import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { articleClassifications, categories, notionSaves } from "@/lib/db/schema";
import { ensureDefaultCategories } from "@/lib/categories/ensure-default-categories";
import {
  DashboardView,
  type DashboardArticle,
  type DashboardCategory,
} from "@/components/dashboard/dashboard-view";

// 로그인 사용자별 데이터를 다루는 동적 페이지
export const instant = false;

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  await ensureDefaultCategories(userId);

  const [userCategories, feedRows, userNotionSaves] = await Promise.all([
    db.query.categories.findMany({
      where: eq(categories.userId, userId),
      orderBy: [asc(categories.position), asc(categories.createdAt)],
    }),
    db.query.articleClassifications.findMany({
      where: eq(articleClassifications.userId, userId),
      with: { article: true, category: true },
    }),
    db.query.notionSaves.findMany({
      where: eq(notionSaves.userId, userId),
    }),
  ]);

  const notionPageUrlByArticleId = new Map(
    userNotionSaves.map((save) => [save.articleId, save.notionPageUrl]),
  );

  const dashboardCategories: DashboardCategory[] = userCategories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
  }));

  const dashboardArticles: DashboardArticle[] = feedRows
    .map((row) => ({
      classificationId: row.id,
      articleId: row.article.id,
      titleKo: row.article.titleKo,
      titleOriginal: row.article.titleOriginal,
      summaryKo: row.article.summaryKo,
      source: row.article.source,
      url: row.article.url,
      publishedAt: row.article.publishedAt,
      createdAt: row.article.createdAt,
      translationStatus: row.article.translationStatus,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      categoryColor: row.category?.color ?? null,
      notionPageUrl: notionPageUrlByArticleId.get(row.article.id) ?? null,
    }))
    .sort((a, b) => {
      const aTime = (a.publishedAt ?? a.createdAt).getTime();
      const bTime = (b.publishedAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });

  return <DashboardView categories={dashboardCategories} articles={dashboardArticles} />;
}
