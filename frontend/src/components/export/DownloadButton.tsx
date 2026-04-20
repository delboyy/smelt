"use client";

import { Button } from "@/components/ui/Button";

type DownloadButtonProps = {
  content: string;
  format: string;
};

export function DownloadButton({ content, format }: DownloadButtonProps) {
  const download = () => {
    const ext = format.toLowerCase();
    const mime =
      ext === "json" ? "application/json" : ext === "xml" ? "application/xml" : "text/csv";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smelted_data.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button primary onClick={download} style={{ flex: 1 }}>
      Download .{format.toLowerCase()}
    </Button>
  );
}
