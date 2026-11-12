import { and, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { articleClassifications, articles } from "@/lib/db/schema";
import type { TranslationTarget } from "@/lib/claude/types";
import type { FetchedArticle } from "./fetch-feeds";

export async function saveArticlesForUser(
  userId: string,
  fetched: FetchedArticle[],
): Promise<{ linkedCount: number; articlesNeedingTranslation: TranslationTarget[] }> {
  if (fetched.length === 0) {
    return { linkedCount: 0, articlesNeedingTranslation: [] };
  }

  // 같은 요청 안에서 URL이 중복되면(여러 피드가 같은 기사를 싣는 경우 등) 1건으로 합친다.
  const byUrl = new Map<string, FetchedArticle>();
  for (const article of fetched) {
    if (!byUrl.has(article.url)) byUrl.set(article.url, article);
  }
  const uniqueArticles = [...byUrl.values()];

  // articles.url UNIQUE 제약을 이용한 upsert. 이미 존재하는 기사는 번역/요약 필드를
  // 건드리지 않고 id만 돌려받기 위해 url을 자기 자신으로 덮어쓰는 no-op update를 사용한다.
  const savedRows = await db
    .insert(articles)
    .values(
      uniqueArticles.map((article) => ({
        url: article.url,
        titleOriginal: article.titleOriginal,
        contentOriginal: article.contentOriginal,
        source: article.source,
        publishedAt: article.publishedAt,
      })),
    )
    .onConflictDoUpdate({
      target: articles.url,
      set: { url: sql`excluded.url` },
    })
    .returning({ id: articles.id });

  // 요청한 사용자의 피드에 연결한다. 이미 연결(분류 포함)되어 있던 기사는 건드리지 않는다.
  await db
    .insert(articleClassifications)
    .values(
      savedRows.map((row) => ({
        userId,
        articleId: row.id,
        categoryId: null,
        classificationStatus: "pending" as const,
      })),
    )
    .onConflictDoNothing({
      target: [articleClassifications.userId, articleClassifications.articleId],
    });

  const articlesNeedingTranslation = await db
    .select({
      id: articles.id,
      titleOriginal: articles.titleOriginal,
      contentOriginal: articles.contentOriginal,
    })
    .from(articles)
    .where(
      and(
        inArray(
          articles.id,
          savedRows.map((row) => row.id),
        ),
        ne(articles.translationStatus, "completed"),
      ),
    );

  return { linkedCount: savedRows.length, articlesNeedingTranslation };
}
