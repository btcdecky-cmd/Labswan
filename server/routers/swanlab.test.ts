import { describe, expect, it } from "vitest";
import { buildAssistantFallback } from "../services/integrationStatus";

describe("SwanLab integration boundaries", () => {
  it("does not invent a connected Solana service when explaining RPC setup", () => {
    const response = buildAssistantFallback("How do I set up Solana RPC status?");
    expect(response).toContain("HELIUS_RPC_URL");
    expect(response).toContain("disabled");
  });

  it("keeps database secrets out of client-facing guidance", () => {
    const response = buildAssistantFallback("Where is my Supabase database connection?");
    expect(response).toContain("server-side");
    expect(response).toContain("never render connection secrets");
  });
});
