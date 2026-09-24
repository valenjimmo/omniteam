import { requireAppUser } from "@/lib/auth";import { AppShell } from "@/shell/AppShell";import { AttendanceSheet } from "@/modules/schedule/AttendanceSheet";
export default async function AttendancePage(){await requireAppUser(true);return <AppShell admin active="schedule"><AttendanceSheet/></AppShell>}
