import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/rss/fetch-feeds";
import { saveArticlesForUser } from "@/lib/rss/save-articles";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { articles, failedSources } = await fetchAllFeeds();
  const { linkedCount } = await saveArticlesForUser(userId, articles);

  return NextResponse.json({
    fetchedCount: articles.length,
    linkedCount,
    failedSources,
  });
}
