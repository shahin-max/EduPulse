"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isAnyAdmin, isHeadOffice, request, type BranchRef } from "@/lib/api";
import { query } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";

/**
 * Which branch the admin portal is looking at. Head office sees every branch and can narrow to one;
 * a branch admin sees only their branches (`admin_branches` from GET /auth/me) and can narrow when
 * they run several. The choice is kept per browser and sent as `branchId` on the branch-aware lists
 * (batches, invoices, payments, enquiries, the admin summary). `branchId` undefined means "all"
 * (for a branch admin: all of theirs, which the API applies itself).
 */
export type ScopeBranch = BranchRef & { is_active?: boolean };

export type BranchScope = {
  /** Global ADMIN role. */
  isHeadOffice: boolean;
  /** Runs one or more branches without the global role. */
  isBranchAdmin: boolean;
  /** Branches this admin can work with (head office: all of them, inactive included). */
  branches: ScopeBranch[];
  /** The chosen branch, or undefined for all branches. */
  branchId: number | undefined;
  branch: ScopeBranch | undefined;
  setBranchId: (id: number | undefined) => void;
  /** More than one branch to choose from, so the header shows a switcher. */
  canSwitch: boolean;
};

const NONE: BranchScope = {
  isHeadOffice: false, isBranchAdmin: false, branches: [], branchId: undefined, branch: undefined, setBranchId: () => {}, canSwitch: false,
};

const BranchScopeContext = createContext<BranchScope>(NONE);

/** The admin portal's branch scope. Outside the admin portal (e.g. faculty screens) it is empty: no branch filter. */
export const useBranchScope = () => useContext(BranchScopeContext);

const storageKey = (userId: number) => `edupulse-admin-branch:${userId}`;

function readStored(userId: number): number | undefined {
  try {
    const value = Number(localStorage.getItem(storageKey(userId)));
    return Number.isInteger(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function writeStored(userId: number, id: number | undefined) {
  try {
    if (id) localStorage.setItem(storageKey(userId), String(id));
    else localStorage.removeItem(storageKey(userId));
  } catch {}
}

export function BranchScopeProvider({ children }: { children: React.ReactNode }) {
  const { user, withToken } = useAuth();
  const headOffice = isHeadOffice(user);
  const branchAdmin = !headOffice && isAnyAdmin(user);
  const known = user?.admin_branches;
  // Head office lists every branch; a branch admin only needs GET /branches (their own) if /auth/me had no list.
  const fetchBranches = headOffice || (branchAdmin && !known);
  const [fetched, setFetched] = useState<{ key: string; branches: ScopeBranch[] } | null>(null);
  const fetchKey = fetchBranches && user ? `${user.id}:${headOffice}` : "";
  // Choices made in this tab, by user id; a user's first visit reads the saved one instead.
  const [choices, setChoices] = useState<Record<number, number | undefined>>({});

  useEffect(() => {
    if (!fetchKey) return;
    let live = true;
    withToken(token => request<ScopeBranch[]>(`/branches${query({ includeInactive: headOffice || undefined })}`, { token }))
      .then(branches => { if (live) setFetched({ key: fetchKey, branches }); })
      .catch(() => {});
    return () => { live = false; };
  }, [fetchKey, headOffice, withToken]);

  const userId = user?.id;
  const setBranchId = useCallback((id: number | undefined) => {
    if (userId === undefined) return;
    writeStored(userId, id);
    setChoices(current => ({ ...current, [userId]: id }));
  }, [userId]);

  const value = useMemo<BranchScope>(() => {
    if (!user || (!headOffice && !branchAdmin)) return NONE;
    const loaded = fetched?.key === fetchKey ? fetched.branches : null;
    const branches = (branchAdmin && known ? known : loaded ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    const raw = user.id in choices ? choices[user.id] : readStored(user.id);
    // Head office may use the saved branch before the list arrives; anyone else only a branch they run.
    const valid = raw !== undefined && (headOffice && !loaded ? true : branches.some(b => b.id === raw));
    const branchId = valid ? raw : undefined;
    return {
      isHeadOffice: headOffice,
      isBranchAdmin: branchAdmin,
      branches,
      branchId,
      branch: branches.find(b => b.id === branchId),
      setBranchId,
      canSwitch: branches.length > 1,
    };
  }, [user, headOffice, branchAdmin, known, fetched, fetchKey, choices, setBranchId]);

  return <BranchScopeContext.Provider value={value}>{children}</BranchScopeContext.Provider>;
}

const ALL = "all";

/**
 * The branch switcher in the admin header. Shows the branch name alone when there is only one
 * (a branch admin of one branch), and nothing outside the admin portal.
 */
export function BranchSwitcher() {
  const { branches, branchId, setBranchId, canSwitch, isBranchAdmin: branchAdmin } = useBranchScope();
  if (!canSwitch) {
    if (branches.length !== 1) return null;
    return <span className="hidden max-w-[14rem] items-center gap-1.5 truncate rounded-md border px-2.5 py-1 text-sm text-muted-foreground sm:inline-flex" title="Your branch">
      <Building2 className="size-4 shrink-0" /><span className="truncate">{branches[0].name}</span>
    </span>;
  }
  return <Select value={branchId ? String(branchId) : ALL} onValueChange={v => setBranchId(v === ALL ? undefined : Number(v))}>
    <SelectTrigger size="sm" className="w-36 sm:w-48 [&>span]:truncate" aria-label="Branch">
      <Building2 className="text-muted-foreground" /><SelectValue />
    </SelectTrigger>
    <SelectContent position="popper" align="end">
      <SelectItem value={ALL}>{branchAdmin ? "All my branches" : "All branches"}</SelectItem>
      {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}{b.is_active === false ? " (inactive)" : ""}</SelectItem>)}
    </SelectContent>
  </Select>;
}

/** A list's page number that goes back to 1 when the branch changes. */
export function useBranchPage(branchId: number | undefined) {
  const [state, setState] = useState({ branchId, page: 1 });
  const page = state.branchId === branchId ? state.page : 1;
  const setPage = useCallback((next: number) => setState({ branchId, page: next }), [branchId]);
  return [page, setPage] as const;
}
