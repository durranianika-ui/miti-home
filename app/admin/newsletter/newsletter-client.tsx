"use client";

import { useId, useMemo, useState } from "react";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, inputClass } from "../_lib/format";

type Subscriber = { id: string; email: string; source: string; createdAt: string };

function csvCell(value: string) {
  // Quote every cell and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function NewsletterClient({ subscribers }: { subscribers: Subscriber[] }) {
  const uid = useId();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return subscribers;
    return subscribers.filter(
      (subscriber) => subscriber.email.toLowerCase().includes(term) || subscriber.source.toLowerCase().includes(term),
    );
  }, [search, subscribers]);

  const copyEmails = async () => {
    const text = filtered.map((subscriber) => subscriber.email).join(", ");
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Copied ${filtered.length} email${filtered.length === 1 ? "" : "s"} to the clipboard.`);
    } catch {
      setStatus("Your browser blocked clipboard access. Use the CSV download instead.");
    }
  };

  const downloadCsv = () => {
    const rows = [
      ["email", "source", "subscribed_at"],
      ...filtered.map((subscriber) => [subscriber.email, subscriber.source, subscriber.createdAt]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `miti-home-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${filtered.length} subscriber${filtered.length === 1 ? "" : "s"}.`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
          <p className="text-muted-foreground">
            {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"}
            {subscribers.length >= 500 ? " (showing the latest 500)" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyEmails} disabled={filtered.length === 0}>
            <Copy className="h-4 w-4" />
            Copy emails
          </Button>
          <Button onClick={downloadCsv} disabled={filtered.length === 0} className="bg-brand text-neutral-950 hover:bg-brand/90">
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${uid}-search`} className="text-xs font-medium text-muted-foreground">
          Filter by email or source
        </label>
        <input
          id={`${uid}-search`}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={`${inputClass} max-w-md`}
        />
      </div>

      <p role="status" aria-live="polite" className={status ? "text-sm" : "sr-only"}>
        {status}
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th scope="col" className="p-3 font-medium">Email</th>
              <th scope="col" className="p-3 font-medium">Source</th>
              <th scope="col" className="p-3 font-medium">Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted-foreground">
                  {subscribers.length === 0 ? "No subscribers yet." : "No subscribers match this filter."}
                </td>
              </tr>
            ) : (
              filtered.map((subscriber) => (
                <tr key={subscriber.id} className="border-b border-border last:border-0">
                  <td className="p-3">{subscriber.email}</td>
                  <td className="p-3 capitalize text-muted-foreground">{subscriber.source.replace(/[-_]/g, " ")}</td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(subscriber.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
