import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, FileText, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getErrorMessage } from "@/lib/api";
import { openSignedDocumentPdf } from "@/lib/evidence";
import { formatDateTime } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { useBinders, useParticipatedBinders } from "@/lib/store";
import type { Binder, BinderSigner } from "@/lib/mockData";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Documents — Usign" }] }),
  component: DocumentsPage,
});

type DocumentRecord = {
  key: string;
  binder: Binder;
  documentId: string;
  binderId: string;
  name: string;
  binderName: string;
  binderDescription?: string;
  ownerName: string;
  ownerEmail: string;
  updatedAt: string;
  pages?: number;
  isOwned: boolean;
  signerOutcome?: "signed" | "declined";
};

function findParticipatedSigner(binder: Binder, email: string) {
  return (binder.signers ?? []).find(
    (signer) =>
      signer.email.toLowerCase() === email.toLowerCase() &&
      (signer.status === "signed" || signer.status === "declined"),
  );
}

function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const { binders } = useBinders();
  const { binders: participatedBinders, isLoading } = useParticipatedBinders();
  const session = getSession();
  const sessionEmail = session?.email?.trim().toLowerCase() ?? "";
  const [query, setQuery] = useState("");
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  const records = useMemo(() => {
    const map = new Map<string, DocumentRecord>();

    const upsertRecord = (record: DocumentRecord) => {
      const current = map.get(record.key);

      map.set(record.key, {
        ...record,
        isOwned: record.isOwned || current?.isOwned || false,
        signerOutcome: record.signerOutcome ?? current?.signerOutcome,
      });
    };

    const upsertOwned = (binder: Binder) => {
      const hasSignatureHistory = (binder.signers ?? []).some(
        (signer) => signer.status === "signed" || signer.status === "declined",
      );
      if (!hasSignatureHistory) {
        return;
      }

      for (const document of binder.documents ?? []) {
        upsertRecord({
          key: `${binder.id}:${document.id}`,
          binder,
          documentId: document.id,
          binderId: binder.id,
          name: document.name,
          binderName: binder.name,
          binderDescription: binder.description,
          ownerName: binder.ownerName,
          ownerEmail: binder.ownerEmail,
          updatedAt: binder.updatedAt,
          pages: document.pages,
          isOwned: true,
          signerOutcome: undefined,
        });
      }
    };

    const upsertParticipated = (binder: Binder, signer: BinderSigner) => {
      for (const document of binder.documents ?? []) {
        upsertRecord({
          key: `${binder.id}:${document.id}`,
          binder,
          documentId: document.id,
          binderId: binder.id,
          name: document.name,
          binderName: binder.name,
          binderDescription: binder.description,
          ownerName: binder.ownerName,
          ownerEmail: binder.ownerEmail,
          updatedAt: binder.updatedAt,
          pages: document.pages,
          isOwned: false,
          signerOutcome: signer.status === "declined" ? "declined" : "signed",
        });
      }
    };

    for (const binder of binders) {
      upsertOwned(binder);
    }

    if (sessionEmail) {
      for (const binder of participatedBinders) {
        const signer = findParticipatedSigner(binder, sessionEmail);
        if (!signer) continue;
        upsertParticipated(binder, signer);
      }
    }

    return [...map.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [binders, participatedBinders, sessionEmail]);

  const documents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      if (!normalizedQuery) return true;

      return [record.name, record.binderName, record.ownerName, record.ownerEmail].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [records, query]);

  const fmt = (iso: string) => formatDateTime(iso, i18n.language);

  const openDocument = async (document: DocumentRecord) => {
    if (openingKey) return;

    setOpeningKey(document.key);
    try {
      await openSignedDocumentPdf(document.binder, document.documentId, i18n.language);
    } catch (error) {
      toast.error(getErrorMessage(error, t("documents.errors.open")));
    } finally {
      setOpeningKey(null);
    }
  };

  if (isLoading && records.length === 0) {
    return (
      <AppShell>
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{t("documents.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("documents.subtitle")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px] max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("documents.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">{t("documents.cols.name")}</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    {t("documents.cols.binder")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">{t("documents.cols.scope")}</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    {t("documents.cols.updated")}
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      {t("documents.empty")}
                    </td>
                  </tr>
                )}
                {documents.map((document) => (
                  <tr key={document.key} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-action/10 text-action">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="font-medium text-foreground">{document.name}</div>
                          {document.pages ? (
                            <div className="text-xs text-muted-foreground">
                              {t("documents.pageCount", { count: document.pages })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link
                        to="/binders/detail/$id"
                        params={{ id: document.binderId }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {document.binderName}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {document.ownerName} · {document.ownerEmail}
                      </div>
                      {document.binderDescription ? (
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {document.binderDescription}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {document.isOwned && (
                          <span className="inline-flex items-center rounded-full bg-action/10 px-2 py-0.5 text-[11px] font-medium text-action">
                            {t("documents.badges.owned")}
                          </span>
                        )}
                        {document.signerOutcome === "signed" && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            {t("documents.badges.signed")}
                          </span>
                        )}
                        {document.signerOutcome === "declined" && (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                            {t("documents.badges.declined")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {fmt(document.updatedAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDocument(document)}
                          disabled={openingKey === document.key}
                        >
                          <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                          {openingKey === document.key
                            ? t("documents.opening")
                            : t("documents.open")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
