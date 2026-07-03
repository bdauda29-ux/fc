import Link from "next/link";

import { createPlayer } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

type SetupModalProps = {
  modelId: string;
  title?: string;
  description?: string;
  redirectTo?: string;
  playerSetupPath?: string;
  showBackdrop?: boolean;
};

export function SetupModal({
  modelId,
  title = "Complete Setup First",
  description = "Create your first player before using the dashboard and other record screens.",
  redirectTo = "/",
  playerSetupPath = redirectTo,
  showBackdrop = true,
}: SetupModalProps) {
  return (
    <div
      className={
        showBackdrop
          ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
          : "relative z-10 flex items-center justify-center"
      }
    >
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Setup</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>

        <form action={createPlayer} className="mt-6 space-y-4">
          <input type="hidden" name="modelId" value={modelId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div>
            <label htmlFor="setup-player-name" className="mb-2 block text-sm font-medium text-slate-700">
              First Player Name
            </label>
            <input
              id="setup-player-name"
              name="name"
              type="text"
              placeholder="Enter player name"
              required
              maxLength={50}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500"
            />
          </div>
          <SubmitButton label="Create First Player" pendingLabel="Creating player..." className="w-full" />
        </form>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={playerSetupPath}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Open Player Setup
          </Link>
        </div>
      </div>
    </div>
  );
}
