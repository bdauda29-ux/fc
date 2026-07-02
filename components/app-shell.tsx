import Link from "next/link";
import { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/matches", label: "Add Match" },
  { href: "/history", label: "Match History" },
  { href: "/table", label: "League Table" },
  { href: "/head-to-head", label: "Head-to-Head" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/" className="text-2xl font-bold tracking-tight">
                Football League Tracker
              </Link>
              <p className="mt-1 text-sm text-slate-300">
                Add players, record results, and track a live table generated from match data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/players"
                className="rounded-full bg-white/10 px-4 py-2 font-medium hover:bg-white/20"
              >
                Add Player
              </Link>
              <Link
                href="/matches"
                className="rounded-full bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400"
              >
                Record Match
              </Link>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
