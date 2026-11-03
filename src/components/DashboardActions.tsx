"use client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui";

async function del(url: string) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Delete failed.");
  }
}

export function DeleteButton({ url, label }: { url: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={busy}
      aria-label={`Delete ${label}`}
      title="Delete"
      onClick={async () => {
        if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
        setBusy(true);
        try {
          await del(url);
          router.refresh();
        } catch (e) {
          window.alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

export function DeleteAllButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="danger"
      size="sm"
      loading={busy}
      onClick={async () => {
        if (!window.confirm("Delete ALL your uploaded documents and tailored CVs? This can't be undone.")) return;
        setBusy(true);
        try {
          await del("/api/account");
          router.refresh();
        } catch (e) {
          window.alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      Delete all my data
    </Button>
  );
}
