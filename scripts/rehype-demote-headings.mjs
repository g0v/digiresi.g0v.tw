import { visit } from "unist-util-visit";

/**
 * Handbook pages render their title as the page's only <h1>; HackMD notes
 * often use "#" headings in the body too. When a rendered Markdown document
 * contains any <h1>, shift every heading one level down (h1→h2 … h5→h6, h6
 * stays) so the page keeps exactly one H1 and the body keeps its hierarchy.
 * Runs at render time — the synced files in src/content/handbook/ are not
 * touched. Documents without an <h1> are left as they are.
 */
export default function rehypeDemoteHeadings() {
  return (tree) => {
    let hasH1 = false;
    visit(tree, "element", (node) => {
      if (node.tagName === "h1") hasH1 = true;
    });
    if (!hasH1) return;
    visit(tree, "element", (node) => {
      const m = /^h([1-5])$/.exec(node.tagName);
      if (m) node.tagName = `h${Number(m[1]) + 1}`;
    });
  };
}
