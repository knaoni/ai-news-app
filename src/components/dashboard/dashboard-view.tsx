"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CategoryModal } from "./category-modal";
import { NewsCard, NewsCardSkeleton } from "./news-card";

export type DashboardCategory = {
  id: string;
  name: string;
  color: string;
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
  categoryColor: string | null;
  notionPageUrl: string | null;
};

type DashboardViewProps = {
  categories: DashboardCategory[];
  articles: DashboardArticle[];
};

const ALL_FILTER = "all";
const PAGE_SIZE = 9;
const PAGE_RANGE_DELTA = 2;

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

// 현재 페이지 기준 앞뒤로 PAGE_RANGE_DELTA개 + 첫/마지막 페이지만 남기고,
// 번호가 이어지지 않는 구간은 "..."(ellipsis)로 축약한다.
function getPaginationItems(current: number, total: number): PaginationItem[] {
  const left = Math.max(current - PAGE_RANGE_DELTA, 1);
  const right = Math.min(current + PAGE_RANGE_DELTA, total);
  const items: PaginationItem[] = [];

  if (left > 1) {
    items.push(1);
    if (left > 2) items.push("ellipsis-start");
  }

  for (let i = left; i <= right; i++) {
    items.push(i);
  }

  if (right < total) {
    if (right < total - 1) items.push("ellipsis-end");
    items.push(total);
  }

  return items;
}

export function DashboardView({ categories, articles }: DashboardViewProps) {
  const router = useRouter();
  // 서버에서 새 articles props가 내려오면(router.refresh 등) 로컬 상태를 그에 맞춰
  // 리셋한다. effect 대신 렌더 중 비교로 처리(React 권장 패턴).
  const [prevArticles, setPrevArticles] = useState(articles);
  const [localArticles, setLocalArticles] = useState(articles);
  if (articles !== prevArticles) {
    setPrevArticles(articles);
    setLocalArticles(articles);
  }

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_FILTER);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleDeleteArticle = (articleId: string) => {
    setLocalArticles((prev) => prev.filter((article) => article.articleId !== articleId));
  };

  const filteredArticles = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return localArticles.filter((article) => {
      const matchesCategory =
        selectedCategoryId === ALL_FILTER || article.categoryId === selectedCategoryId;
      if (!matchesCategory) return false;
      if (!keyword) return true;
      return (
        article.titleKo?.toLowerCase().includes(keyword) ||
        article.titleOriginal.toLowerCase().includes(keyword) ||
        article.summaryKo?.toLowerCase().includes(keyword) ||
        false
      );
    });
  }, [localArticles, selectedCategoryId, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  // 삭제로 필터 결과가 줄어 현재 페이지가 범위를 벗어날 수 있으므로 렌더 시점에 보정한다.
  const currentPage = Math.min(page, totalPages);

  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredArticles.slice(start, start + PAGE_SIZE);
  }, [filteredArticles, currentPage]);

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const handleFetchNews = async () => {
    setIsFetchingNews(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/news/fetch", { method: "POST" });
      if (!res.ok) {
        throw new Error("뉴스를 가져오는 중 오류가 발생했습니다.");
      }
      setPage(1);
      router.refresh();
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsFetchingNews(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              AI 뉴스 수집기
            </h1>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              총 {localArticles.length}개의 뉴스
            </span>
          </div>
          <button
            type="button"
            onClick={handleFetchNews}
            disabled={isFetchingNews}
            className="flex shrink-0 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-[#ccc]"
          >
            {isFetchingNews ? (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
                />
              </svg>
            ) : null}
            뉴스 가져오기
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
        {fetchError ? <p className="mb-4 text-sm text-red-500">{fetchError}</p> : null}

        <div className="mb-6 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => handleSelectCategory(ALL_FILTER)}
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
                onClick={() => handleSelectCategory(category.id)}
                className={
                  selectedCategoryId === category.id
                    ? "flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                    : "flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </button>
            ))}

            <button
              type="button"
              aria-label="카테고리 추가"
              onClick={() => setIsCategoryModalOpen(true)}
              className="shrink-0 rounded-full border border-dashed border-zinc-300 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
            >
              + 추가
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex shrink-0 gap-1.5">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="키워드 검색"
                aria-label="뉴스 키워드 검색"
                className="w-28 rounded-full border border-zinc-200 bg-white px-3 py-1.5 pr-7 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 sm:w-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="검색어 지우기"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              ) : null}
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              검색
            </button>
          </form>
        </div>

        {isCategoryModalOpen ? (
          <CategoryModal
            onClose={() => setIsCategoryModalOpen(false)}
            onCreated={() => {
              setIsCategoryModalOpen(false);
              router.refresh();
            }}
          />
        ) : null}

        {isFetchingNews ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-10 w-10 text-zinc-300 dark:text-zinc-700"
            >
              <path
                d="M4 6a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M14 4v5a1 1 0 0 0 1 1h5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M8 13h8M8 17h5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {localArticles.length === 0
                ? "아직 가져온 뉴스가 없습니다."
                : searchQuery
                  ? `'${searchQuery}'에 대한 검색 결과가 없습니다.`
                  : "이 카테고리에 해당하는 뉴스가 없습니다."}
            </p>
            {localArticles.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  handleSelectCategory(ALL_FILTER);
                  handleClearSearch();
                }}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                전체 보기
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFetchNews}
                disabled={isFetchingNews}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-[#ccc]"
              >
                뉴스 가져오기
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedArticles.map((article) => (
                <NewsCard
                  key={article.classificationId}
                  article={article}
                  onDeleted={handleDeleteArticle}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <nav aria-label="페이지 이동" className="mt-8 flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={currentPage === 1}
                  aria-label="첫 페이지"
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  처음
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="이전 페이지"
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  이전
                </button>

                {paginationItems.map((item) =>
                  typeof item === "number" ? (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-current={item === currentPage ? "page" : undefined}
                      className={
                        item === currentPage
                          ? "h-8 w-8 shrink-0 rounded-full bg-foreground text-sm font-medium text-background"
                          : "h-8 w-8 shrink-0 rounded-full text-sm text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }
                    >
                      {item}
                    </button>
                  ) : (
                    <span
                      key={item}
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500"
                    >
                      …
                    </span>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="다음 페이지"
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  다음
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="마지막 페이지"
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  끝
                </button>
              </nav>
            ) : null}
          </>
        )}
      </main>

      <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
        Copyright 2026 AI 뉴스 수집기. Powered by Claude.
      </footer>
    </div>
  );
}
