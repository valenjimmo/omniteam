import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export async function requireAppUser(admin = false) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (process.env.NODE_ENV === "development") return null;
    redirect("/login");
  }
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  if (admin) {
    const { data } = await db.from("memberships").select("id").eq("profile_id", user.id).eq("status", "active").in("role", ["team_admin", "volunteer_coord"]).limit(1);
    if (!data?.length && process.env.NODE_ENV !== "development") redirect("/app");
  }
  return user;
}
