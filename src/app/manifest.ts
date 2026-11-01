import type { MetadataRoute } from "next";

// PWA: permite "Adicionar à tela de início" no iPhone/Android com aparência de app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LIFE ENGINE",
    short_name: "LIFE ENGINE",
    description: "Sistema de inteligência pessoal privado.",
    start_url: "/",
    display: "standalone",
    background_color: "#06070b",
    theme_color: "#06070b",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
