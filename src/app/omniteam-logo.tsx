export function OmniTeamLogo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return <span className={`omni-logo ${light ? "omni-logo-light" : ""} ${compact ? "omni-logo-compact" : ""}`}>
    <svg className="omni-logo-symbol" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 5.5 55 18.75v26.5L32 58.5 9 45.25v-26.5L32 5.5Z" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" /><path d="M20 25.5 32 18l12 7.5v13L32 46l-12-7.5v-13Z" fill="currentColor" /><path d="M32 18v28M20 25.5l24 13M44 25.5 20 38.5" stroke="var(--logo-cut, #102b32)" strokeWidth="3" strokeLinejoin="round" /><circle cx="32" cy="5.5" r="4" fill="currentColor" /><circle cx="55" cy="18.75" r="4" fill="currentColor" /><circle cx="55" cy="45.25" r="4" fill="currentColor" /><circle cx="32" cy="58.5" r="4" fill="currentColor" /><circle cx="9" cy="45.25" r="4" fill="currentColor" /><circle cx="9" cy="18.75" r="4" fill="currentColor" /></svg>
    <span className="omni-logo-type">Omni<span>Team</span></span>
  </span>;
}
