import { AppShell } from "@/shell/AppShell"; import { WeekCalendar } from "@/modules/schedule/WeekCalendar";import { NextMeetCard } from "@/modules/schedule/NextMeetCard";
import { requireAppUser } from "@/lib/auth";
export default async function FamilyHome(){await requireAppUser();return <AppShell><section className="oa-home-head"><p className="oa-eyebrow">THIS WEEK</p><h1>Good morning, Alex</h1><div className="oa-athletes"><span>M</span><strong>Maya</strong><span>T</span><strong>Theo</strong></div></section><NextMeetCard/><WeekCalendar/></AppShell>}
