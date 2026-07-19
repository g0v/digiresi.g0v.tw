import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const handbook = defineCollection({
  loader: glob({ base: "./src/content/handbook", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    section: z.enum(["prepare", "respond", "mesh", "scenarios", "selfhost"]),
    order: z.number(),
    sourceUrl: z.string().url(),
    sourceCommit: z.string().optional(),
    syncedAt: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { handbook };
