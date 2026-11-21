"use client";

import { useState } from "react";
import type { DashboardArticle } from "./dashboard-view";

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

type NewsCardProps = {
  article: DashboardArticle;
  onDeleted: (articleId: string) => void;
};

export function NewsCard({ article, onDeleted }: NewsCardProps) {
  const [notionPageUrl, setNotionPageUrl] = useState(article.notionPageUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const displayDate = article.publishedAt ?? article.createdAt;
  const isPending = article.translationStatus === "pending";
  const isFailed = article.translationStatus === "failed";
  const isSaved = notionPageUrl !== null;

  const handleSaveToNotion = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/news/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.articleId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "뉴스 저장에 실패했습니다.");
      }
      setNotionPageUrl(data.pageUrl ?? null);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    if (!window.confirm("이 뉴스를 삭제하시겠습니까?")) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/news/${article.articleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "뉴스 삭제에 실패했습니다.");
      }
      onDeleted(article.articleId);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <article className="relative flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="뉴스 삭제"
        className="absolute right-2 top-2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>

      <div className="flex items-center justify-between pr-6 text-xs text-zinc-400 dark:text-zinc-500">
        <span>{article.source}</span>
        <span>{formatDate(displayDate)}</span>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2">
          <div className="h-5 w-5/6 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <h2 className="line-clamp-2 break-words text-base font-medium leading-snug text-zinc-900 dark:text-zinc-100">
            {article.titleKo ?? article.titleOriginal}
          </h2>
          {article.summaryKo ? (
            <p className="line-clamp-3 break-words text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {article.summaryKo}
            </p>
          ) : null}
        </div>
      )}

      {isFailed ? (
        <p className="text-xs text-red-500">번역/요약에 실패한 기사입니다.</p>
      ) : null}

      {saveError ? <p className="text-xs text-red-500">{saveError}</p> : null}
      {deleteError ? <p className="text-xs text-red-500">{deleteError}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {article.categoryName ?? "미분류"}
        </span>

        <div className="flex items-center gap-3">
          {isSaved ? (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 0 1 0 1.415l-7.5 7.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.793 2.793 6.793-6.793a1 1 0 0 1 1.414 0Z"
                  clipRule="evenodd"
                />
              </svg>
              저장됨
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSaveToNotion}
              disabled={isSaving || isPending}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isSaving ? "저장 중..." : "뉴스 저장"}
            </button>
          )}

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            원문 보기
          </a>
        </div>
      </div>
    </article>
  );
}
