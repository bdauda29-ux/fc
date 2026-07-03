import Link from "next/link";
import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/models" className="text-2xl font-bold tracking-tight">
                FIFA CHALLENGE
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/models"
                className="rounded-full bg-white/10 px-4 py-2 font-medium hover:bg-white/20"
              >
                League Models
              </Link>
              <Link
                href="/models"
                className="rounded-full bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400"
              >
                🔀 Switch Model
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
