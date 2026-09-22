import "server-only";
import { Resolver } from "node:dns/promises";
export interface DomainProvider {
  ready(hostname: string): Promise<boolean>;
}
// Operator attests attachment + valid TLS in server configuration. No provider credentials in the browser.
export const manualProvider: DomainProvider = {
  async ready(host) {
    return (process.env.OMNISITE_PROVIDER_READY_HOSTS ?? "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .includes(host);
  },
};
export async function verifyDomain(host: string, token: string) {
  const resolver = new Resolver({ timeout: 2500, tries: 2 });
  // TXT only. Never fetch claimed hosts or resolve their HTTP endpoints.
  try {
    const records = await resolver.resolveTxt(`_omnisite.${host}`);
    return (
      records.length <= 100 &&
      records.some(
        (parts) => parts.join("") === `omnisite-verification=${token}`,
      )
    );
  } catch {
    return false;
  } finally {
    resolver.cancel();
  }
}
