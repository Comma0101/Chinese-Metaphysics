import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(_request: Request) {
  return NextResponse.json({ status: "retired" }, { status: 410 });
}
