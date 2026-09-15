import {describe,expect,it} from "vitest";
import {OMNITEAM_MODULES,visibleModuleKeys} from "./modules";
describe("entitlement-aware module navigation",()=>{
 it("uses the canonical eight-module registry",()=>expect(OMNITEAM_MODULES).toHaveLength(8));
 it("shows a team owner only purchased modules",()=>expect(visibleModuleKeys(["omnisite"],"OWNER",[])).toEqual(["omnisite"]));
 it("requires both purchase and delegated permission for staff",()=>expect(visibleModuleKeys(["omnisite"],"ADMIN",["omnisite","omniathlete"])).toEqual(["omnisite"]));
});
