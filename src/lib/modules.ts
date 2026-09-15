export const OMNITEAM_MODULES = [
  { key:"omniathlete", name:"OmniAthlete", description:"Swimmers, families, groups, and attendance", href:"/omniathlete", available:true },
  { key:"omnischedule", name:"OmniSchedule", description:"Practices, pool schedules, calendars, and events", href:"/dashboard", available:false },
  { key:"omnimeet", name:"OmniMeet", description:"Meet registration, selections, fees, and entries", href:"/dashboard", available:false },
  { key:"omnivolunteer", name:"OmniVolunteer", description:"Jobs, shifts, signups, and service hours", href:"/dashboard", available:false },
  { key:"omniconnect", name:"OmniConnect", description:"Announcements, email, SMS, and notifications", href:"/dashboard", available:false },
  { key:"omnisite", name:"OmniSite", description:"Templates, pages, branding, and publishing", href:"/omnisite", available:true },
  { key:"omniinsights", name:"OmniInsights", description:"Membership, financial, meet, and operational analytics", href:"/dashboard", available:false },
] as const;
export type ModuleKey=(typeof OMNITEAM_MODULES)[number]["key"];
export function visibleModuleKeys(purchased:ModuleKey[],role:string,permitted:ModuleKey[]){
  return role==="OWNER"?purchased:permitted.filter(key=>purchased.includes(key));
}
