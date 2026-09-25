import { FileText, FileType, ImageIcon, Presentation } from "lucide-react";

// Shared by server and client components (a function exported from a
// "use client" module can't be called during a server render).
export function fileIcon(contentType: string | null) {
  if (contentType === "application/pdf") return FileText;
  if (contentType?.startsWith("image/")) return ImageIcon;
  if (contentType?.includes("presentation") || contentType?.includes("powerpoint")) return Presentation;
  return FileType;
}
