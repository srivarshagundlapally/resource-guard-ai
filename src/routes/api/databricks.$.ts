import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Allowlist: only the endpoints this app uses are reachable through the proxy.
const ALLOWED_METHODS = new Set(["GET", "POST"]);
const ALLOWED_PATHS = [/^2\.0\/sql\/statements(\/|$)/, /^2\.0\/sql\/warehouses(\/|$)/];

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function handle({ request, params }: { request: Request; params: { _splat?: string } }) {
  // Require a signed-in app user.
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token || !sbUrl || !sbKey) return json({ error: "Unauthorized" }, 401);
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

  const host = process.env.DATABRICKS_HOST;
  const dbToken = process.env.DATABRICKS_TOKEN || process.env.DATABRICKS_API_KEY;
  const lovKey = process.env.LOVABLE_API_KEY;
  if (host ? !dbToken : !dbToken || !lovKey) {
    return json({ error: "Databricks proxy is not configured" }, 503);
  }

  const method = request.method.toUpperCase();
  let normalized = "";
  try {
    normalized = decodeURIComponent(params._splat ?? "").replace(/\/+/g, "/").replace(/^\//, "");
  } catch {
    normalized = "";
  }
  if (
    !ALLOWED_METHODS.has(method) ||
    !normalized ||
    normalized.includes("..") ||
    normalized.includes("%") ||
    !ALLOWED_PATHS.some((p) => p.test(normalized))
  ) {
    return json({ error: "path not allowed" }, 403);
  }

  const search = new URL(request.url).search;
  let target: string;
  let reqHeaders: Record<string, string>;
  if (host) {
    const h = /^https?:\/\//.test(host) ? host : `https://${host}`;
    target = `${h.replace(/\/$/, "")}/api/${normalized}${search}`;
    reqHeaders = { Authorization: `Bearer ${dbToken}`, "Content-Type": "application/json" };
  } else {
    const base = process.env.CONNECTOR_GATEWAY_BASE_URL ?? "https://connector-gateway.lovable.dev";
    target = `${base.replace(/\/$/, "")}/databricks/${normalized}${search}`;
    reqHeaders = {
      Authorization: `Bearer ${lovKey}`,
      "X-Connection-Api-Key": dbToken!,
      "Content-Type": "application/json",
    };
  }
  const upstream = await fetch(target, {
    method,
    headers,
    body: method === "GET" ? undefined : await request.arrayBuffer(),
  });
  if (!upstream.ok) {
    const text = await upstream.text();
    console.error(`Databricks gateway failed [${upstream.status}]: ${text}`);
    return new Response(text, { status: upstream.status, headers: { "content-type": "application/json" } });
  }
  const headers = new Headers(upstream.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  return new Response(upstream.body, { status: upstream.status, headers });
}

export const Route = createFileRoute("/api/databricks/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
