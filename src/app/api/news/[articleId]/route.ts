import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articleClassifications } from "@/lib/db/schema";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { articleId } = await params;

  try {
    // articles는 전역 캐시이므로 기사 자체가 아니라, 이 사용자의 피드에서만
    // 제외되도록 articleClassifications 행만 삭제한다.
    const [deleted] = await db
      .delete(articleClassifications)
      .where(
        and(
          eq(articleClassifications.userId, userId),
          eq(articleClassifications.articleId, articleId),
        ),
      )
      .returning({ id: articleClassifications.id });

    if (!deleted) {
      return NextResponse.json({ error: "해당 기사를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[news] 뉴스 삭제 실패", error);
    return NextResponse.json(
      { error: "뉴스 삭제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
