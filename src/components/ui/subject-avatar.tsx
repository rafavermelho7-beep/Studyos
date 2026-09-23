import Image from "next/image";
import { imageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

/** A subject's cover thumbnail, or its color dot when it has no cover. */
export function SubjectAvatar({
  subject,
  className,
}: {
  subject: { name: string; color: string; coverImageId: string | null };
  className?: string;
}) {
  if (!subject.coverImageId) {
    return <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: subject.color }} />;
  }
  return (
    <span
      className={cn("relative h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2", className)}
      style={{ borderColor: subject.color }}
    >
      <Image src={imageUrl(subject.coverImageId)} alt="" fill unoptimized sizes="40px" className="object-cover" />
    </span>
  );
}
