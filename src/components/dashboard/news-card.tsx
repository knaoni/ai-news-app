import type { DashboardArticle } from "./dashboard-view";

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

export function NewsCard({ article }: { article: DashboardArticle }) {
  const displayDate = article.publishedAt ?? article.createdAt;
  const isPending = article.translationStatus === "pending";
  const isFailed = article.translationStatus === "failed";

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
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
          <h2 className="line-clamp-2 text-base font-medium leading-snug text-zinc-900 dark:text-zinc-100">
            {article.titleKo ?? article.titleOriginal}
          </h2>
          {article.summaryKo ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {article.summaryKo}
            </p>
          ) : null}
        </div>
      )}

      {isFailed ? (
        <p className="text-xs text-red-500">번역/요약에 실패한 기사입니다.</p>
      ) : null}

      <div className="flex items-center justify-between pt-1">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {article.categoryName ?? "미분류"}
        </span>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          원문 보기
        </a>
      </div>
    </article>
  );
}
