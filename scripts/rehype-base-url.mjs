import { visit } from "unist-util-visit";

const ATTRS = ["href", "src", "poster"];

function prefix(base, value) {
  if (typeof value !== "string") return value;
  if (!value.startsWith("/") || value.startsWith("//")) return value;
  return base.replace(/\/$/, "") + value;
}

function prefixSrcset(base, value) {
  if (typeof value !== "string") return value;
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      const spaceIdx = trimmed.indexOf(" ");
      const url = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx);
      return prefix(base, url) + rest;
    })
    .join(", ");
}

export default function rehypeBaseUrl({ base } = {}) {
  if (!base || !base.endsWith("/")) {
    throw new Error("rehype-base-url: `base` must be a string ending with '/'");
  }
  if (base === "/") return () => {}; // no-op at apex
  return (tree) => {
    visit(tree, "element", (node) => {
      const props = node.properties;
      if (!props) return;
      for (const attr of ATTRS) {
        if (attr in props) props[attr] = prefix(base, props[attr]);
      }
      if ("srcSet" in props) props.srcSet = prefixSrcset(base, props.srcSet);
    });
  };
}
