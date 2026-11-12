"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FilePlus2, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "../ui";
import { FeePlanFormDialog } from "./fee-plan-dialogs";
import CollectionsList from "./collections-list";
import FeePlansList from "./fee-plans-list";
import { CreateInvoiceDialog } from "./invoice-dialogs";
import InvoicesList from "./invoices-list";

type Tab = "invoices" | "collections" | "plans";
const TABS: { value: Tab; label: string }[] = [{ value: "invoices", label: "Invoices" }, { value: "collections", label: "Collections" }, { value: "plans", label: "Fee plans" }];
const isTab = (value: string | null): value is Tab => TABS.some(t => t.value === value);

export default function FeesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = params.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : "invoices");
  const [invoiceOpen, setInvoiceOpen] = useState(params.get("new") === "invoice");
  const [planOpen, setPlanOpen] = useState(false);
  // Bumped after a create so the list below reloads.
  const [version, setVersion] = useState(0);

  const switchTab = (next: Tab) => {
    setTab(next);
    router.replace(next === "invoices" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  };

  return <>
    <div className="print:hidden">
      <PageHeader title="Fees" description="Invoices, collections and fee plans."
        actions={tab === "invoices"
          ? <Button onClick={() => setInvoiceOpen(true)}><FilePlus2 /> New invoice</Button>
          : tab === "collections"
            ? <Button variant="outline" onClick={() => window.print()}><Printer /> Print report</Button>
            : <Button onClick={() => setPlanOpen(true)}><Plus /> New fee plan</Button>} />
    </div>

    <div role="tablist" aria-label="Fees sections" className="inline-flex w-full rounded-lg bg-muted p-1 sm:w-fit print:hidden">
      {TABS.map(t => <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} onClick={() => switchTab(t.value)}
        className={cn("flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none",
          tab === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
        {t.label}
      </button>)}
    </div>

    {tab === "invoices" ? <InvoicesList key={`i${version}`} onCreate={() => setInvoiceOpen(true)} />
      : tab === "collections" ? <CollectionsList />
      : <FeePlansList key={`p${version}`} onCreate={() => setPlanOpen(true)} />}

    <CreateInvoiceDialog open={invoiceOpen} onOpenChange={setInvoiceOpen} />
    <FeePlanFormDialog open={planOpen} onOpenChange={setPlanOpen} onSaved={() => setVersion(v => v + 1)} />
  </>;
}
