/**
 * Deterministic date/time formatting that produces identical output on the
 * server and the client. Avoids hydration mismatches caused by
 * `toLocaleString` (server timezone differs from the user's browser).
 */
export function formatDateTime(iso?: string, lang: string = "fr"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getUTCDate());
  const mm = pad(d.getUTCMonth() + 1);
  const yy = String(d.getUTCFullYear()).slice(-2);
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  return lang === "fr" ? `${dd}/${mm}/${yy} ${hh}:${mi}` : `${mm}/${dd}/${yy} ${hh}:${mi}`;
}
