import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articleClassifications, articles, notionSaves } from "@/lib/db/schema";
import { saveArticleToNotion } from "@/lib/notion/client";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const articleId = typeof body?.articleId === "string" ? body.articleId : "";
  if (!articleId) {
    return NextResponse.json({ error: "articleId가 필요합니다." }, { status: 400 });
  }

  // 요청한 사용자의 피드에 실제로 속한 기사인지 확인 (임의 articleId 저장 방지)
  const classification = await db.query.articleClassifications.findFirst({
    where: and(
      eq(articleClassifications.userId, userId),
      eq(articleClassifications.articleId, articleId),
    ),
    with: { category: true },
  });

  if (!classification) {
    return NextResponse.json({ error: "해당 기사를 찾을 수 없습니다." }, { status: 404 });
  }

  const existingSave = await db.query.notionSaves.findFirst({
    where: and(eq(notionSaves.userId, userId), eq(notionSaves.articleId, articleId)),
  });

  if (existingSave) {
    return NextResponse.json({
      pageId: existingSave.notionPageId,
      pageUrl: existingSave.notionPageUrl,
    });
  }

  const article = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });

  if (!article) {
    return NextResponse.json({ error: "해당 기사를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const { pageId, pageUrl } = await saveArticleToNotion({
      title: article.titleKo ?? article.titleOriginal,
      summary: article.summaryKo,
      url: article.url,
      source: article.source,
      categoryName: classification.category?.name ?? null,
      publishedAt: article.publishedAt,
    });

    const [saved] = await db
      .insert(notionSaves)
      .values({
        userId,
        articleId,
        notionPageId: pageId,
        notionPageUrl: pageUrl,
      })
      .onConflictDoNothing({
        target: [notionSaves.userId, notionSaves.articleId],
      })
      .returning({
        notionPageId: notionSaves.notionPageId,
        notionPageUrl: notionSaves.notionPageUrl,
      });

    return NextResponse.json({
      pageId: saved?.notionPageId ?? pageId,
      pageUrl: saved?.notionPageUrl ?? pageUrl,
    });
  } catch (error) {
    console.error("[notion] 뉴스 저장 실패", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Notion 저장 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
