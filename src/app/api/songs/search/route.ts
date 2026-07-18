import { NextResponse } from "next/server";
import { searchSongs } from "@/lib/albumProvider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = await searchSongs(q);
  return NextResponse.json({ results });
}
