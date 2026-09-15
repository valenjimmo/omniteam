import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PlatformConsole from "./console-client";
export const dynamic="force-dynamic";
export default async function PlatformPage(){
 const client=await createSupabaseServerClient();const {data:auth}=await client.auth.getUser();if(!auth.user)redirect("/platform/login");
 const {data:isOwner}=await client.rpc("is_platform_owner");if(!isOwner)redirect("/platform/login?error=owner_access_required");
 return <PlatformConsole/>;
}
