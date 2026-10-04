"use client";

import { useSyncExternalStore } from "react";

type ToastTone = "success" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone; leaving: boolean };

const VISIBLE_MS = 2400;
const EXIT_MS = 180;
const EMPTY: ToastItem[] = [];

// Module-level store, so any component can call toast() without a provider.
let items: ToastItem[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toast(message: string, tone: ToastTone = "success") {
  const id = nextId++;
  items = [...items, { id, message, tone, leaving: false }].slice(-3);
  emit();
  window.setTimeout(() => {
    items = items.map((item) => (item.id === id ? { ...item, leaving: true } : item));
    emit();
    window.setTimeout(() => {
      items = items.filter((item) => item.id !== id);
      emit();
    }, EXIT_MS);
  }, VISIBLE_MS);
}

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`ui-toast inline-flex items-center gap-2 rounded-full py-2 pl-2.5 pr-4 text-[12px] font-medium ${
            item.tone === "error" ? "btn-danger" : "btn-ink"
          } ${item.leaving ? "ui-toast-leave" : ""}`}
        >
          <span
            aria-hidden="true"
            className={`grid size-4 place-items-center rounded-full ${item.tone === "error" ? "bg-white/20" : "bg-white/15"}`}
          >
            {item.tone === "error" ? (
              <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
                <path d="M6 3.2v3.3M6 8.6v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
                <path d="m3.2 6.2 1.8 1.8 3.8-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          {item.message}
        </div>
      ))}
    </div>
  );
}
