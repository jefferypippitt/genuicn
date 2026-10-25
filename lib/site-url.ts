/**
The site's address for absolute URLs (the share image, the sitemap): Vercel sets the production domain at build time, and local builds use localhost.
*/
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";
