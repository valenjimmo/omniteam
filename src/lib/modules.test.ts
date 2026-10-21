import {describe,expect,it} from "vitest";
import {OMNITEAM_MODULES,visibleModuleKeys} from "./modules";
describe("entitlement-aware module navigation",()=>{
 it("uses the canonical seven-product registry and excludes shared payments",()=>{
  expect(OMNITEAM_MODULES).toHaveLength(7);
  expect(OMNITEAM_MODULES.map(module=>module.name)).not.toContain("OmniPay");
 });
 it("opens OmniAthlete in team management instead of the public marketing page",()=>{
  expect(OMNITEAM_MODULES.find(module=>module.key==="omniathlete")?.href).toBe("/team/access#registration");
 });
 it("shows a team owner only purchased modules",()=>expect(visibleModuleKeys(["omnisite"],"OWNER",[])).toEqual(["omnisite"]));
 it("requires both purchase and delegated permission for staff",()=>expect(visibleModuleKeys(["omnisite"],"ADMIN",["omnisite","omniathlete"])).toEqual(["omnisite"]));
});
