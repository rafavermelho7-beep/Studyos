import { getCurrentUser } from "@/lib/auth/session";
import { getImageForUser, userOwnsImage } from "@/server/services/images";

// Serves subject covers / backgrounds to their owner only (session cookie,
// same userId filter as every service). 404 — not 403 — for someone else's
// image, so ids can't be probed for existence.
//
// Caching: `no-cache` + ETag rather than `immutable`, so the ownership
// check runs on EVERY view (a cached copy must never be shown to a
// different account on a shared browser), while a repeat view still costs
// only a 304 — the bytes for an id never change (replacing a photo makes a
// new row), so the id itself is the ETag.
export async function GET(request: Request, { params }: RouteContext<"/api/images/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  const etag = `"${id}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache" };

  if (request.headers.get("if-none-match") === etag) {
    return (await userOwnsImage(user.id, id))
      ? new Response(null, { status: 304, headers })
      : new Response(null, { status: 404 });
  }

  const image = await getImageForUser(user.id, id);
  if (!image) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: { ...headers, "Content-Type": image.contentType },
  });
}
