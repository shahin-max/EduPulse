"use client";

import type { Tone } from "../ui";
import { titleCase } from "../ui";
import { toPaise, type Invoice, type PaymentMethod } from "@/lib/admin-fees-api";

export const INVOICE_TONES: Partial<Record<string, Tone>> = { DRAFT: "gray", ISSUED: "blue", PART_PAID: "amber", PAID: "green", VOID: "red" };
export const PAYMENT_TONES: Partial<Record<string, Tone>> = { PENDING: "amber", CONFIRMED: "green", FAILED: "red", CANCELLED: "gray" };
export const ENROLLMENT_TONES: Partial<Record<string, Tone>> = { ACTIVE: "green", PENDING: "amber", PAUSED: "orange", COMPLETED: "blue", CANCELLED: "red" };

const METHOD_LABEL: Record<PaymentMethod, string> = { CASH: "Cash", UPI: "UPI", BANK_TRANSFER: "Bank transfer", CARD: "Card", OTHER: "Other" };
export const methodLabel = (method: string) => METHOD_LABEL[method as PaymentMethod] ?? titleCase(method);

/** Today as YYYY-MM-DD in local time (for <input type="date">). */
export function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** A Date as the value of <input type="datetime-local"> (local time, minutes). */
export function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Due date columns are DATE values serialised at UTC midnight: keep the calendar day. */
export const dateOnly = (value: string | null | undefined) => value ? value.slice(0, 10) : "";

/** Unpaid money on an issued invoice whose due date has passed. */
export function isOverdue(invoice: Pick<Invoice, "status" | "due_date" | "balance_due">) {
  return (invoice.status === "ISSUED" || invoice.status === "PART_PAID") && !!invoice.due_date
    && dateOnly(invoice.due_date) < todayIso() && toPaise(invoice.balance_due) > 0;
}

/** Sum of pending payments on an invoice (they reserve part of the balance). */
export const pendingPaise = (invoice: Invoice) =>
  invoice.payments.filter(p => p.status === "PENDING").reduce((total, p) => total + toPaise(p.amount), 0);

/** Confirmed amount of a payment that has not been refunded or promised as a refund (pending/confirmed refunds). */
export const refundablePaise = (payment: Invoice["payments"][number]) =>
  payment.status !== "CONFIRMED" ? 0
    : toPaise(payment.amount) - payment.payment_refunds.filter(r => r.status === "PENDING" || r.status === "CONFIRMED").reduce((t, r) => t + toPaise(r.amount), 0);

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number) {
  return n < 20 ? ONES[n]! : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}

function belowThousand(n: number) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** Indian numbering: 150050 paise -> "Rupees One Thousand Five Hundred and Fifty Paise Only". */
export function rupeesInWords(paise: number) {
  if (!Number.isFinite(paise) || paise < 0) return "";
  let rupees = Math.floor(paise / 100);
  const fraction = paise % 100;
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10_000_000); rupees %= 10_000_000;
  const lakh = Math.floor(rupees / 100_000); rupees %= 100_000;
  const thousand = Math.floor(rupees / 1000); rupees %= 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rupees) parts.push(belowThousand(rupees));
  const words = parts.join(" ") || "Zero";
  return `Rupees ${words}${fraction ? ` and ${belowHundred(fraction)} Paise` : ""} Only`;
}
