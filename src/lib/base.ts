// Single source of truth for the deployment base path is `base` in
// astro.config.mjs. Astro/Vite exposes it here as import.meta.env.BASE_URL
// (always ends with "/"). Every internal URL in templates/client scripts
// goes through withBase(); the active custom-domain deployment uses "/".
const BASE_URL: string = import.meta.env.BASE_URL;

export const BASE = BASE_URL;

const PASSTHROUGH = /^(?:[a-z]+:|\/\/|#)/i;

export function withBase(path: string): string {
  if (PASSTHROUGH.test(path)) return path;
  const trimmed = path.replace(/^\/+/, "");
  return BASE_URL + trimmed;
}
