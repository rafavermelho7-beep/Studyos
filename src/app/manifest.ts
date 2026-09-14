import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudyOS",
    short_name: "StudyOS",
    description: "Personal Study Operating System — decida o que estudar agora.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbfa",
    theme_color: "#5b5bd6",
    icons: [
      { src: "/icons/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
