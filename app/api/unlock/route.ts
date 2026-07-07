import { NextRequest, NextResponse } from "next/server";
import { ACCESS_KEY_COOKIE } from "@/lib/access-key";

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
