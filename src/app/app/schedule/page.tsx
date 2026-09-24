import { requireAppUser } from "@/lib/auth";import { AppShell } from "@/shell/AppShell";import { WeekCalendar } from "@/modules/schedule/WeekCalendar";
export default async function SchedulePage(){await requireAppUser();return <AppShell active="schedule"><WeekCalendar/></AppShell>}
