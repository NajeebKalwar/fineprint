import { createLibrary, defineComponent } from "@openuidev/lang-core";
import { z } from "zod/v4";

export const SummaryCardDefinition = defineComponent({
  name: "SummaryCard",
  description:
    "Top-of-report card: detected document type, counterparty, overall risk, and a two-sentence overview. Always the first child of Report.",
  props: z.object({
    docType: z.string().describe("e.g. Residential Lease, Medical Bill, Freelance NDA"),
    counterparty: z.string().describe("Name of the other party (landlord, hospital, client)"),
    severity: z.enum(["low", "medium", "high"]).describe("Overall risk to the person who must sign or pay"),
    overview: z.string().describe("Two plain-English sentences summarizing the document"),
  }),
  component: () => null,
});

export const DateEventDefinition = defineComponent({
  name: "DateEvent",
  description: "One dated milestone or deadline found in the document.",
  props: z.object({
    label: z.string().describe("What happens, e.g. Lease ends, Non-renewal notice deadline"),
    date: z.string().describe("Date or period as written, e.g. Dec 31, 2027 or 90 days before term end"),
    blockId: z.string().describe("Block id containing this date, e.g. b02"),
  }),
  component: () => null,
});

export const KeyDatesTimelineDefinition = defineComponent({
  name: "KeyDatesTimeline",
  description: "Chronological list of key dates and deadlines. Include auto-renewal and notice windows.",
  props: z.object({
    events: z.array(DateEventDefinition.ref),
  }),
  component: () => null,
});

export const FeeRowDefinition = defineComponent({
  name: "FeeRow",
  description: "One fee or charge found in the document.",
  props: z.object({
    name: z.string(),
    amount: z.string().describe("Amount exactly as written, e.g. $450 or 15% of monthly rent"),
    kind: z.enum(["one-time", "recurring", "penalty"]),
    flag: z.enum(["ok", "vague", "uncapped", "unusual"]).describe("ok if standard and clear"),
    blockId: z.string(),
  }),
  component: () => null,
});

export const FeeTableDefinition = defineComponent({
  name: "FeeTable",
  description: "Table of every fee, deposit, and penalty in the document, with flags for vague or uncapped ones.",
  props: z.object({
    rows: z.array(FeeRowDefinition.ref),
  }),
  component: () => null,
});

export const RiskCalloutDefinition = defineComponent({
  name: "RiskCallout",
  description:
    "One risky clause. The quote MUST be copied verbatim from the document. Order callouts from highest to lowest severity.",
  props: z.object({
    title: z.string().describe("Short risk name, max 6 words"),
    severity: z.enum(["low", "medium", "high"]),
    impact: z.string().describe("Plain-English impact on the person, 1-2 sentences"),
    quote: z.string().describe("VERBATIM text copied from the document, max 40 words"),
    blockId: z.string().describe("Block id that contains the quote, e.g. b07"),
  }),
  component: () => null,
});

export const LetterFormDefinition = defineComponent({
  name: "LetterForm",
  description:
    "Dispute / negotiation letter drafter. Always the last child of Report. The app inserts the user's flagged risks automatically.",
  props: z.object({
    recipient: z.string().describe("Who the letter is addressed to"),
    subject: z.string().describe("Letter subject line"),
    closing: z.string().describe("One or two closing sentences stating what the person is asking for"),
  }),
  component: () => null,
});

export const ReportDefinition = defineComponent({
  name: "Report",
  description:
    "Root container. Children in order: SummaryCard, then KeyDatesTimeline and/or FeeTable only if relevant to this document type, then RiskCallouts (highest severity first), then LetterForm last.",
  props: z.object({
    children: z.array(z.any()),
  }),
  component: () => null,
});

export const promptLibrary = createLibrary({
  root: "Report",
  components: [
    ReportDefinition,
    SummaryCardDefinition,
    KeyDatesTimelineDefinition,
    DateEventDefinition,
    FeeTableDefinition,
    FeeRowDefinition,
    RiskCalloutDefinition,
    LetterFormDefinition,
  ],
});
