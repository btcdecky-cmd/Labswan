import { createSolanaRpc } from "@solana/kit";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type IntegrationState = "ready" | "pending";

export type IntegrationStatus = {
  id: "supabase" | "helius" | "solana-kit" | "notifications";
  label: string;
  state: IntegrationState;
  detail: string;
};

/**
 * Creates the privileged Supabase client only inside the server process.
 * Browser code must never receive the service-role key.
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Keeps the Solana transport centralized so RPC URLs cannot leak into UI code.
 */
export function getSolanaRpcClient() {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  if (!rpcUrl) return null;
  return createSolanaRpc(rpcUrl as `${string}://${string}`);
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  return [
    {
      id: "supabase",
      label: "Supabase",
      state: getSupabaseServiceClient() ? "ready" : "pending",
      detail: getSupabaseServiceClient() ? "Server-side tenant data service is configured." : "SUPABASE_URL and service credentials are required.",
    },
    {
      id: "helius",
      label: "Helius",
      state: getSolanaRpcClient() ? "ready" : "pending",
      detail: getSolanaRpcClient() ? "Centralized RPC transport is configured." : "HELIUS_RPC_URL is required before on-chain requests can run.",
    },
    { id: "solana-kit", label: "Solana Kit", state: "ready", detail: "Modern Solana application boundary is installed." },
    { id: "notifications", label: "Notifications", state: "ready", detail: "Owner delivery helper is available; a deployed health policy enables periodic delivery." },
  ];
}

export function buildAssistantFallback(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("solana") || normalized.includes("rpc") || normalized.includes("wallet")) {
    return "Start by configuring an organization project, then add a server-side `HELIUS_RPC_URL` and select a Solana cluster. Wallet connectivity and request visibility should remain disabled until that trusted RPC source is verified.";
  }
  if (normalized.includes("database") || normalized.includes("supabase")) {
    return "Database state is pending until a workspace has a protected connection source. Store privileged Supabase or database credentials server-side, scope resource metadata to the organization, and never render connection secrets into the client.";
  }
  if (normalized.includes("key") || normalized.includes("webhook")) {
    return "Create credentials at the project boundary, limit them to their intended capability, record an audit event on creation or revocation, and require signed webhook delivery before trusting inbound events.";
  }
  return "SwanLab currently has no connected workspace telemetry in this session. Connect a secure workspace, configure the relevant server-side integration, then I can help interpret its registered platform state.";
}
