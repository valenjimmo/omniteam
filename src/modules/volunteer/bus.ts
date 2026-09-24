"use client";

export function emit(name: "job.claimed" | "job.released", detail: Record<string, string>) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
