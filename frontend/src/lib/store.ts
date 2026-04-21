"use client";

import { create } from "zustand";
import type { Step } from "./constants";
import type { FieldType } from "./detection/schema";
import type { CleaningResult } from "./cleaning/engine";
import type { QualityScore } from "./api";

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
  qualityScoreBefore: QualityScore | null;
  qualityScoreAfter: QualityScore | null;

  // Backend API state
  jobId: string | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;

  setStep: (step: Step) => void;
  setRawData: (data: string) => void;
  setFormat: (format: string) => void;
  setParsed: (records: Record<string, unknown>[]) => void;
  setSchema: (schema: Record<string, FieldType>) => void;
  setResult: (result: CleaningResult | null) => void;
  setExportFormat: (fmt: string) => void;
  setIssueFilter: (filter: string) => void;
  setDragOver: (over: boolean) => void;
  setJobId: (id: string | null) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setQualityScoreBefore: (score: QualityScore | null) => void;
  setQualityScoreAfter: (score: QualityScore | null) => void;
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
  qualityScoreBefore: null as QualityScore | null,
  qualityScoreAfter: null as QualityScore | null,
  jobId: null as string | null,
  isLoading: false,
  loadingMessage: "",
  error: null as string | null,
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
  setJobId: (jobId) => set({ jobId }),
  setLoading: (isLoading, loadingMessage = "") => set({ isLoading, loadingMessage }),
  setError: (error) => set({ error }),
  setQualityScoreBefore: (qualityScoreBefore) => set({ qualityScoreBefore }),
  setQualityScoreAfter: (qualityScoreAfter) => set({ qualityScoreAfter }),
  reset: () => set({ ...initialState }),
}));
