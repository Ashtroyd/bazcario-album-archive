import { NextResponse } from "next/server";
import { getAlbumDetails } from "@/lib/albumProvider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ album: null }, { status: 400 });
  }
  const album = await getAlbumDetails(id);
  return NextResponse.json({ album });
}
