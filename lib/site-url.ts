export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  // Keep production metadata and canonical links on the public brand domain,
  // even while the Vercel project keeps its internal deployment slug.
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "https://fplprism.com";
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
