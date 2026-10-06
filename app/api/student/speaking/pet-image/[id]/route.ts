// Same-origin fallback for PET speaking photographs. Only approved photo IDs are
// allowed; never fetch an arbitrary URL supplied by the client.
const photos: Record<string, number> = {
  "pet-speak-classroom": 5212354,
  "pet-speak-cooking": 5907626,
  "pet-speak-shopping": 8214423,
  "pet-speak-football": 8941644,
  "pet-speak-park": 9543735,
  "pet-speak-cafe": 4920898,
  "pet-speak-travel": 8919589,
  "pet-speak-party": 7100318,
  "pet-speak-library": 9572700,
  "pet-speak-beach": 8925997,
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const photoId = Object.prototype.hasOwnProperty.call(photos, id) ? photos[id] : undefined;
  if (!photoId) return Response.json({ error: "Photograph not found" }, { status: 404 });

  const url = `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
  try {
    const upstream = await fetch(url, { headers: { Accept: "image/jpeg,image/*;q=0.9" }, redirect: "follow" });
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return Response.json({ error: "Photograph provider unavailable" }, { status: 502 });
    }
    const bytes = await upstream.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 8 * 1024 * 1024) {
      return Response.json({ error: "Photograph size invalid" }, { status: 502 });
    }
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Photograph temporarily unavailable" }, { status: 502 });
  }
}
