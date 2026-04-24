/**
 * Génération côté client de deux artéfacts de preuve en PDF :
 *  - le "document signé" (récapitulatif lisible reprenant chaque document du
 *    parapheur, ses signataires, et la trace de chaque signature) ;
 *  - le "certificat de preuve" (rapport d'audit avec hash du parapheur,
 *    timeline complète des événements, IPs, méthodes…).
 *
 * On reste 100% client (jsPDF) pour ne pas dépendre d'un backend dans cette
 * démo : c'est bien adapté au stockage actuel (localStorage).
 */
import { jsPDF } from "jspdf";
import type { Binder } from "./mockData";
import { formatDateTime } from "./format";

const KIND_LABEL_FR: Record<string, string> = {
  "binder.created": "Parapheur créé",
  "binder.started": "Parapheur démarré",
  "binder.completed": "Parapheur terminé",
  "binder.stopped": "Parapheur arrêté",
  "binder.archived": "Parapheur archivé",
  "signer.invited": "Invitation envoyée",
  "signer.viewed": "Lien de signature ouvert",
  "signer.signed": "Signature apposée",
  "signer.declined": "Refus de signer",
  "signer.reminded": "Relance envoyée",
  "evidence.downloaded": "Preuve téléchargée",
};

/** Hash déterministe lisible (mock — pas cryptographique). */
function quickHash(str: string): string {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const a = (h2 >>> 0).toString(16).padStart(8, "0");
  const b = (h1 >>> 0).toString(16).padStart(8, "0");
  return `${a}${b}`.toUpperCase();
}

export function binderHash(binder: Binder): string {
  // Sérialisation stable des éléments significatifs.
  const payload = JSON.stringify({
    id: binder.id,
    name: binder.name,
    docs: (binder.documents ?? []).map((d) => ({ id: d.id, name: d.name, size: d.size })),
    signers: (binder.signers ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      signedAt: s.signedAt,
      method: s.signatureMethod,
    })),
  });
  return quickHash(payload);
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Usign", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, 200, 14, { align: "right" });
  doc.setTextColor(20, 20, 20);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 28);
    doc.setTextColor(20, 20, 20);
  }
}

function addFooter(doc: jsPDF, hash: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Hash : ${hash}`, 14, 290);
    doc.text(`Page ${i} / ${pages}`, 200, 290, { align: "right" });
    doc.setTextColor(20, 20, 20);
  }
}

function ensureSpace(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

/** Document signé — résumé lisible avec chaque signature apposée. */
export function generateSignedPdf(binder: Binder, lang: string = "fr"): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const hash = binderHash(binder);
  addHeader(doc, "Document signé", binder.name);

  let y = 38;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Informations générales", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Propriétaire : ${binder.ownerName} <${binder.ownerEmail}>`, 14, y);
  y += 5;
  doc.text(`Créé le : ${formatDateTime(binder.createdAt, lang)}`, 14, y);
  y += 5;
  if (binder.startedAt)
    (doc.text(`Démarré le : ${formatDateTime(binder.startedAt, lang)}`, 14, y), (y += 5));
  if (binder.completedAt)
    (doc.text(`Terminé le : ${formatDateTime(binder.completedAt, lang)}`, 14, y), (y += 5));
  doc.text(`Statut : ${binder.status}`, 14, y);
  y += 5;
  if (binder.description) {
    const lines = doc.splitTextToSize(`Description : ${binder.description}`, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Documents", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const d of binder.documents ?? []) {
    y = ensureSpace(doc, y);
    doc.text(`• ${d.name}${d.pages ? ` (${d.pages} p.)` : ""}`, 14, y);
    y += 5;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Signataires", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const s of binder.signers ?? []) {
    y = ensureSpace(doc, y, 30);
    doc.setFont("helvetica", "bold");
    doc.text(`${s.order}. ${s.name}`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(s.email, 80, y);
    y += 5;
    const status = s.status ?? "pending";
    doc.setTextColor(100, 116, 139);
    doc.text(`Statut : ${status}`, 18, y);
    if (s.signedAt) doc.text(`Signé le ${formatDateTime(s.signedAt, lang)}`, 80, y);
    if (s.signatureMethod) doc.text(`Méthode : ${s.signatureMethod}`, 150, y);
    y += 5;
    if (s.ip) {
      doc.text(`IP : ${s.ip}`, 18, y);
      y += 5;
    }
    if (s.declinedReason) {
      const lines = doc.splitTextToSize(`Motif refus : ${s.declinedReason}`, 170);
      doc.text(lines, 18, y);
      y += lines.length * 5;
    }
    doc.setTextColor(20, 20, 20);

    // Vignette de signature si dispo (data URL)
    if (s.signatureData && (s.signatureMethod === "drawn" || s.signatureMethod === "image")) {
      try {
        doc.addImage(s.signatureData, "PNG", 18, y, 50, 18);
        y += 22;
      } catch {
        y += 4;
      }
    } else if (s.signatureData) {
      doc.setFont("helvetica", "italic");
      doc.text(`Signature : ${s.signatureData}`, 18, y);
      doc.setFont("helvetica", "normal");
      y += 6;
    }
    y += 3;
  }

  addFooter(doc, hash);
  doc.save(`${binder.name.replace(/[^a-z0-9-_]+/gi, "_")}_signe.pdf`);
}

/** Certificat de preuve — timeline complète + hash. */
export function generateCertificatePdf(binder: Binder, lang: string = "fr"): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const hash = binderHash(binder);
  addHeader(doc, "Certificat de preuve", binder.name);

  let y = 38;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Identification du parapheur", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Référence interne : ${binder.id}`, 14, y);
  y += 5;
  doc.text(`Empreinte (hash) : ${hash}`, 14, y);
  y += 5;
  doc.text(`Propriétaire : ${binder.ownerName} <${binder.ownerEmail}>`, 14, y);
  y += 5;
  doc.text(`Créé le : ${formatDateTime(binder.createdAt, lang)}`, 14, y);
  y += 5;
  if (binder.completedAt) {
    doc.text(`Terminé le : ${formatDateTime(binder.completedAt, lang)}`, 14, y);
    y += 5;
  }
  if (binder.stoppedAt) {
    doc.text(`Arrêté le : ${formatDateTime(binder.stoppedAt, lang)}`, 14, y);
    y += 5;
    if (binder.stoppedReason) {
      const lines = doc.splitTextToSize(`Motif : ${binder.stoppedReason}`, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5;
    }
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Journal d'audit", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const events = (binder.auditEvents ?? []).slice().sort((a, b) => a.at.localeCompare(b.at));
  if (events.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text("Aucun événement enregistré.", 14, y);
    doc.setTextColor(20, 20, 20);
  }
  for (const ev of events) {
    y = ensureSpace(doc, y, 18);
    const label = KIND_LABEL_FR[ev.kind] ?? ev.kind;
    doc.setFont("helvetica", "bold");
    doc.text(`• ${label}`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatDateTime(ev.at, lang), 200, y, { align: "right" });
    y += 5;
    const who = [ev.actorName, ev.actorEmail ? `<${ev.actorEmail}>` : ""]
      .filter(Boolean)
      .join(" ");
    if (who) {
      doc.setTextColor(100, 116, 139);
      doc.text(`Acteur : ${who}`, 18, y);
      doc.setTextColor(20, 20, 20);
      y += 4;
    }
    if (ev.targetName || ev.targetEmail) {
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Cible : ${ev.targetName ?? ""}${ev.targetEmail ? ` <${ev.targetEmail}>` : ""}`,
        18,
        y,
      );
      doc.setTextColor(20, 20, 20);
      y += 4;
    }
    if (ev.ip) {
      doc.setTextColor(100, 116, 139);
      doc.text(`IP : ${ev.ip}`, 18, y);
      doc.setTextColor(20, 20, 20);
      y += 4;
    }
    if (ev.message) {
      const lines = doc.splitTextToSize(ev.message, 170);
      doc.text(lines, 18, y);
      y += lines.length * 4;
    }
    y += 2;
  }

  addFooter(doc, hash);
  doc.save(`${binder.name.replace(/[^a-z0-9-_]+/gi, "_")}_certificat.pdf`);
}
