import type { ReactNode } from "react";

export type EventTab = { key: string; label: string; enabled: boolean; content?: ReactNode };
export type HomeWidget = { key: string; enabled: boolean; content: ReactNode };

export const eventTabs = (registrations: EventTab[]) => [
  { key: "details", label: "Details", enabled: true },
  { key: "commit", label: "Attend", enabled: true },
  ...registrations,
  { key: "thread", label: "Thread", enabled: true },
].filter((tab) => tab.enabled);

export const homeWidgets = (registrations: HomeWidget[]) =>
  registrations.filter((widget) => widget.enabled);
