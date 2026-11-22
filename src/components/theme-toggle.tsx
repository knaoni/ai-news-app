"use client";

import { DARK_CLASS, THEME_STORAGE_KEY } from "@/lib/theme/constants";

type ThemeToggleProps = {
  className?: string;
};

// 현재 테마 상태는 <html>의 dark 클래스가 단일 기준이므로 React state를 두지 않는다.
// 아이콘도 dark: variant로 전환해 서버/클라이언트 렌더 결과가 항상 같다(하이드레이션 불일치 없음).
export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const handleToggle = () => {
    const isDark = document.documentElement.classList.toggle(DARK_CLASS);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    } catch {
      // 저장소 접근이 막힌 환경(시크릿 모드 등)에서는 현재 세션에만 적용한다.
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="다크 모드/라이트 모드 전환"
      title="다크 모드/라이트 모드 전환"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 ${className}`}
    >
      {/* 라이트 모드에서 보이는 달 아이콘(클릭 시 다크 모드로) */}
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4 dark:hidden">
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* 다크 모드에서 보이는 해 아이콘(클릭 시 라이트 모드로) */}
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="hidden h-4 w-4 dark:block">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
