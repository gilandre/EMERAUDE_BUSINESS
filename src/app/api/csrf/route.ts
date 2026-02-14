import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";
import { cookies } from "next/headers";

export async function GET() {
  const token = generateCsrfToken();
  const cookieStore = await cookies();
  cookieStore.set("csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return NextResponse.json({ csrfToken: token });
}
