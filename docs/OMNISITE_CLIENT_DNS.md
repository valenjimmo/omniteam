# Connect your team's domain

Your website works at its platform address while you connect a domain. You do not
need to transfer domain registration to OmniTeam.

1. In **OmniSite → Domains**, enter the exact hostname you want visitors to use,
   such as `www.example-swim.org`, and choose **Claim domain**.
2. In your DNS provider, add the TXT record shown in OmniSite. For the example,
   the full record name is `_omnisite.www.example-swim.org`. Some DNS dashboards
   append `example-swim.org` automatically; enter `_omnisite.www` in that case.
   Copy the entire `omnisite-verification=…` value without changing it.
3. Wait for DNS propagation, then choose **Check TXT**. A pending result may mean
   records have not propagated yet. Keep the TXT record after verification.
4. Ask your platform administrator for the hosting provider's exact routing DNS
   values. Ownership verification does not configure hosting or HTTPS.
   - **www:** usually a CNAME using the hosting provider's exact target.
   - **Apex** (`example-swim.org`): use the provider's prescribed A/AAAA or supported
     ALIAS/ANAME record. Do not guess an IP or use a normal apex CNAME if your DNS
     provider does not support it.
   - Apex and www are separate hostnames. Claim/verify/attach both if both should
     work. Each gets its own TXT record and activation.
5. Your administrator attaches the hostname to the correct project, confirms
   routing and a valid HTTPS certificate, and records provider readiness.
6. Choose **Activate**, then **Set primary** for your preferred hostname. Other
   activated hostnames and the platform fallback redirect to that primary host.
7. Check the homepage, another page, images, HTTPS, and redirects from both apex
   and www if configured. DNS and certificates may take time to become ready.

Before selling/transferring a domain or removing hosting configuration, **Detach**
it in OmniSite. This immediately stops routing while preserving the claim for
safety. Ask support to review a detached claim before attempting to reuse it.
Use **New token** only if necessary: it invalidates the old verification and takes
that domain offline until verified and activated again.
