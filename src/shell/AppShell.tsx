import Link from "next/link";
import { Bell, CalendarDays, HeartHandshake, Home, MessageCircle, UserRound } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";

const tabs = [{ key:"home",label:"Home",href:"/app",icon:Home },{ key:"schedule",label:"Schedule",href:"/app/schedule",icon:CalendarDays },{ key:"volunteer",label:"Volunteer",href:"/app",icon:HeartHandshake },{ key:"connect",label:"Connect",href:"/app",icon:MessageCircle },{ key:"account",label:"Account",href:"/app",icon:UserRound }];
export function AppShell({ children, admin = false, active = "home" }: { children: React.ReactNode; admin?: boolean; active?: string }) {
  return <div className="oa-app"><header><Link href="/app" className="oa-wordmark">Omni<span>Athlete</span></Link><div><span className="oa-team">Harbor Sharks</span>{process.env.NODE_ENV === "development" && <RoleSwitcher />}<Bell size={20}/></div></header>
    <main>{children}</main><nav aria-label="App navigation">{tabs.map(({key,label,href,icon:Icon})=><Link href={href} key={label} className={key===active?"active":""}><Icon size={21}/><span>{label}</span></Link>)}</nav>
  </div>;
}
