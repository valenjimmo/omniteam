// Explicit maintenance utility. Preview by default; pass --delete to remove files.
import { createClient } from '@supabase/supabase-js';
const args=process.argv.slice(2);
const get=(flag)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:undefined};
const teamId=get('--team-id'),projectRef=get('--project-ref'),deleting=args.includes('--delete');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!teamId || !/^[0-9a-f-]{36}$/i.test(teamId) || !projectRef || !url || !key){
 console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/scripts/cleanup_omnisite_assets.mjs --team-id UUID --project-ref REF [--delete]');process.exit(2);
}
const host=new URL(url).hostname;
if(host!==`${projectRef}.supabase.co`){console.error('Project reference does not match Supabase URL.');process.exit(2)}
const client=createClient(url,key,{auth:{persistSession:false}});
const paths=[];
for(let offset=0;;offset+=1000){
 const {data,error}=await client.storage.from('omnisite-assets').list(teamId,{limit:1000,offset});
 if(error)throw error;
 for(const item of data??[]) if(item.id)paths.push(`${teamId}/${item.name}`);
 if((data??[]).length<1000)break;
}
console.log(`${paths.length} OmniSite asset(s) for team ${teamId} in ${projectRef}.`);
if(!deleting){console.log('Preview only. Add --delete to remove these assets via the Storage API.');process.exit(0)}
for(let i=0;i<paths.length;i+=1000){
 const {error}=await client.storage.from('omnisite-assets').remove(paths.slice(i,i+1000));
 if(error)throw error;
}
console.log(`Removed ${paths.length} asset(s). Run the relevant SQL maintenance script only after verifying this result.`);
