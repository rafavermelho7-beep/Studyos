import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// Maskable icons get cropped to arbitrary shapes (circle, squircle, ...) by
// the OS, so content must stay inside the center ~80% "safe zone" — full
// bleed background, no rounded corners (the mask provides the shape).
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#5b5bd6",
          color: "#ffffff",
          fontSize: 230,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        S
      </div>
    ),
    { width: 512, height: 512 },
  );
}
