"use client";

import { ExternalLinkIcon } from "lucide-react";

const GEO_BASE_URL = "http://localhost:4200";

export function GeoAnalysisButton({ analysisId }: { analysisId: string }) {
  const url = `${GEO_BASE_URL}/geo/analysis/${analysisId}`;

  return (
    <a
      className="inline-flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950/30"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <ExternalLinkIcon size={15} />
      Analyse in Geo View öffnen
    </a>
  );
}
