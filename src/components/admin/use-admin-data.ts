"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

/**
 * Loads data from the API with the admin's token. Re-runs when `key` changes; `reload()` fetches again.
 * Responses that arrive after a newer request started are ignored, so fast filter changes never show stale rows.
 */
export function useAdminData<T>(load: (token: string) => Promise<T>, key: string) {
  const { withToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  // `loading` is derived: true until the request for the current key/version has settled.
  const request = `${version}:${key}`;
  const [settled, setSettled] = useState<string | null>(null);
  const loadRef = useRef(load);

  useEffect(() => { loadRef.current = load; });

  useEffect(() => {
    let current = true;
    withToken(token => loadRef.current(token))
      .then(result => { if (current) { setData(result); setError(""); } })
      .catch(e => { if (current) setError(e instanceof Error ? e.message : "Something went wrong."); })
      .finally(() => { if (current) setSettled(request); });
    return () => { current = false; };
  }, [withToken, request]);

  const reload = useCallback(() => setVersion(v => v + 1), []);
  return { data, error, loading: settled !== request, reload, setData };
}
