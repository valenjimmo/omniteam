import Link from "next/link";import { Megaphone } from "lucide-react";import type { Announcement } from "./types";
export function LatestUnreadCard({announcement}:{announcement:Announcement}){return <Link className="oa-latest-unread" href={`/app/connect/${announcement.id}`}><Megaphone/><span><small>NEW ANNOUNCEMENT</small><b>{announcement.title}</b><p>{announcement.body}</p></span></Link>}
