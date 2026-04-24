import { useCallback, useEffect, useState } from "react";
import { apiFetch, hasStoredAuthToken } from "./api";

export type SavedSignatureMethod = "drawn" | "typed" | "image";

export type SavedSignature = {
  method: SavedSignatureMethod;
  data: string; // dataURL (drawn/image) ou texte (typed)
  updatedAt: string;
};

type SaveMySignatureInput = Omit<SavedSignature, "updatedAt">;

const MY_SIGNATURE_EVENT = "usign:mySignature";

function emitMySignatureChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MY_SIGNATURE_EVENT));
}

export async function getMySignature() {
  if (!hasStoredAuthToken()) {
    return null as SavedSignature | null;
  }

  const payload = await apiFetch<SavedSignature | null | string>("/my-signature");

  if (!payload || typeof payload !== "object") {
    return null as SavedSignature | null;
  }

  return payload;
}

export async function saveMySignature(signature: SaveMySignatureInput) {
  const saved = await apiFetch<SavedSignature>("/my-signature", {
    method: "PUT",
    body: JSON.stringify(signature),
  });

  emitMySignatureChange();
  return saved;
}

export async function clearMySignature() {
  if (!hasStoredAuthToken()) {
    emitMySignatureChange();
    return { ok: true };
  }

  const result = await apiFetch<{ ok: boolean }>("/my-signature", {
    method: "DELETE",
  });

  emitMySignatureChange();
  return result;
}

export function useMySignature() {
  const [saved, setSaved] = useState<SavedSignature | null>(null);
  const [isLoading, setIsLoading] = useState(() => hasStoredAuthToken());

  const refresh = useCallback(async () => {
    if (!hasStoredAuthToken()) {
      setSaved(null);
      setIsLoading(false);
      return null as SavedSignature | null;
    }

    setIsLoading(true);
    try {
      const next = await getMySignature();
      setSaved(next);
      return next;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!hasStoredAuthToken()) {
        if (active) {
          setSaved(null);
          setIsLoading(false);
        }
        return;
      }

      if (active) {
        setIsLoading(true);
      }

      try {
        const next = await getMySignature();
        if (active) {
          setSaved(next);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void sync();

    const onChange = () => {
      void sync();
    };

    window.addEventListener(MY_SIGNATURE_EVENT, onChange);
    window.addEventListener("goodflag:auth", onChange);

    return () => {
      active = false;
      window.removeEventListener(MY_SIGNATURE_EVENT, onChange);
      window.removeEventListener("goodflag:auth", onChange);
    };
  }, []);

  const save = useCallback(async (signature: SaveMySignatureInput) => {
    const next = await saveMySignature(signature);
    setSaved(next);
    return next;
  }, []);

  const clear = useCallback(async () => {
    await clearMySignature();
    setSaved(null);
  }, []);

  return {
    saved,
    isLoading,
    refresh,
    save,
    clear,
  };
}
