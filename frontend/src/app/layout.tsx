import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smelt — Raw data in. Pure data out.",
  description:
    "AI-powered universal data cleaning. Drop any messy data file and get clean, normalized, export-ready data in seconds.",
  keywords: ["data cleaning", "csv cleaner", "data normalization", "ETL", "data quality"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#09090b", color: "#fafafa", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
