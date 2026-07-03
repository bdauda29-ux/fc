import Link from "next/link";
import type { ReactNode } from "react";

import { getModelBasePath, getModelPath } from "@/lib/model-paths";

const modelNavigation = [
  { segment: "dashboard", label: "Dashboard" },
  { segment: "players", label: "Players" },
  { segment: "matches", label: "Add Match" },
  { segment: "history", label: "Match History" },
  { segment: "table", label: "League Table" },
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
      <section className="rounded-3xl bg-slate-950 px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">
              Model Workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold">Track an isolated league template.</h1>
            <p className="mt-2 text-sm text-slate-300">
              Everything in this workspace is scoped to the selected league model only.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/models"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-100 hover:border-sky-400"
            >
              Switch Model
            </Link>
            <Link
              href={getModelPath(modelId, "matches")}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Record Match
            </Link>
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2">
          {modelNavigation.map((item) => (
            <Link
              key={item.segment}
              href={item.segment === "dashboard" ? getModelPath(modelId) : getModelPath(modelId, item.segment)}
              className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={getModelBasePath(modelId)}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
          >
            Model Home
          </Link>
        </nav>
      </section>
      {children}
    </div>
  );
}
