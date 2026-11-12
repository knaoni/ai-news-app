export const DEFAULT_CATEGORIES = [
  { name: "연구 & 논문", color: "#3b82f6" },
  { name: "제품 출시", color: "#8b5cf6" },
  { name: "산업 & 비즈니스", color: "#f59e0b" },
  { name: "정책 & 규제", color: "#ef4444" },
] as const;

// 사용자가 '+ 추가'로 새 카테고리를 만들 때 고를 수 있는 색상 팔레트.
// 기본 카테고리 4개의 색상과도 구별되도록 추가 색상을 포함한다.
export const CATEGORY_COLOR_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#06b6d4",
  "#ec4899",
  "#71717a",
] as const;
