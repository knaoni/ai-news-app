"use client";

import { useMemo, useState } from "react";
import { NewsCard } from "./news-card";

export type DashboardCategory = {
  id: string;
  name: string;
};

export type DashboardArticle = {
  classificationId: string;
  articleId: string;
  titleKo: string | null;
  titleOriginal: string;
  summaryKo: string | null;
  source: string;
  url: string;
  publishedAt: Date | null;
  createdAt: Date;
  translationStatus: "pending" | "completed" | "failed";
  categoryId: string | null;
  categoryName: string | null;
};

type DashboardViewProps = {
  categories: DashboardCategory[];
  articles: DashboardArticle[];
};

const ALL_FILTER = "all";

export function DashboardView({ categories, articles }: DashboardViewProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_FILTER);

  const filteredArticles = useMemo(() => {
    if (selectedCategoryId === ALL_FILTER) {
      return articles;
    }
    return articles.filter((article) => article.categoryId === selectedCategoryId);
  }, [articles, selectedCategoryId]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            AI 뉴스 수집기
          </h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSelectedCategoryId(ALL_FILTER)}
            className={
              selectedCategoryId === ALL_FILTER
                ? "shrink-0 rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                : "shrink-0 rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }
          >
            전체
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategoryId(category.id)}
              className={
                selectedCategoryId === category.id
                  ? "shrink-0 rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                  : "shrink-0 rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }
            >
              {category.name}
            </button>
          ))}

          <button
            type="button"
            aria-label="카테고리 추가"
            className="shrink-0 rounded-full border border-dashed border-zinc-300 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
          >
            + 추가
          </button>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {articles.length === 0
                ? "아직 가져온 뉴스가 없습니다."
                : "이 카테고리에 해당하는 뉴스가 없습니다."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <NewsCard key={article.classificationId} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
