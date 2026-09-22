import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniTeam | Everything your team needs, together",
  description: "One connected home for your team, from the pool deck to meet day.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

export const dynamic = "force-dynamic";
