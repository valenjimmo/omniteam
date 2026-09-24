import Link from "next/link";
import { Bell, CalendarDays, HeartHandshake, Home, MessageCircle, UserRound } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";

const tabs = [{ label:"Home",href:"/app",icon:Home },{ label:"Schedule",href:"/app",icon:CalendarDays },{ label:"Volunteer",href:"/app",icon:HeartHandshake },{ label:"Connect",href:"/app",icon:MessageCircle },{ label:"Account",href:"/app",icon:UserRound }];
export function AppShell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  return <div className="oa-app"><header><Link href="/app" className="oa-wordmark">Omni<span>Athlete</span></Link><div><span className="oa-team">Harbor Sharks</span>{process.env.NODE_ENV === "development" && <RoleSwitcher />}<Bell size={20}/></div></header>
    <main>{children}</main><nav aria-label="App navigation">{tabs.map(({label,href,icon:Icon},i)=><Link href={href} key={label} className={!admin&&i===0?"active":""}><Icon size={21}/><span>{label}</span></Link>)}</nav>
  </div>;
}
