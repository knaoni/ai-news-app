"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

export function AutoSignInModal() {
  const { openSignIn } = useClerk();

  useEffect(() => {
    openSignIn();
  }, [openSignIn]);

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
      <ThemeToggle className="absolute right-4 top-4" />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">로그인이 필요합니다.</p>
      <button
        type="button"
        onClick={() => openSignIn()}
        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        로그인
      </button>
    </div>
  );
}
