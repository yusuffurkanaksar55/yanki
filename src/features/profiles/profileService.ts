import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database, Tables } from "../../types/supabase";

export type UserProfile = Pick<
  Tables<"user_profiles">,
  "user_id" | "email" | "display_name" | "onboarding_status"
>;

export type ProfileService = {
  readonly getOwnProfile: (userId: string) => Promise<UserProfile | null>;
};

export type ProfileServiceErrorCode = "PROFILE_READ_FAILED";

export class ProfileServiceError extends Error {
  constructor(
    readonly code: ProfileServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "ProfileServiceError";
  }
}

let cachedProfileService: ProfileService | null = null;

export const browserProfileService: ProfileService = {
  getOwnProfile: (userId) => getDefaultProfileService().getOwnProfile(userId)
};

export function createSupabaseProfileService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): ProfileService {
  return {
    async getOwnProfile(userId) {
      const { data, error } = await client
        .from("user_profiles")
        .select("user_id,email,display_name,onboarding_status")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw new ProfileServiceError("PROFILE_READ_FAILED", {
          code: error.code,
          message: error.message
        });
      }

      return data;
    }
  };
}

function getDefaultProfileService(): ProfileService {
  if (!cachedProfileService) {
    cachedProfileService = createSupabaseProfileService();
  }

  return cachedProfileService;
}
