import Link from "next/link";

export default function AuthErrorPage() {
  return <main className="registration-page"><section className="registration-card">
    <h1>Sign-in link could not be completed</h1>
    <p className="registration-intro">The link may have expired. Return to your team registration page and sign in or request another verification email.</p>
    <Link href="/">OmniTeam home</Link>
  </section></main>;
}
