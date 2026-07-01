import { NextResponse } from "next/server";
import { searchAlbums } from "@/lib/albumProvider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = await searchAlbums(q);
  return NextResponse.json({ results });
}
