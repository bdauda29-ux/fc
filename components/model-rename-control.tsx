"use client";

import { useId, useMemo, useState } from "react";

import { renameModel } from "@/app/actions";
import { AdminAuthSubmitButton } from "@/components/admin-auth-submit-button";
import { SubmitButton } from "@/components/submit-button";

type ModelRenameControlProps = {
  modelId: string;
  modelName: string;
};

export function ModelRenameControl({ modelId, modelName }: ModelRenameControlProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(modelName);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const canSubmit = trimmedName.length >= 2 && trimmedName.length <= 50;

  return (
    <>
      <button
        type="button"
        title="Rename model"
        aria-label="Rename model"
        onClick={() => {
          setName(modelName);
          setOpen(true);
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
      >
        ✎
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Rename</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Rename League Model</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Choose a new name for <span className="font-medium text-slate-700">{modelName}</span>.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                title="Close"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form action={renameModel} className="mt-6 space-y-4">
              <input type="hidden" name="modelId" value={modelId} />
              <input type="hidden" name="adminUsername" value="" />
              <div>
                <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-slate-700">
                  Model Name
                </label>
                <input
                  id={inputId}
                  name="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={50}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
                >
                  Cancel
                </button>
                <div className="hidden">
                  <SubmitButton label="Rename Model" pendingLabel="Saving..." />
                </div>
                <AdminAuthSubmitButton
                  label="Rename Model"
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                    canSubmit ? "bg-sky-600 hover:bg-sky-500" : "cursor-not-allowed bg-sky-300"
                  }`}
                  disabled={!canSubmit}
                  title="Rename model"
                  ariaLabel="Rename model"
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
