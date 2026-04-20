"use client";

import { DataTable } from "@/components/ui/DataTable";

type DataPreviewProps = {
  records: Record<string, unknown>[];
  schema?: Record<string, string>;
};

export function DataPreview({ records, schema }: DataPreviewProps) {
  return <DataTable records={records} highlightSchema={schema} maxRows={50} />;
}
