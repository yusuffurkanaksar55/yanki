import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const functionSource = await readFile(
  "supabase/functions/user-onboarding/index.ts",
  "utf8"
);
const migrationSource = await readFile(
  "supabase/migrations/20260720232000_user_invitation_acceptance_flow.sql",
  "utf8"
);
const acceptanceContextMigrationSource = await readFile(
  "supabase/migrations/20260720234500_invitation_acceptance_context_revalidation.sql",
  "utf8"
);
const administrationServiceSource = await readFile(
  "src/features/administration/userAdministrationService.ts",
  "utf8"
);
const profileServiceSource = await readFile(
  "src/features/profiles/profileService.ts",
  "utf8"
);

describe("user onboarding trusted boundary", () => {
  it("creates Supabase Auth invitations without returning raw invitation secrets", () => {
    expect(functionSource).toMatch(/auth\.admin\.inviteUserByEmail/);
    expect(functionSource).toMatch(/createServerCorrelationHash/);
    expect(functionSource).toMatch(/USER_INVITATION_CREATED/);
    expect(functionSource).not.toMatch(/action_link|hashed_token|tokenHash/);
    expect(functionSource).not.toMatch(/return jsonResponse\(\{[^}]*token/i);
  });

  it("requires authenticated server-side scope checks for administration actions", () => {
    expect(functionSource).toMatch(/auth\.getUser\(\)/);
    expect(functionSource).toMatch(/readHasActiveProfile/);
    expect(functionSource).toMatch(/readActiveRoles/);
    expect(functionSource).toMatch(/canManageOrganization/);
    expect(functionSource).toMatch(/ADMINISTRATION_SCOPE_DENIED/);
  });

  it("allows the Supabase browser SDK headers through CORS preflight", () => {
    expect(functionSource).toMatch(
      /"Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info"/
    );
  });

  it("accepts invitations through a service-role-only atomic database function", () => {
    expect(migrationSource).toMatch(
      /create or replace function public\.accept_user_invitation/
    );
    expect(migrationSource).toMatch(/security definer/);
    expect(migrationSource).toMatch(
      /revoke all on function public\.accept_user_invitation\(uuid, uuid\) from authenticated/
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.accept_user_invitation\(uuid, uuid\) to service_role/
    );
    expect(migrationSource).toMatch(/INVITATION_USER_MISMATCH/);
    expect(migrationSource).toMatch(/INVITATION_EMAIL_MISMATCH/);
    expect(acceptanceContextMigrationSource).toMatch(
      /INVITATION_CONTEXT_INACTIVE/
    );
    expect(acceptanceContextMigrationSource).toMatch(
      /INVITATION_MANAGER_INACTIVE/
    );
    expect(acceptanceContextMigrationSource).toMatch(
      /before update of accepted_at/
    );
    expect(functionSource).toMatch(/\.rpc\(\s*"accept_user_invitation"/s);
  });

  it("keeps invitation tables behind the Edge Function browser services", () => {
    expect(administrationServiceSource).toMatch(
      /functions\.invoke\("user-onboarding"/
    );
    expect(profileServiceSource).toMatch(
      /functions\.invoke\("user-onboarding"/
    );
    expect(administrationServiceSource).not.toMatch(
      /\.from\("user_invitations"\)/
    );
    expect(profileServiceSource).not.toMatch(/\.from\("user_invitations"\)/);
    expect(administrationServiceSource).not.toMatch(
      /SUPABASE_SERVICE_ROLE_KEY/
    );
  });

  it("stores only identity-domain onboarding metadata", () => {
    expect(migrationSource).not.toMatch(
      /add column\s+(score|comment|lesson|ciphertext|encrypted_payload|submission_content)\b/i
    );
    expect(migrationSource).toMatch(/token_hash/);
    expect(migrationSource).not.toMatch(/raw_token|invitation_secret/);
  });
});
