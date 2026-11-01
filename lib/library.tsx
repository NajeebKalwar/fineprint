'use client';

import { defineComponent, createLibrary } from "@openuidev/react-lang";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-context";
import { resolveBlock } from "@/lib/blocks";
import {
  DateEventDefinition,
  FeeRowDefinition,
  FeeTableDefinition,
  KeyDatesTimelineDefinition,
  LetterFormDefinition,
  ReportDefinition,
  RiskCalloutDefinition,
  SummaryCardDefinition,
} from "@/lib/library-definitions";

const SEV = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
} as const;

const CALLOUT_BORDER = {
  low: "border-emerald-300 bg-emerald-50",
  medium: "border-amber-300 bg-amber-50",
  high: "border-red-300 bg-red-50",
} as const;

function SourceButton({ blockId }: { blockId: string | null }) {
  const { focusBlock } = useWorkspace();
  if (!blockId) return null;
  return (
    <button
      onClick={() => focusBlock(blockId)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      View clause {blockId.replace("b", "")}
    </button>
  );
}

const SummaryCard = defineComponent({
  ...SummaryCardDefinition,
  component: ({ props }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{props.docType}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${SEV[props.severity] ?? SEV.medium}`}>
          {props.severity} risk
        </span>
      </div>
      <p className="mt-0.5 text-sm text-slate-500">with {props.counterparty}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{props.overview}</p>
    </div>
  ),
});

const DateEvent = defineComponent({
  ...DateEventDefinition,
  component: ({ props }) => (
    <li className="flex items-center justify-between gap-3 border-l-2 border-indigo-300 pl-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{props.label}</p>
        <p className="text-xs text-slate-500">{props.date}</p>
      </div>
      <SourceButton blockId={props.blockId} />
    </li>
  ),
});

const KeyDatesTimeline = defineComponent({
  ...KeyDatesTimelineDefinition,
  component: ({ props, renderNode }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Key dates</h3>
      <ol className="space-y-3">{renderNode(props.events)}</ol>
    </div>
  ),
});

const FeeRow = defineComponent({
  ...FeeRowDefinition,
  component: ({ props }) => (
    <tr className="border-t border-slate-100 text-sm">
      <td className="py-2 pr-2 font-medium text-slate-800">{props.name}</td>
      <td className="py-2 pr-2 text-slate-700">{props.amount}</td>
      <td className="py-2 pr-2 text-slate-500">{props.kind}</td>
      <td className="py-2 pr-2">
        {props.flag !== "ok" && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            {props.flag}
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        <SourceButton blockId={props.blockId} />
      </td>
    </tr>
  ),
});

const FeeTable = defineComponent({
  ...FeeTableDefinition,
  component: ({ props, renderNode }) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">Fees and charges</h3>
      <table className="w-full text-left">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="pb-1">Fee</th>
            <th className="pb-1">Amount</th>
            <th className="pb-1">Type</th>
            <th className="pb-1">Flag</th>
            <th />
          </tr>
        </thead>
        <tbody>{renderNode(props.rows)}</tbody>
      </table>
    </div>
  ),
});

const RiskCallout = defineComponent({
  ...RiskCalloutDefinition,
  component: function RiskCalloutRenderer({ props }) {
    const { blocks, toggleLetterItem, letterItems } = useWorkspace();
    const { id, verified } = resolveBlock(blocks, props.blockId, props.quote);
    const itemId = `${id ?? props.blockId}:${props.title}`;
    const added = letterItems.some((i) => i.id === itemId);

    return (
      <div className={`rounded-xl border p-4 ${CALLOUT_BORDER[props.severity] ?? CALLOUT_BORDER.medium}`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{props.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${SEV[props.severity] ?? SEV.medium}`}>
            {props.severity}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-700">{props.impact}</p>
        <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-xs italic text-slate-600">
          {props.quote}
        </blockquote>
        {!verified && (
          <p className="mt-1 text-xs font-medium text-red-700">
            Quote not found in the document. Treat this finding with caution.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <SourceButton blockId={id} />
          <button
            onClick={() =>
              toggleLetterItem({ id: itemId, title: props.title, quote: props.quote, blockId: id })
            }
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              added ? "bg-indigo-600 text-white" : "border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50"
            }`}
          >
            {added ? "Added to letter" : "+ Add to letter"}
          </button>
        </div>
      </div>
    );
  },
});

const TONES = {
  polite: "I hope you are well. I am writing to ask for clarification on a few points in our agreement:",
  firm: "I am writing about several terms in our agreement that I am not willing to accept as written:",
  legal:
    "I am writing to formally request amendment or written clarification of the following provisions. I reserve all rights under applicable law:",
} as const;

const LetterForm = defineComponent({
  ...LetterFormDefinition,
  component: function LetterFormRenderer({ props }) {
    const { letterItems } = useWorkspace();
    const [tone, setTone] = useState<keyof typeof TONES>("polite");
    const [edited, setEdited] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const list = letterItems.length
      ? letterItems.map((it, i) => `${i + 1}. ${it.title}: "${it.quote}"`).join("\n")
      : '(Click "+ Add to letter" on a risk to include it here.)';

    const auto = `Subject: ${props.subject}\n\nDear ${props.recipient},\n\n${TONES[tone]}\n\n${list}\n\n${props.closing}\n\nSincerely,\n[Your name]`;
    const text = edited ?? auto;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Draft letter</h3>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(Object.keys(TONES) as (keyof typeof TONES)[]).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                  tone === t ? "bg-indigo-600 text-white" : "text-slate-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setEdited(e.target.value)}
          rows={12}
          className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-800"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            {copied ? "Copied" : "Copy letter"}
          </button>
          {edited !== null && (
            <button
              onClick={() => setEdited(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Reset to auto-draft
            </button>
          )}
        </div>
      </div>
    );
  },
});

const Report = defineComponent({
  ...ReportDefinition,
  component: ({ props, renderNode }) => (
    <div className="space-y-4">{renderNode(props.children)}</div>
  ),
});

export const library = createLibrary({
  root: "Report",
  components: [
    Report,
    SummaryCard,
    KeyDatesTimeline,
    DateEvent,
    FeeTable,
    FeeRow,
    RiskCallout,
    LetterForm,
  ],
});