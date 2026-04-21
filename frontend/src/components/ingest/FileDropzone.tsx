"use client";

import { useRef } from "react";
import { T } from "@/lib/constants";
import { useSmeltStore } from "@/lib/store";

type FileDropzoneProps = {
  onFile: (file: File) => void;
};

export function FileDropzone({ onFile }: FileDropzoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { dragOver, setDragOver } = useSmeltStore();

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      onClick={() => fileRef.current?.click()}
      style={{
        borderRadius: "12px",
        padding: "48px 24px",
        textAlign: "center",
        cursor: "pointer",
        border: `2px dashed ${dragOver ? T.accent : T.borderLight}`,
        background: dragOver ? T.accentBg : "transparent",
        transition: "all 0.2s",
      }}
    >
      <div style={{ fontSize: "36px", marginBottom: "10px", opacity: 0.7 }}>↑</div>
      <div style={{ fontWeight: 600, fontSize: "15px", color: T.text1 }}>
        Drag a file here or click to browse
      </div>
      <div style={{ fontSize: "12px", color: T.text3, marginTop: "6px" }}>
        .csv · .json · .xml · .tsv · .xlsx · .txt
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv,.xml,.tsv,.txt,.xlsx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
        style={{ display: "none" }}
      />
    </div>
  );
}
