import type { MetadataRoute } from "next";

// Sistema privado: nada deve ser indexado.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
