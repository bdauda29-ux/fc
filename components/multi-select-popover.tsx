"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type MultiSelectPopoverProps = {
  name: string;
  label: string;
  options: Option[];
  defaultValue?: string[];
  placeholder?: string;
};

export function MultiSelectPopover({
  name,
  label,
  options,
  defaultValue = [],
  placeholder = "Select…",
}: MultiSelectPopoverProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>(defaultValue);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handle = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((option) => [option.value, option.label]));
    return selectedValues.map((value) => map.get(value)).filter((value): value is string => Boolean(value));
  }, [options, selectedValues]);

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(trimmed));
  }, [options, query]);

  function toggleValue(value: string) {
    setSelectedValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return [...next];
    });
  }

  function clearAll() {
    setSelectedValues([]);
  }

  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`;

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      {selectedValues.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      <button
        id={inputId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-900 shadow-sm transition focus:border-sky-500"
      >
        <span className={selectedValues.length === 0 ? "text-slate-400" : ""}>{summary}</span>
        <span className="text-xs text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {selectedLabels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedLabels.slice(0, 6).map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {item}
            </span>
          ))}
          {selectedLabels.length > 6 ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              +{selectedLabels.length - 6} more
            </span>
          ) : null}
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
          >
            Clear
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-3">
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500"
            />
          </div>
          <div className="max-h-64 overflow-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="rounded-xl px-3 py-2 text-sm text-slate-500">No matches</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selectedSet.has(option.value)}
                  onClick={() => toggleValue(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                    selectedSet.has(option.value) ? "bg-sky-50 text-sky-900" : "text-slate-900"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="text-xs">{selectedSet.has(option.value) ? "✓" : ""}</span>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

