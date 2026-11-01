"use client";
import { createContext, useContext } from "react";
import type { Block } from "@/lib/blocks";

export type LetterItem = {
  id: string;
  title: string;
  quote: string;
  blockId: string | null;
};

type WorkspaceCtx = {
  blocks: Block[];
  highlightId: string | null;
  focusBlock: (id: string | null) => void;
  letterItems: LetterItem[];
  toggleLetterItem: (item: LetterItem) => void;
};

export const WorkspaceContext = createContext<WorkspaceCtx | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceContext.Provider>");
  return ctx;
}