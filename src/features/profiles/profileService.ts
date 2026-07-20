import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database, Tables } from "../../types/supabase";

export type UserProfile = Pick<
  Tables<"user_profiles">,
  "user_id" | "email" | "display_name" | "onboarding_status"
>;

export type ProfileService = {
  readonly acceptOwnInvitation: () => Promise<UserProfile>;
  readonly getOwnProfile: (userId: string) => Promise<UserProfile | null>;
};

export type ProfileServiceErrorCode =
  | "PROFILE_READ_FAILED"
  | "PROFILE_INVITATION_ACCEPT_FAILED";

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
  acceptOwnInvitation: () =>
    getDefaultProfileService().acceptOwnInvitation(),
  getOwnProfile: (userId) => getDefaultProfileService().getOwnProfile(userId)
};

export function createSupabaseProfileService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): ProfileService {
  return {
    async acceptOwnInvitation() {
      const { data: sessionData, error: sessionError } =
        await client.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new ProfileServiceError("PROFILE_INVITATION_ACCEPT_FAILED", {
          message: sessionError?.message
        });
      }

      const { data, error } = await client.functions.invoke("user-onboarding", {
        body: { action: "accept_invitation" },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (error) {
        throw new ProfileServiceError("PROFILE_INVITATION_ACCEPT_FAILED", {
          message: error.message
        });
      }

      return toUserProfile(readRecord(data).profile);
    },

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

function toUserProfile(value: unknown): UserProfile {
  const record = readRecord(value);

  return {
    display_name: readNullableString(record.display_name),
    email: readString(record.email),
    onboarding_status: readString(record.onboarding_status),
    user_id: readString(record.user_id)
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}
