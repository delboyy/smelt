"use client";

import { StatCard } from "@/components/ui/StatCard";
import { T } from "@/lib/constants";
import type { CleaningStats } from "@/lib/cleaning/engine";

type StatsDashboardProps = {
  stats: CleaningStats;
  cleanCount: number;
};

export function StatsDashboard({ stats, cleanCount }: StatsDashboardProps) {
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
      <StatCard value={stats.total} label="Records in" color={T.text2} />
      <StatCard value={cleanCount} label="Records out" color={T.green} />
      <StatCard value={stats.dupes} label="Duplicates" color={T.amber} />
      <StatCard value={stats.fixes} label="Normalized" color={T.blue} />
      <StatCard value={stats.nulls} label="Nulled" color={T.text3} />
    </div>
  );
}
