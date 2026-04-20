"use client";

import { create } from "zustand";
import type { Step } from "./constants";
import type { FieldType } from "./detection/schema";
import type { CleaningResult } from "./cleaning/engine";

type SmeltState = {
  step: Step;
  rawData: string;
  format: string;
  parsed: Record<string, unknown>[];
  schema: Record<string, FieldType>;
  result: CleaningResult | null;
  exportFormat: string;
  issueFilter: string;
  dragOver: boolean;

  setStep: (step: Step) => void;
  setRawData: (data: string) => void;
  setFormat: (format: string) => void;
  setParsed: (records: Record<string, unknown>[]) => void;
  setSchema: (schema: Record<string, FieldType>) => void;
  setResult: (result: CleaningResult | null) => void;
  setExportFormat: (fmt: string) => void;
  setIssueFilter: (filter: string) => void;
  setDragOver: (over: boolean) => void;
  reset: () => void;
};

const initialState = {
  step: "Ingest" as Step,
  rawData: "",
  format: "",
  parsed: [] as Record<string, unknown>[],
  schema: {} as Record<string, FieldType>,
  result: null as CleaningResult | null,
  exportFormat: "CSV",
  issueFilter: "all",
  dragOver: false,
};

export const useSmeltStore = create<SmeltState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setRawData: (rawData) => set({ rawData }),
  setFormat: (format) => set({ format }),
  setParsed: (parsed) => set({ parsed }),
  setSchema: (schema) => set({ schema }),
  setResult: (result) => set({ result }),
  setExportFormat: (exportFormat) => set({ exportFormat }),
  setIssueFilter: (issueFilter) => set({ issueFilter }),
  setDragOver: (dragOver) => set({ dragOver }),
  reset: () => set({ ...initialState }),
}));
