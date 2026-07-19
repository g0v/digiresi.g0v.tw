// Handbook section enum display names + canonical order (shared contract).
export const SECTION_NAMES = {
  prepare: "準備",
  respond: "應變",
  mesh: "通訊網",
  scenarios: "情境",
  selfhost: "自架服務",
} as const;

export const SECTION_ORDER = ["prepare", "respond", "mesh", "scenarios", "selfhost"] as const;

export type SectionSlug = (typeof SECTION_ORDER)[number];
