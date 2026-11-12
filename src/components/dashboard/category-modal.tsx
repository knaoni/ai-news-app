"use client";

import { useState } from "react";
import { CATEGORY_COLOR_PALETTE } from "@/lib/categories/default-categories";

type CategoryModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

export function CategoryModal({ onClose, onCreated }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLOR_PALETTE[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("카테고리 이름을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "카테고리를 추가하지 못했습니다.");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2
          id="category-modal-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          카테고리 추가
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="category-name"
              className="text-sm text-zinc-600 dark:text-zinc-300"
            >
              이름
            </label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoFocus
              placeholder="예: 연구 & 논문"
              className="rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:border-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">색상</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`색상 ${swatch} 선택`}
                  aria-pressed={color === swatch}
                  onClick={() => setColor(swatch)}
                  style={{ backgroundColor: swatch }}
                  className={
                    color === swatch
                      ? "h-7 w-7 shrink-0 rounded-full ring-2 ring-offset-2 ring-zinc-900 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-900"
                      : "h-7 w-7 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
                  }
                />
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-[#ccc]"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
