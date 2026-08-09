import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/supabase";
import { createSupabaseAuthService } from "./authService";

describe("authService password setup", () => {
  it("updates the password and clears only the setup metadata flag", async () => {
    const updateUser = vi.fn(async () => ({ data: {}, error: null }));
    const client = {
      auth: { updateUser }
    } as unknown as SupabaseClient<Database>;
    const service = createSupabaseAuthService(client);

    await service.updatePassword("Secure-Password-42!");

    expect(updateUser).toHaveBeenCalledWith({
      data: { requires_password_setup: false },
      password: "Secure-Password-42!"
    });
  });
});
