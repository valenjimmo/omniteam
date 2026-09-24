type CoverageSlot = { id: string; title: string; capacity: number; event: { title: string } | null; job_signups: { status: string }[] };

export function CoveragePage({ slots }: { slots: CoverageSlot[] }) {
  const filled = slots.reduce((sum, slot) => sum + slot.job_signups.filter((signup) => signup.status === "claimed").length, 0);
  const capacity = slots.reduce((sum, slot) => sum + slot.capacity, 0);
  const percent = capacity ? Math.round(filled / capacity * 100) : 0;
  return <section className="oa-coverage"><header><p className="oa-eyebrow">OMNIVOLUNTEER</p><h1>Coverage</h1><p>{filled} of {capacity} positions filled · {percent}%</p></header><div className="oa-credit-bar"><span style={{width:`${percent}%`}}/></div><div className="oa-coverage-list">{slots.map((slot) => { const count=slot.job_signups.filter((signup)=>signup.status==="claimed").length; const pct=Math.round(count/slot.capacity*100); return <article key={slot.id}><div><small>{slot.event?.title ?? "Event"}</small><h2>{slot.title}</h2></div><strong>{count}/{slot.capacity}</strong><span>{pct}%</span></article>; })}</div></section>;
}
