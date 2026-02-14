import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Webhooks API" });
}

export async function POST() {
  return NextResponse.json({ message: "Webhooks API - POST" });
}
