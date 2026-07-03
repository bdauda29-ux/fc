import Link from "next/link";
import type { ReactNode } from "react";

import { getModelPath } from "@/lib/model-paths";

const secondaryNavigation = [
  { segment: "players", label: "Players" },
  { segment: "history", label: "Match History" },
  { segment: "head-to-head", label: "Head-to-Head" },
];

export function ModelShell({
  modelId,
  children,
}: {
  modelId: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <section className="rounded-3xl bg-slate-950 px-4 py-4 text-white shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex flex-wrap gap-3">
            <Link
              href={getModelPath(modelId)}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-100 hover:border-sky-400"
            >
              Dashboard
            </Link>
            <Link
              href={getModelPath(modelId, "matches")}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Record Match
            </Link>
            <Link
              href={getModelPath(modelId, "table")}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-100 hover:border-sky-400"
            >
              League Table
            </Link>
            <details className="inline-block">
              <summary className="cursor-pointer rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-400 hover:text-white">
                More
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {secondaryNavigation.map((item) => (
                  <Link
                    key={item.segment}
                    href={getModelPath(modelId, item.segment)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          </nav>
        </div>
      </section>
      {children}
    </div>
  );
}
