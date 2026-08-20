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
export function compactMemoryText(text: string): string {
  const withoutProvenanceBlock = text.split("[Thred provenance:")[0] ?? text;
  let compact = withoutProvenanceBlock;
  for (const label of provenanceLabels) {
    compact = compact.replace(labelPattern(label), " ");
  }
  return compact.replace(/\s+/g, " ").trim();
}
