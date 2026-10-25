import { PAGE_ORDER } from "@/components/sidebar-app/nav-data";
import { SITE_URL } from "@/lib/site-url";
import type { MetadataRoute } from "next";

/**
Every page with a link in the sidebar. Cards without a page yet have no href, so PAGE_ORDER leaves them out.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGE_ORDER.map(({ href }) => ({ url: `${SITE_URL}${href}` }));
}
