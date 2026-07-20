// Build scripts (link checker, budget checker) can't import
// `import.meta.env.BASE_URL` — that only exists inside Vite/Astro. Instead,
// they read the base from an env var, defaulting to the value hardcoded in
// astro.config.mjs. Keep this fallback in sync with astro.config.mjs's BASE.
const DEFAULT_BASE = "/";

export function getBase() {
  const env = process.env.SITE_BASE;
  if (!env) return DEFAULT_BASE;
  return env.endsWith("/") ? env : env + "/";
}
