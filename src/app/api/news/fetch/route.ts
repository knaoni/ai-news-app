import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  classifyArticlesBatch,
  loadClassificationTargetsForUser,
  loadUserCategories,
  persistClassificationOutcomes,
} from "@/lib/claude/classify-articles";
import {
  persistTranslationOutcomes,
  translateArticlesBatch,
} from "@/lib/claude/translate-articles";
import { fetchAllFeeds } from "@/lib/rss/fetch-feeds";
import { saveArticlesForUser } from "@/lib/rss/save-articles";

export const maxDuration = 60;

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { articles, failedSources } = await fetchAllFeeds();
  const { linkedCount, articlesNeedingTranslation } = await saveArticlesForUser(
    userId,
    articles,
  );

  const translationOutcomes = await translateArticlesBatch(
    articlesNeedingTranslation,
  );
  await persistTranslationOutcomes(translationOutcomes);

  const categories = await loadUserCategories(userId);
  let classificationOutcomes: Awaited<
    ReturnType<typeof classifyArticlesBatch>
  > = [];

  if (categories.length > 0) {
    const classificationTargets = await loadClassificationTargetsForUser(userId);
    classificationOutcomes = await classifyArticlesBatch(
      categories,
      classificationTargets,
    );
    await persistClassificationOutcomes(userId, classificationOutcomes);
  }

  return NextResponse.json({
    fetchedCount: articles.length,
    linkedCount,
    failedSources,
    translation: {
      attempted: translationOutcomes.length,
      succeeded: translationOutcomes.filter((o) => o.status === "completed")
        .length,
      failed: translationOutcomes.filter((o) => o.status === "failed").length,
    },
    classification: {
      attempted: classificationOutcomes.length,
      succeeded: classificationOutcomes.filter((o) => o.status === "classified")
        .length,
      failed: classificationOutcomes.filter((o) => o.status === "failed").length,
      skippedNoCategories: categories.length === 0,
    },
  });
}
