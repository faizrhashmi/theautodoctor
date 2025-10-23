// @ts-nocheck
﻿"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteIntakeButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (loading) return;
    const confirmed = window.confirm(
      "Delete this intake? This action cannot be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/intakes/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Delete failed: ${res.status}`);
      }

      router.push("/admin/intakes");
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to delete intake");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Deleting…" : "Delete Intake"}
    </button>
  );
}
