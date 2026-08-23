"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type FeedbackRow = {
  id: string;
  studentName: string;
  sessionTypeLabel: string;
  scenarioName: string | null;
  date: string;
  feedbackText: string | null;
};

function FeedbackRowItem({ row }: { row: FeedbackRow }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="p-3 font-medium">{row.studentName}</td>
        <td className="p-3">{row.sessionTypeLabel}</td>
        <td className="p-3">{row.scenarioName ?? "—"}</td>
        <td className="p-3 text-muted-foreground">{row.date}</td>
        <td className="p-3">
          {row.feedbackText ? (
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {open ? "הסתר" : "הצג פידבק"}
            </button>
          ) : (
            <span className="text-muted-foreground text-xs">אין פידבק</span>
          )}
        </td>
      </tr>
      {open && row.feedbackText && (
        <tr className="border-b last:border-0 bg-muted/20">
          <td colSpan={5} className="p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {row.feedbackText}
          </td>
        </tr>
      )}
    </>
  );
}

export function FeedbackTable({ rows }: { rows: FeedbackRow[] }) {
  if (rows.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">אין שיחות עדיין</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="p-3 text-start font-medium">חניך</th>
            <th className="p-3 text-start font-medium">סוג שיחה</th>
            <th className="p-3 text-start font-medium">תרחיש</th>
            <th className="p-3 text-start font-medium">תאריך</th>
            <th className="p-3 text-start font-medium">פידבק</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <FeedbackRowItem key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
