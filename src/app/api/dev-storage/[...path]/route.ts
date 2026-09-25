import { isLocalStorageEnabled } from "@/server/storage";
import { readLocalObject, verifyLocalToken, writeLocalObject } from "@/server/storage/local";
import { MAX_LESSON_FILE_BYTES } from "@/server/storage/types";

// Serves the local stand-in for Supabase Storage (dev/e2e only; 404 in
// production). Mirrors Supabase's signed-URL semantics: the token in the
// query string is the only credential, and it's bound to one path, one
// operation and an expiry.

type Context = RouteContext<"/api/dev-storage/[...path]">;

async function objectPath(ctx: Context) {
  return (await ctx.params).path.map(decodeURIComponent).join("/");
}

function authorized(request: Request, op: "put" | "get", path: string) {
  const params = new URL(request.url).searchParams;
  return verifyLocalToken(op, path, Number(params.get("expires")), params.get("token") ?? "");
}

export async function PUT(request: Request, ctx: Context) {
  if (!isLocalStorageEnabled()) return new Response(null, { status: 404 });
  const path = await objectPath(ctx);
  if (!authorized(request, "put", path)) return new Response(null, { status: 403 });

  const form = await request.formData();
  const file = form.get("");
  if (!(file instanceof Blob)) return new Response("missing file", { status: 400 });
  if (file.size > MAX_LESSON_FILE_BYTES) return new Response("too large", { status: 413 });

  await writeLocalObject(path, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");
  return Response.json({ Key: path });
}

export async function GET(request: Request, ctx: Context) {
  if (!isLocalStorageEnabled()) return new Response(null, { status: 404 });
  const path = await objectPath(ctx);
  if (!authorized(request, "get", path)) return new Response(null, { status: 403 });

  try {
    const { bytes, contentType } = await readLocalObject(path);
    const download = new URL(request.url).searchParams.get("download");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        // Same-origin in dev, unlike real Supabase: anything that isn't a
        // PDF/image must never run as a page (sandbox would also break
        // Chrome's inline PDF viewer, hence the exemption).
        ...(/^(application\/pdf|image\/)/.test(contentType) ? {} : { "Content-Security-Policy": "sandbox" }),
        ...(download ? { "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(download)}` } : {}),
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
