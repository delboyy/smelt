"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type DownloadButtonProps = {
  format: string;
  onDownload: () => void | Promise<void>;
};

export function DownloadButton({ format, onDownload }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      await onDownload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button primary onClick={handle} disabled={loading} style={{ flex: 1 }}>
      {loading ? "Preparing..." : `Download .${format.toLowerCase()}`}
    </Button>
  );
}
