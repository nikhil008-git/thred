export type EmbeddedProvenance = {
  kind?: string;
  session?: string;
  confidence?: number;
  messages: string[];
  evidence: string[];
  files: string[];
  relations: Array<{ predicate: string; target: string }>;
};

const provenanceLabels = [
  "Kind",
  "Confidence",
  "Source messages",
  "Evidence events",
  "Files",
];

/**
 * Matches `Label: value.` up to a sentence-ending period, so decimals such as
 * `Confidence: 0.9.` are consumed whole instead of splitting at the decimal.
 */
function labelPattern(label: string): RegExp {
  return new RegExp(`\\s*${label}:\\s*.*?\\.(?=\\s|$)`, "gi");
}

/**
 * Recall text carries provenance so a memory stays inspectable, but that
 * metadata is noise in an answer prompt: it distracts the model and inflates
 * read tokens. Provenance stays available on the RankedMemory itself.
 */
function provenanceField(block: string, field: string): string | undefined {
  const match = new RegExp(`${field}=([^;\\]]+)`, "i").exec(block);
  return match?.[1]?.trim();
}

function splitProvenanceList(value?: string): string[] {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

/** Parses the embedded `[Thred provenance: ...]` block written at ingest time. */
export function parseProvenanceBlock(text: string): EmbeddedProvenance | null {
  const match = /\[Thred provenance:\s*([^\]]+)\]/i.exec(text);
  if (!match?.[1]) return null;

  const block = match[1];
  const confidence = Number(provenanceField(block, "confidence"));

  // "relations=ABOUT:db|SUPPORTS:message:m1" -> [{ predicate, target }, ...]
  const relations: { predicate: string; target: string }[] = [];
  const relationsRaw = provenanceField(block, "relations") ?? "";
  for (const pair of relationsRaw.split("|")) {
    const colon = pair.indexOf(":");
    if (colon === -1) continue;
    relations.push({ predicate: pair.slice(0, colon), target: pair.slice(colon + 1) });
  }

  const provenance: EmbeddedProvenance = {
    kind: provenanceField(block, "kind"),
    session: provenanceField(block, "session"),
    messages: splitProvenanceList(provenanceField(block, "messages")),
    evidence: splitProvenanceList(provenanceField(block, "evidence")),
    files: splitProvenanceList(provenanceField(block, "files")),
    relations,
  };
  if (Number.isFinite(confidence)) provenance.confidence = confidence;
  return provenance;
}

export function compactMemoryText(text: string): string {
  const withoutProvenanceBlock = text.split("[Thred provenance:")[0] ?? text;
  let compact = withoutProvenanceBlock;
  for (const label of provenanceLabels) {
    compact = compact.replace(labelPattern(label), " ");
  }
  return compact.replace(/\s+/g, " ").trim();
}
