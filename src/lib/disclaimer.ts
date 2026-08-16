export const LEGAL_DISCLAIMER =
  "DRAFT — not legal advice. Attorney/title review required.";

export function withDisclaimer(body: string): string {
  return `${body.trim()}\n\n---\n${LEGAL_DISCLAIMER}`;
}
