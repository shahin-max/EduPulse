"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2, MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** One entry in an actions menu. Give either `href` (a link) or `onSelect` (a command). */
export type RowAction = {
  label: string;
  icon: LucideIcon;
  href?: string;
  /** Opens `href` in a new tab (meeting links, WhatsApp, files). */
  external?: boolean;
  onSelect?: () => void;
  /** Shown in red and grouped at the bottom, after a separator. */
  destructive?: boolean;
  disabled?: boolean;
  /** Why the action is disabled (or a short explanation), shown under the label. */
  hint?: string;
};

/** Falsy entries are skipped, so callers can write `cond && { ... }` (even when `cond` is a string or number). */
type MaybeAction = RowAction | false | null | undefined | "" | 0;

const HOVER_OPEN_MS = 150;
const HOVER_CLOSE_MS = 250;

/**
 * The "⋮" actions menu used in every list's Actions column, on mobile cards and in page headers.
 * Click or tap opens it on every device; with a mouse it also opens after a short hover and closes
 * when the pointer leaves the button and the menu. Keyboard: Enter/Space/Arrow keys, Esc closes.
 */
export function RowActions({ items, label, busy = false, title, className, align = "end" }: {
  items: MaybeAction[];
  /** What the menu acts on, for screen readers: "Actions for Asha Khan". */
  label: string;
  /** Shows a spinner while one of the actions is running. */
  busy?: boolean;
  /** Optional heading at the top of the menu. */
  title?: string;
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when a mouse hover opened the menu: closing it then leaves focus alone instead of jumping
  // back to the button (keyboard and tap users still get focus returned).
  const byHover = useRef(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const actions = items.filter(Boolean) as RowAction[];
  if (!actions.length) return null;
  const normal = actions.filter(a => !a.destructive);
  const danger = actions.filter(a => a.destructive);

  const schedule = (next: boolean, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (next && !open) byHover.current = true; setOpen(next); }, ms);
  };
  // Hover only for mice: touch and pen keep tap-to-open, so a scroll never opens a menu.
  const hoverIn = (e: React.PointerEvent) => { if (e.pointerType === "mouse") schedule(true, open ? 0 : HOVER_OPEN_MS); };
  const hoverOut = (e: React.PointerEvent) => { if (e.pointerType === "mouse") schedule(false, HOVER_CLOSE_MS); };

  const item = (a: RowAction) => {
    const body = <>
      <a.icon />
      <span className="grid min-w-0">
        <span className="truncate">{a.label}</span>
        {a.hint && <span className="truncate text-xs font-normal text-muted-foreground">{a.hint}</span>}
      </span>
    </>;
    if (a.href && !a.disabled) {
      return <DropdownMenuItem key={a.label} asChild variant={a.destructive ? "destructive" : "default"}>
        {a.external
          ? <a href={a.href} target="_blank" rel="noopener noreferrer">{body}</a>
          : <Link href={a.href}>{body}</Link>}
      </DropdownMenuItem>;
    }
    return <DropdownMenuItem key={a.label} variant={a.destructive ? "destructive" : "default"} disabled={a.disabled}
      onSelect={() => a.onSelect?.()}>{body}</DropdownMenuItem>;
  };

  return <DropdownMenu open={open} modal={false} onOpenChange={next => {
    if (timer.current) clearTimeout(timer.current);
    if (next) byHover.current = false;
    setOpen(next);
  }}>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label={`Actions for ${label}`} disabled={busy}
        className={cn("size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground", className)}
        onPointerEnter={hoverIn} onPointerLeave={hoverOut}>
        {busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align={align} className="w-56" onPointerEnter={hoverIn} onPointerLeave={hoverOut}
      onCloseAutoFocus={e => { if (byHover.current) e.preventDefault(); byHover.current = false; }}>
      {title && <><DropdownMenuLabel className="truncate text-xs text-muted-foreground">{title}</DropdownMenuLabel><DropdownMenuSeparator /></>}
      {normal.map(item)}
      {normal.length > 0 && danger.length > 0 && <DropdownMenuSeparator />}
      {danger.map(item)}
    </DropdownMenuContent>
  </DropdownMenu>;
}

/** The header cell of the Actions column (right-aligned, narrow). */
export function ActionsHead({ className }: { className?: string }) {
  return <TableHead className={cn("w-20 pr-4 text-right", className)}>Actions</TableHead>;
}
