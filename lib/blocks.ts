export type Block = { id: string; text: string };

export function splitIntoBlocks(raw: string): Block[] {
  return raw
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0)
    .map((text, i) => ({ id: `b${String(i + 1).padStart(2, "0")}`, text }));
}

export function blocksToPrompt(blocks: Block[]): string {
  return blocks.map((b) => `[${b.id}] ${b.text}`).join("\n\n");
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function resolveBlock(
  blocks: Block[],
  blockId: string,
  quote: string
): { id: string | null; verified: boolean } {
  const q = norm(quote);
  const claimed = blocks.find((b) => b.id === blockId);
  if (!q) return { id: claimed?.id ?? null, verified: false };
  if (claimed && norm(claimed.text).includes(q))
    return { id: claimed.id, verified: true };
  const hit = blocks.find((b) => norm(b.text).includes(q));
  if (hit) return { id: hit.id, verified: true };
  return { id: claimed?.id ?? null, verified: false };
}