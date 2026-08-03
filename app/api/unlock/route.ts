import { NextRequest, NextResponse } from "next/server";
import { ACCESS_KEY_COOKIE } from "@/lib/access-key";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest) {
  const accessKey = process.env.ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "伺服器未設定 ACCESS_KEY" }, { status: 503 });
  }

  const body = await req.json();
  const { key } = body as { key: string };

  if (key !== accessKey) {
    return NextResponse.json({ error: "存取金鑰不正確" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_KEY_COOKIE, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return res;
}
