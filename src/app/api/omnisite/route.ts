import { z } from "zod";
import {
  snapshotSchema,
  slugSchema,
  templateSchema,
} from "@/modules/omnisite/model";
import { claimHostname } from "@/modules/omnisite/hostname";
import {
  apiError,
  createSupabaseAdminClient,
  readJson,
  siteAccess,
} from "@/modules/omnisite/server/access";
import {
  manualProvider,
  verifyDomain,
} from "@/modules/omnisite/server/domains";
import { requirePlatformOwner } from "@/lib/supabase/admin-auth";
const id = z.string().uuid();
const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      teamId: id,
      templateId: id,
      slug: slugSchema,
      name: z.string().trim().min(1).max(120),
    })
    .strict(),
  z
    .object({
      action: z.literal("save"),
      teamId: id,
      siteId: id,
      revision: z.number().int().positive(),
      content: snapshotSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("publish"),
      teamId: id,
      siteId: id,
      revision: z.number().int().positive(),
      version: z.number().int().nonnegative(),
      sourceVersion: z.number().int().positive().nullable().default(null),
    })
    .strict(),
  z
    .object({
      action: z.literal("enabled"),
      teamId: id,
      siteId: id,
      enabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("domain"),
      teamId: id,
      siteId: id,
      operation: z.enum([
        "claim",
        "verify",
        "activate",
        "primary",
        "detach",
        "renew",
      ]),
      domainId: id.optional(),
      hostname: z.string().max(253).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("template"),
      templateId: id.nullable(),
      version: z.number().int().nonnegative(),
      content: templateSchema,
    })
    .strict(),
]);
export async function POST(request: Request) {
  try {
    const input = command.parse(await readJson(request));
    if (input.action === "template") {
      if (
        !request.headers.has("authorization") &&
        request.headers.get("origin") !== new URL(request.url).origin
      )
        throw new Error("Access denied");
      const { client } = await requirePlatformOwner(
        request.headers.get("authorization"),
      );
      const r = await client.rpc("save_site_template", {
        template_id: input.templateId,
        expected_version: input.version,
        content: input.content,
      });
      if (r.error) throw r.error;
      return Response.json({ data: r.data });
    }
    const { client, userId } = await siteAccess(
      request,
      input.teamId,
      true,
      input.action === "domain" ? "dns" : "write",
    );
    if (input.action === "domain") {
      const admin = createSupabaseAdminClient();
      const params: {
        actor: string;
        t: string;
        s: string;
        operation: string;
        domain_id?: string;
        requested_host?: string;
        display_host?: string;
        proof_token?: string;
        provider_ready?: boolean;
      } = {
        actor: userId,
        t: input.teamId,
        s: input.siteId,
        operation: input.operation,
        domain_id: input.domainId,
      };
      if (input.operation === "claim") {
        params.requested_host = claimHostname(
          input.hostname ?? "",
          process.env.OMNISITE_ROOT_DOMAIN,
          (process.env.OMNISITE_APP_HOSTS ?? "").split(","),
        );
        params.display_host = input.hostname;
      } else {
        const { data: d, error } = await client
          .from("site_domains")
          .select("*")
          .eq("team_id", input.teamId)
          .eq("site_id", input.siteId)
          .eq("id", input.domainId ?? "")
          .single();
        if (error || !d) throw new Error("Domain unavailable");
        if (input.operation === "verify" || input.operation === "activate") {
          const verified = await verifyDomain(d.hostname, d.verification_token);
          params.operation = verified ? "verify" : "failed";
          params.proof_token = d.verification_token;
          params.provider_ready = await manualProvider.ready(d.hostname);
          const r = await admin.rpc("os_domain_operation", params);
          if (r.error) throw r.error;
          if (!verified)
            return Response.json({
              data: "DNS did not match yet. Check the TXT record and retry after propagation.",
            });
          if (input.operation === "verify")
            return Response.json({
              data: "Ownership verified. Hosting configuration is checked separately.",
            });
          params.operation = "activate";
        }
      }
      const r = await admin.rpc("os_domain_operation", params);
      if (r.error) throw r.error;
      return Response.json({ data: r.data });
    }
    const r =
      input.action === "create"
        ? await client.rpc("create_team_site", {
            target_team_id: input.teamId,
            selected_template_id: input.templateId,
            requested_slug: input.slug,
            requested_name: input.name,
          })
        : input.action === "save"
          ? await client.rpc("save_site_draft", {
              target_team_id: input.teamId,
              target_site_id: input.siteId,
              expected_revision: input.revision,
              content: input.content,
            })
          : input.action === "enabled"
            ? await client.rpc("set_site_enabled", {
                target_team_id: input.teamId,
                target_site_id: input.siteId,
                active: input.enabled,
              })
            : await client.rpc("publish_site_revision", {
                target_team_id: input.teamId,
                target_site_id: input.siteId,
                expected_revision: input.revision,
                expected_version: input.version,
                source_version: input.sourceVersion,
              });
    if (r.error) throw new Error(r.error.message);
    return Response.json(
      { data: r.data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
