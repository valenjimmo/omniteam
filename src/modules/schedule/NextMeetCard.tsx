import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
export function NextMeetCard(){return <article className="oa-next-meet"><div className="oa-next-meet-icon"><CalendarDays/></div><div><p className="oa-eyebrow">NEXT MEET · OCT 10</p><h2>Fall Splash Invitational</h2><p>Commit by Oct 2 · Bay City Aquatic Center</p><div className="oa-kid-status"><span><b>Maya</b> Attending</span><span className="pending"><b>Theo</b> Undeclared</span></div></div><Link href="/app/events/16000000-0000-0000-0000-000000000001?action=commit" aria-label="Open Fall Splash Invitational"><ChevronRight/></Link></article>}

