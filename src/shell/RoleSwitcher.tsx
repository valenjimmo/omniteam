"use client";
import { usePathname, useRouter } from "next/navigation";

export function RoleSwitcher() {
  const router = useRouter(); const path = usePathname();
  const admin = path.startsWith("/app/admin");
  return <label className="oa-role">Demo view<select value={admin ? "admin" : "family"} onChange={e => router.push(e.target.value === "admin" ? "/app/admin/practices/new" : "/app/schedule")}><option value="family">Family</option><option value="admin">Coach</option></select></label>;
}
