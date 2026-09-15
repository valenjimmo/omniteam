import { describe, expect, it } from "vitest";
import { contrastText, logoPublicUrl, pageSchema, snapshotSchema, DEFAULT_THEME } from "./model";
const home={slug:"home",title:"Home",seoDescription:"",navOrder:0,visible:true,sections:[{type:"hero",heading:"Welcome",text:"Swim together"}]};
describe("OmniSite publication schema",()=>{
 it("accepts a bounded public page and chooses readable text",()=>{
  expect(pageSchema.safeParse(home).success).toBe(true);
  expect(contrastText("#000000")).toBe("#ffffff");
  expect(contrastText("#ffffff")).toBe("#000000");
 });
 it("rejects executable URLs and unrecognized sections",()=>{
  expect(pageSchema.safeParse({...home,sections:[{type:"cta",heading:"Click",label:"Open",href:"javascript:alert(1)"}]}).success).toBe(false);
  expect(pageSchema.safeParse({...home,sections:[{type:"html",markup:"<script>alert(1)</script>"}]}).success).toBe(false);
 });
 it("rejects a malformed publication before the public renderer sees it",()=>{
  const base={schemaVersion:1,teamId:"00000000-0000-4000-8000-000000000001",siteId:"00000000-0000-4000-8000-000000000002",slug:"team",siteName:"Team",layout:"classic",theme:DEFAULT_THEME,logoPath:null,pages:[home]};
  expect(snapshotSchema.safeParse(base).success).toBe(true);
  expect(snapshotSchema.safeParse({...base,theme:{...DEFAULT_THEME,primary:"red"}}).success).toBe(false);
 });
 it("namespaces published logos by team path",()=>{
  expect(logoPublicUrl("https://example.supabase.co","team-id/logo.png")).toContain("/omnisite-assets/team-id/logo.png");
 });
});
