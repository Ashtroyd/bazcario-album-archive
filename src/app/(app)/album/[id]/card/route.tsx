import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

/** A shareable rating card (PNG) for the signed-in user's rating of an album. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!album) return new Response("Not found", { status: 404 });

  let overall: number | null = null;
  let favName: string | null = null;
  if (user) {
    const { data: r } = await supabase
      .from("ratings")
      .select("overall_rating, favorite_track_id")
      .eq("album_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    overall = r?.overall_rating != null ? Number(r.overall_rating) : null;
    if (r?.favorite_track_id) {
      const { data: t } = await supabase
        .from("tracks")
        .select("name")
        .eq("id", r.favorite_track_id)
        .maybeSingle();
      favName = t?.name ?? null;
    }
  }

  const colors = (album.cover_colors ?? null) as {
    bg?: string;
    accent?: string;
  } | null;
  const bg = colors?.bg ?? "#312e81";
  const accent = colors?.accent ?? "#a78bfa";
  const scoreText =
    overall != null ? String(Math.round(overall * 100) / 100) : "—";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          padding: "72px",
          background: `linear-gradient(135deg, ${bg} 0%, #09090b 78%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "56px", width: "100%" }}>
          {album.cover_image_url ? (
            <img
              src={album.cover_image_url}
              alt=""
              width={380}
              height={380}
              style={{
                borderRadius: "24px",
                objectFit: "cover",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                fontSize: 22,
                letterSpacing: 3,
                color: accent,
                textTransform: "uppercase",
              }}
            >
              Bazcario&apos;s Album Archive
            </div>
            <div
              style={{
                fontSize: 62,
                fontWeight: 700,
                marginTop: 12,
                lineHeight: 1.05,
              }}
            >
              {album.title}
            </div>
            <div style={{ fontSize: 34, color: "#d4d4d8", marginTop: 8 }}>
              {album.artist}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 16,
                marginTop: 40,
              }}
            >
              <div
                style={{
                  fontSize: 120,
                  fontWeight: 800,
                  color: accent,
                  lineHeight: 1,
                }}
              >
                {scoreText}
              </div>
              <div style={{ fontSize: 40, color: "#a1a1aa", paddingBottom: 16 }}>
                / 10
              </div>
            </div>
            <div
              style={{
                fontSize: 22,
                color: "#a1a1aa",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {overall != null ? "My rating" : "Not rated yet"}
            </div>
            {favName ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  color: "#e4e4e7",
                  marginTop: 24,
                }}
              >
                ♥ Favourite: {favName}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
