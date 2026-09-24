"use client";
import { usePathname, useRouter } from "next/navigation";

export function RoleSwitcher() {
  const router = useRouter(); const path = usePathname();
  const admin = path.startsWith("/app/admin");
  return <label className="oa-role">Demo view<select value={admin ? "admin" : "family"} onChange={e => router.push(e.target.value === "admin" ? "/app/admin/requests" : "/app")}><option value="family">Family</option><option value="admin">Admin</option></select></label>;
}
