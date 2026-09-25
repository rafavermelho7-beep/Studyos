import { getCurrentUser } from "@/lib/auth/session";
import { getLessonAttachment } from "@/server/services/lessons";
import { getFileStorage } from "@/server/storage";

// Opens a lesson file: session + ownership check here, then a redirect to a
// 2-minute signed Storage URL. Links in the UI point at this route, never
// at Storage directly, so a copied link is useless to anyone else and
// expires anyway. 404 (not 403) for someone else's id.
export async function GET(request: Request, { params }: RouteContext<"/api/lesson-files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  const file = await getLessonAttachment(user.id, id);
  if (!file?.storagePath) return new Response(null, { status: 404 });

  // Browsers can show PDFs and images; Office files download with their name.
  const inline = /^(application\/pdf|image\/)/.test(file.contentType ?? "");
  const url = await getFileStorage(new URL(request.url).origin).createDownloadUrl(
    file.storagePath,
    inline ? undefined : file.name,
  );
  return Response.redirect(url, 302);
}
