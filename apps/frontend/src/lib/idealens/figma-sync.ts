/**
 * Figma REST: fetch file document and collect component / component-set names.
 * Token is never persisted — only used per request server-side.
 */

export function parseFigmaFileKey(input: string): string | null {
  const s = input.trim();
  const community = s.match(
    /figma\.com\/community\/file\/([0-9A-Za-z]+)(?:\/|$|\?)/i,
  );
  if (community) return community[1];
  const fromUrl = s.match(
    /figma\.com\/(?:file|design)\/([0-9A-Za-z]+)(?:\/|$|\?)/i,
  );
  if (fromUrl) return fromUrl[1];
  if (/^[0-9A-Za-z]{10,}$/.test(s)) return s;
  return null;
}

interface FigmaNode {
  type?: string;
  name?: string;
  children?: FigmaNode[];
}

function walkComponents(node: FigmaNode | undefined, out: Set<string>): void {
  if (!node) return;
  const t = node.type;
  if (t === "COMPONENT" || t === "COMPONENT_SET") {
    const n = node.name?.trim();
    if (n) out.add(n);
  }
  if (Array.isArray(node.children)) {
    for (const c of node.children) walkComponents(c, out);
  }
}

export async function fetchFigmaFileSummary(
  fileKey: string,
  accessToken: string,
): Promise<{ fileName: string; componentNames: string[] }> {
  const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: { "X-Figma-Token": accessToken },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Figma API ${res.status}: ${text.slice(0, 200) || res.statusText}`,
    );
  }
  const data = (await res.json()) as {
    name?: string;
    document?: FigmaNode;
  };
  const fileName = data.name ?? "Untitled file";
  const names = new Set<string>();
  walkComponents(data.document, names);
  const componentNames = [...names].sort((a, b) => a.localeCompare(b));
  return { fileName, componentNames };
}
