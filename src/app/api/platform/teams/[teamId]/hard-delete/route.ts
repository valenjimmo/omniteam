import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient, requirePlatformOwner } from "@/lib/supabase/admin-auth";
import { listSiteObjects } from "@/lib/supabase/cleanup-storage";

const idSchema=z.string().uuid();
const bodySchema=z.object({teamName:z.string().min(1).max(120),confirmation:z.literal("DELETE PERMANENTLY")}).strict();
const status=(message:string)=>/Authentication/.test(message)?401:/Platform-owner|AAL2/.test(message)?403:400;

export async function GET(request:NextRequest,{params}:{params:Promise<{teamId:string}>}){
 try{const teamId=idSchema.parse((await params).teamId);const {client}=await requirePlatformOwner(request.headers.get("authorization"));const {data,error}=await client.rpc("preview_team_hard_delete",{target_team_id:teamId});if(error)throw new Error(error.message);return NextResponse.json(data)}
 catch(error){const message=error instanceof Error?error.message:"Preview failed";return NextResponse.json({error:message},{status:status(message)})}
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{teamId:string}>}){
 try{
  const teamId=idSchema.parse((await params).teamId),input=bodySchema.parse(await request.json());
  const {client,userId}=await requirePlatformOwner(request.headers.get("authorization"));
  const {data:preview,error:previewError}=await client.rpc("preview_team_hard_delete",{target_team_id:teamId});
  if(previewError)throw new Error(previewError.message);
  if(preview?.teamName!==input.teamName)throw new Error("Exact team name does not match");
  const admin=createSupabaseAdminClient(),paths=await listSiteObjects(admin,teamId);
  for(let i=0;i<paths.length;i+=1000){const {error}=await admin.storage.from("omnisite-assets").remove(paths.slice(i,i+1000));if(error)throw error}
  if((await listSiteObjects(admin,teamId)).length)throw new Error("Storage cleanup incomplete; database deletion was not attempted");
  const {error}=await admin.rpc("delete_team_and_data",{target_team_id:teamId,expected_team_name:input.teamName,actor_user_id:userId});
  if(error)throw new Error(error.message);
  return NextResponse.json({status:"completed",removedAssets:paths.length});
 }catch(error){const message=error instanceof Error?error.message:"Deletion failed";return NextResponse.json({error:message},{status:status(message)})}
}
