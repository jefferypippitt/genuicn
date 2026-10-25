import { SITE_URL } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { allow: "/", disallow: "/api/", userAgent: "*" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
