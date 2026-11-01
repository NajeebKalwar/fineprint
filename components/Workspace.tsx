"use client";
import { useEffect, useMemo, useState } from "react";
import { Renderer } from "@openuidev/react-lang";
import { library } from "@/lib/library";
import { splitIntoBlocks, type Block } from "@/lib/blocks";
import { SAMPLE_LEASE } from "@/lib/samples";
import { WorkspaceContext, type LetterItem } from "./workspace-context";

export default function Workspace() {
  const [raw, setRaw] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [mode, setMode] = useState<"input" | "reader">("input");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [lastAnalysisText, setLastAnalysisText] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [letterItems, setLetterItems] = useState<LetterItem[]>([]);

  useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(`block-${highlightId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId]);

  const ctx = useMemo(
    () => ({
      blocks,
      highlightId,
      focusBlock: setHighlightId,
      letterItems,
      toggleLetterItem: (item: LetterItem) =>
        setLetterItems((prev) =>
          prev.some((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item]
        ),
    }),
    [blocks, highlightId, letterItems]
  );

  async function analyze(text: string) {
    setError(null);
    setRetryAvailable(false);
    if (text.trim().length < 50) {
      setError("Not enough text found. If this was a scan, paste the text or try a sample.");
      return;
    }
    setLastAnalysisText(text);
    const b = splitIntoBlocks(text);
    setBlocks(b);
    setMode("reader");
    setResponse("");
    setLetterItems([]);
    setHighlightId(null);
    setStreaming(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: b }),
      });
      if (!res.ok) {
        const message = (await res.text()) || "Request failed";
        if (res.status === 503 || res.status === 429) setRetryAvailable(true);
        throw new Error(message);
      }
      if (!res.body) throw new Error("The analysis response did not include a stream.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setResponse(acc);
      }
      acc += dec.decode();
      setResponse(acc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStreaming(false);
    }
  }

  const clean = response.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "");

  return (
    <WorkspaceContext.Provider value={ctx}>
      <div className="flex h-screen flex-col bg-slate-50">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h1 className="text-xl font-bold text-slate-900">
            Fine<span className="text-indigo-600">Print</span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setRaw(SAMPLE_LEASE);
                analyze(SAMPLE_LEASE);
              }}
              className="rounded-full border border-indigo-300 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Predatory apartment lease
            </button>
          </div>
        </header>

        <main className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
          <section className="overflow-y-auto border-r border-slate-200 bg-white p-5">
            {mode === "input" ? (
              <div className="flex h-full flex-col gap-3">
                <textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="Paste your lease, bill, or contract text here, or try the sample above."
                  className="min-h-64 flex-1 rounded-lg border border-slate-300 p-3 text-sm text-black"
                />
                <button
                  onClick={() => analyze(raw)}
                  className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Analyze document
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setMode("input")}
                  className="mb-2 text-xs font-medium text-indigo-700 underline"
                >
                  Edit or paste a different document
                </button>
                {blocks.map((b) => (
                  <p
                    key={b.id}
                    id={`block-${b.id}`}
                    className={`rounded-md p-2 text-sm leading-relaxed transition-colors ${
                      highlightId === b.id ? "bg-amber-100 ring-2 ring-amber-400" : "text-slate-800"
                    }`}
                  >
                    <span className="mr-2 text-xs font-mono text-slate-400">{b.id.replace("b", "")}</span>
                    {b.text}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-y-auto p-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p>{error}</p>
                {retryAvailable && (
                  <button
                    onClick={() => analyze(lastAnalysisText)}
                    disabled={streaming}
                    className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
            {mode === "reader" && !clean && streaming && (
              <p className="text-sm text-slate-500">Reading your document...</p>
            )}
            {clean && <Renderer response={clean} library={library} isStreaming={streaming} />}
            {mode === "input" && !error && (
              <p className="text-sm text-slate-400">Your analysis will stream in here.</p>
            )}
          </section>
        </main>

        <footer className="border-t border-slate-200 bg-white px-5 py-2 text-center text-xs text-slate-500">
          FinePrint offers questions to ask, not legal or medical advice. Verify every finding against the original document.
        </footer>
      </div>
    </WorkspaceContext.Provider>
  );
}