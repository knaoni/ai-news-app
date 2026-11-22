import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI 뉴스 수집기</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-12 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-5 w-5/6 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-12 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
