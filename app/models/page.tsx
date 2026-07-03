import Link from "next/link";
import { connection } from "next/server";

import { createModel, deleteModel, renameModel } from "@/app/actions";
import { AdminAuthSubmitButton } from "@/components/admin-auth-submit-button";
import { DatabaseNotice } from "@/components/database-notice";
import { SubmitButton } from "@/components/submit-button";
import { getDatabaseErrorMessage } from "@/lib/database";
import { getModelPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

type ModelsPageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function ModelsPage({ searchParams }: ModelsPageProps) {
  await connection();

  const params = await searchParams;
  let dbError: string | null = null;
  let models: Awaited<
    ReturnType<
      typeof prisma.model.findMany<{
        include: {
          _count: {
            select: {
              players: true;
              matches: true;
            };
          };
        };
      }>
    >
  > = [];

  try {
    models = await prisma.model.findMany({
      include: {
        _count: {
          select: {
            players: true,
            matches: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    });
  } catch (error) {
    dbError = getDatabaseErrorMessage(error);
  }

  return (
    <div className="grid gap-6">
      {dbError ? <DatabaseNotice message={dbError} /> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              League Models
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Select League Model</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Open an existing model to continue, or create a new one below.
            </p>
          </div>
          <p className="text-sm text-slate-500">{models.length} models available</p>
        </div>

        {params.success ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {params.success}
          </p>
        ) : null}

        {params.error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {params.error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4">
          {models.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No league models exist yet. Create your first model to start tracking players and
              scores.
            </div>
          ) : (
            models.map((model) => (
              <article
                key={model.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-slate-950">{model.name}</h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {model._count.players} players, {model._count.matches} matches
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Updated {new Date(model.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={getModelPath(model.id)}
                      className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                    >
                      Open Model
                    </Link>
                  </div>
                </div>

                <footer className="border-t border-slate-200 bg-white/70 p-4">
                  <div className="flex flex-col gap-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                      Model Actions
                    </p>
                    <form action={renameModel} className="flex flex-col gap-3 sm:flex-row">
                      <input type="hidden" name="modelId" value={model.id} />
                      <input type="hidden" name="adminUsername" value="" />
                      <input
                        name="name"
                        type="text"
                        defaultValue={model.name}
                        required
                        maxLength={50}
                        className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                      />
                      <div className="hidden">
                        <SubmitButton label="Rename Model" pendingLabel="Saving..." />
                      </div>
                      <AdminAuthSubmitButton
                        label="Rename Model"
                        className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                      />
                    </form>

                    <div className="flex justify-end">
                      <form action={deleteModel}>
                        <input type="hidden" name="modelId" value={model.id} />
                        <input type="hidden" name="adminUsername" value="" />
                        <AdminAuthSubmitButton
                          label="Delete Model"
                          confirmMessage={`Delete ${model.name} and all of its players and matches?`}
                          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                        />
                      </form>
                    </div>
                  </div>
                </footer>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Create Model
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">Add a New League Model</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create an independent league with its own players, matches, table, and statistics.
        </p>

        <form action={createModel} className="mt-6 space-y-4">
          <div>
            <label htmlFor="model-name" className="mb-2 block text-sm font-medium text-slate-700">
              New Model Name
            </label>
            <input
              id="model-name"
              name="name"
              type="text"
              placeholder="Ramadan Tournament"
              required
              maxLength={50}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500"
            />
          </div>
          <SubmitButton
            label="Create New Model"
            pendingLabel="Creating model..."
            className="w-full sm:w-auto"
          />
        </form>
      </section>
    </div>
  );
}
