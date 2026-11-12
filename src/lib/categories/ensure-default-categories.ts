import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { DEFAULT_CATEGORIES } from "./default-categories";

// 사용자가 카테고리를 하나도 갖고 있지 않을 때만 기본 카테고리 4개를 시딩한다.
// 이미 카테고리가 있으면(기본이든 사용자가 직접 추가한 것이든) 아무 것도 하지 않는다.
export async function ensureDefaultCategories(userId: string) {
  const existing = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
    columns: { id: true },
  });

  if (existing.length > 0) return;

  await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((category, index) => ({
        userId,
        name: category.name,
        color: category.color,
        isDefault: true,
        position: index,
      })),
    )
    .onConflictDoNothing({
      target: [categories.userId, categories.name],
    });
}
