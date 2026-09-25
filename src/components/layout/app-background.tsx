import Image from "next/image";
import { imageUrl } from "@/lib/images";
import type { BackgroundStyle } from "@/lib/preferences";

// Fixed layer behind the whole app shell (negative z-index paints above the
// page background, below all content). Cards, sidebar and header keep their
// own opaque surfaces, so text never sits directly on the photo; the veil
// on top of it is the page color at high opacity, which also makes a busy
// photo read as a soft texture in both themes.
export function AppBackground({ style, imageId }: { style: BackgroundStyle; imageId: string | null }) {
  if (style === "gradient") {
    return (
      <div
        aria-hidden
        data-testid="app-background"
        data-style="gradient"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 55%)," +
            "radial-gradient(ellipse at 100% 100%, color-mix(in srgb, var(--accent-2) 12%, transparent), transparent 55%)",
        }}
      />
    );
  }

  if (style === "photo" && imageId) {
    return (
      <div aria-hidden data-testid="app-background" data-style="photo" className="pointer-events-none fixed inset-0 -z-10">
        <Image src={imageUrl(imageId)} alt="" fill unoptimized sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
      </div>
    );
  }

  return null;
}
