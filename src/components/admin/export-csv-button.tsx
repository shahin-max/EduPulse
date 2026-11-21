"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * "Export CSV" for an API export endpoint (e.g. `/fee-invoices/export?status=PAID`). The file is fetched with
 * the bearer token, since a plain link cannot send it, and saved under the name the API gives.
 */
export function ExportCsvButton({ path, filename, disabled, label = "Export CSV", size, className }: {
  /** API path with the query string, from the list's current filters. */
  path: string;
  /** Used when the response has no Content-Disposition filename. */
  filename: string;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const saved = await withToken(token => downloadFile(path, token, filename));
      toast.success(`Downloaded ${saved}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export the file.");
    } finally {
      setBusy(false);
    }
  }

  return <Button variant="outline" size={size} className={className} disabled={disabled || busy} onClick={() => void run()}>
    {busy ? <Loader2 className="animate-spin" /> : <Download />}{busy ? "Exporting…" : label}
  </Button>;
}
