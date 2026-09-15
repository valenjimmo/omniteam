import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ openapi: "3.1.0", info: { title: "OmniTeam Administration API", version: "0.1.0",
    description: "Platform-owner test administration. Destructive operations work only on a database explicitly marked as a test project." },
    paths: { "/api/admin/purge": {
      get: { summary: "Preview test-project reset", security: [{ bearerAuth: [] }], parameters: [{ name: "projectRef", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "Reset preview" }, "401": { description: "Authentication required" }, "403": { description: "Platform owner required" } } },
      delete: { summary: "Delete all test client data", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: false, required: ["projectRef","confirmation"], properties: { projectRef: { type: "string" }, confirmation: { type: "string", const: "DELETE ALL TEST CLIENT DATA" } } } } } }, responses: { "200": { description: "Reset completed" }, "400": { description: "Guard rejected reset" }, "401": { description: "Authentication required" }, "403": { description: "Platform owner required" } } }
    } }, components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Supabase access token" } } } });
}
