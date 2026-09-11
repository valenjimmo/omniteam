import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniAttendance | SSF Aquatics",
  description: "Pool-deck attendance for OmniTeam",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}