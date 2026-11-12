import { auth } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MAX_NAME_LENGTH = 30;

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const color = typeof body?.color === "string" ? body.color.trim() : "";

  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `카테고리 이름은 1~${MAX_NAME_LENGTH}자여야 합니다.` },
      { status: 400 },
    );
  }

  if (!HEX_COLOR_PATTERN.test(color)) {
    return NextResponse.json(
      { error: "올바른 색상 코드(#rrggbb)를 선택해 주세요." },
      { status: 400 },
    );
  }

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(categories)
    .where(eq(categories.userId, userId));

  try {
    const [created] = await db
      .insert(categories)
      .values({
        userId,
        name,
        color,
        isDefault: false,
        position: existingCount,
      })
      .returning({ id: categories.id, name: categories.name, color: categories.color });

    return NextResponse.json({ category: created }, { status: 201 });
  } catch (error) {
    const isUniqueViolation =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505";

    if (isUniqueViolation) {
      return NextResponse.json(
        { error: "이미 같은 이름의 카테고리가 있습니다." },
        { status: 409 },
      );
    }

    throw error;
  }
}
