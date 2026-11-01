# FinePrint — Generative UI Document Copilot

**Decode leases, medical bills, and contracts into interactive UI widgets with bidirectional clause grounding and one-click dispute drafting.**

![Next.js](https://img.shields.io/badge/Next.js-App_Router-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![OpenUI](https://img.shields.io/badge/Thesys-OpenUI_Lang-4F46E5)
![Model](https://img.shields.io/badge/Model-GLM--4.7--Flash_(Z.ai)-10B981)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss)

![FinePrint Architecture](./public/docs/architecture.png)

---
[![FinePrint App Screenshot](https://i.postimg.cc/4Nb4BDsm/screencapture-localhost-3000-2026-11-01-14-07-09.png)](https://postimg.cc/6yqNQ17X)

## Why FinePrint?

Everyday contracts and bills—apartment leases, itemized hospital statements, freelance agreements, and insurance policies—bury financial traps, uncapped fees, and auto-renewal deadlines inside dense prose. 

When users paste these documents into standard AI chat interfaces, they receive a linear wall of markdown text that disconnects warnings from the source paragraphs. **FinePrint** applies the **SciSpace split-screen copilot pattern** to everyday paperwork using **Thesys OpenUI**:

1. **Polymorphic Generative UI**: Instead of static chat bubbles, the LLM streams **OpenUI Lang** to dynamically assemble the exact visual tools a document needs (`SummaryCard`, `KeyDatesTimeline`, `FeeTable`, `RiskCallout`, and `LetterForm`).
2. **Bidirectional Spatial Grounding**: The left reader pane indexes documents into deterministic blocks (`[b01]`, `[b02]`). Clicking **View clause** on any generated risk widget smoothly scrolls and highlights the exact paragraph on the left.
3. **Client-Side Citation-Drift Guard**: Every `RiskCallout` enforces a verbatim quote. If the model's `blockId` drifts, `resolveBlock()` runs a normalized substring check across all blocks and warns the user if a quote cannot be verified in the source text.
4. **Dispute Shopping Cart**: Users click **+ Add to letter** on any flagged risk to dynamically populate a tone-adjustable (`Polite`, `Firm`, `Legal`) negotiation email at the bottom of the report.

---

## System Architecture & Workspace State

```text
+-----------------------------------------------------------------------------------+
|                              Next.js Split-Screen Workspace                       |
|  (WorkspaceContext: blocks[], highlightId, focusBlock(), letterItems[])           |
+-----------------------------------------+-----------------------------------------+
| 1. LEFT PANE: Indexed Block Reader      | 3. RIGHT PANE: OpenUI <Renderer/>      |
|                                         |                                         |
| - Splits raw text into [b01]..[bNN]     | - Streams live OpenUI Lang components:  |
| - Smooth scrolls & highlights active    |   * <SummaryCard/>                     |
|   clause when triggered by right pane   |   * <KeyDatesTimeline/> -> <DateEvent/>|
|                                         |   * <FeeTable/> -> <FeeRow/>          |
|                                         |   * <RiskCallout/> (Citation Verified) |
|                                         |   * <LetterForm/> (Live Tone + Cart)   |
+-----------------------------------------+-----------------------------------------+
                    |                                           ^
                    v  POST /api/analyze (blocks[])             | Streams OpenUI Lang
+-----------------------------------------------------------------------------------+
| 2. SERVER ROUTE & PROMPT ENGINE (app/api/analyze/route.ts)                        |
|                                                                                   |
| - Compiles Zod component contracts via library.prompt()                           |
| - Streams tokens from Z.ai GLM-4.7-Flash (or any OpenAI-compatible LLM)           |
+-----------------------------------------------------------------------------------+
```

### Why State Lives Outside the OpenUI Renderer
During live token streaming, `<Renderer />` from `@openuidev/react-lang` continuously re-evaluates the incoming AST. By hoisting `highlightId` and `letterItems` into `WorkspaceContext` (`components/workspace-context.tsx`), user interactions—like highlighting a paragraph or adding clauses to the dispute letter—persist cleanly without resetting as new tokens arrive.

---

## Tech Stack

* **Framework**: Next.js (App Router, React Server & Client Components)
* **Language & Validation**: TypeScript + Zod (`z.object` positional schema contracts)
* **Generative UI Engine**: [`@openuidev/react-lang`](https://www.openui.com) (`createLibrary`, `defineComponent`, `<Renderer />`)
* **AI Model & Provider**: **Z.ai `glm-4.7-flash`** via OpenAI Node SDK (`openai`) — compatible with OpenRouter, Gemini, Groq, and OpenAI
* **Styling**: Tailwind CSS

---

## Prompting & Schema Contract (`lib/library.tsx`)

Rather than hand-writing fragile JSON schemas in a system prompt, FinePrint uses OpenUI's `library.prompt()` to compile strongly typed Zod component definitions directly into OpenUI Lang grammar rules:

* **Positional Argument Binding**: Key order inside each `z.object({...})` defines the exact positional argument order streamed by the LLM, cutting token overhead by ~50% compared to raw JSON.
* **Strict Grounding Rules**:
  * Every `RiskCallout` quote must be copied **verbatim** from the document (max 40 words).
  * Every `blockId` (`b01`, `b02`, etc.) must reference the exact paragraph block containing the quote or date.
  * Archetype-adaptive selection: leases render both `KeyDatesTimeline` and `FeeTable`, whereas bills render `FeeTable` and skip empty timelines.

---

## Project Structure

```bash
fineprint/
├── app/
│   ├── api/analyze/route.ts       # Streaming OpenAI-compatible endpoint + library.prompt()
│   └── page.tsx                   # App entry point
├── components/
│   ├── workspace-context.tsx      # Shared React context for clause highlighting & letter cart
│   └── Workspace.tsx              # Split-screen UI, block reader, and OpenUI <Renderer/>
├── lib/
│   ├── blocks.ts                  # Paragraph tokenizer + resolveBlock() citation-drift guard
│   ├── library.tsx                # OpenUI component definitions & Zod schemas
│   └── samples.ts                 # Built-in sample documents (Predatory Apartment Lease)
└── public/
    └── docs/architecture.png      # Architecture diagram
```

---

## Getting Started Locally

### 1. Clone and Install Dependencies

```bash
git clone [https://github.com/YOUR_USERNAME/fineprint.git](https://github.com/YOUR_USERNAME/fineprint.git)
cd fineprint
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory. Never commit your real API key to Git.

```env
# Option A: Z.ai Free GLM-4.7-Flash (Default)
LLM_API_KEY=your_zai_api_key_here
LLM_MODEL=glm-4.7-flash
LLM_BASE_URL=[https://api.z.ai/api/paas/v4/](https://api.z.ai/api/paas/v4/)

# Option B: OpenRouter / Gemini / OpenAI (Alternative)
# LLM_API_KEY=your_key_here
# LLM_MODEL=google/gemma-4-31b:free
# LLM_BASE_URL=[https://openrouter.ai/api/v1](https://openrouter.ai/api/v1)
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Predatory apartment lease** in the top header to watch the generative UI stream live.

---

## Disclaimer

*FinePrint generates questions to ask and negotiation drafts for educational and informational purposes only. It does not provide legal, financial, or medical advice. Always verify findings against the original source document.*
