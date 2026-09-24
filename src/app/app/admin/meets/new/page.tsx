import { requireAppUser } from "@/lib/auth";import { AppShell } from "@/shell/AppShell";import { MeetPublishForm } from "@/modules/schedule/MeetPublishForm";
export default async function NewMeetPage(){await requireAppUser(true);return <AppShell admin active="schedule"><section className="oa-form-page"><p className="oa-eyebrow">OMNISCHEDULE · COACH TOOLS</p><h1>Publish a meet</h1><p>Add both sessions and the family commitment deadline to the team calendar.</p><MeetPublishForm/></section></AppShell>}

