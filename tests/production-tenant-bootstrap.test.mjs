import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  BootstrapError,
  createBootstrapFingerprint,
  readBootstrapConfiguration,
  runBootstrap
} from "../scripts/bootstrap-production-tenant.mjs";

const root = process.cwd();
const migrationSource = read(
  "supabase/migrations/20260809120000_production_tenant_bootstrap.sql"
);
const scriptSource = read("scripts/bootstrap-production-tenant.mjs");
const onboardingFunctionSource = read(
  "supabase/functions/user-onboarding/index.ts"
);
const packageJson = JSON.parse(read("package.json"));

const validEnvironment = {
  SUPABASE_SERVICE_ROLE_KEY: "server-only-test-placeholder",
  SUPABASE_URL: "http://127.0.0.1:54321",
  TENANT_BOOTSTRAP_ADMIN_DISPLAY_NAME: "First Administrator",
  TENANT_BOOTSTRAP_ADMIN_EMAIL: "FIRST.ADMIN@EXAMPLE.COM",
  TENANT_BOOTSTRAP_INITIAL_UNIT_NAME: "Administration",
  TENANT_BOOTSTRAP_INITIAL_UNIT_SLUG: "Administration",
  TENANT_BOOTSTRAP_INVITATION_EXPIRY_DAYS: "7",
  TENANT_BOOTSTRAP_ORGANIZATION_NAME: "Example Company",
  TENANT_BOOTSTRAP_ORGANIZATION_SLUG: "Example-Company",
  TENANT_BOOTSTRAP_REDIRECT_URL: "https://app.example.com",
  TENANT_BOOTSTRAP_REQUEST_ID: "91111111-1111-4111-8111-111111111111"
};

describe("production tenant bootstrap", () => {
  it("normalizes stable identifiers and creates a deterministic fingerprint", () => {
    const configuration = readBootstrapConfiguration(validEnvironment);

    expect(configuration.administratorEmail).toBe("first.admin@example.com");
    expect(configuration.organizationSlug).toBe("example-company");
    expect(configuration.initialUnitSlug).toBe("administration");
    expect(configuration.requestFingerprint).toBe(
      createBootstrapFingerprint(configuration)
    );
    expect(configuration.requestFingerprint).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("rejects invalid request and invitation bounds before network access", () => {
    expect(() => readBootstrapConfiguration({
      ...validEnvironment,
      TENANT_BOOTSTRAP_INVITATION_EXPIRY_DAYS: "31"
    })).toThrowError(new BootstrapError(
      "TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID"
    ));
    expect(() => readBootstrapConfiguration({
      ...validEnvironment,
      TENANT_BOOTSTRAP_REDIRECT_URL: "http://app.example.com"
    })).toThrowError(new BootstrapError(
      "TENANT_BOOTSTRAP_REDIRECT_URL_INVALID"
    ));
  });

  it("keeps bootstrap idempotency state behind service-role functions", () => {
    expect(migrationSource).toMatch(
      /alter table public\.tenant_bootstrap_operations enable row level security;/u
    );
    expect(migrationSource).toMatch(
      /revoke all on table public\.tenant_bootstrap_operations[\s\S]*service_role/u
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.bootstrap_organization_tenant[\s\S]*to service_role/u
    );
    expect(migrationSource).toMatch(
      /revoke all on function public\.bootstrap_organization_tenant[\s\S]*authenticated/u
    );
  });

  it("uses an exact server-only Auth marker and compensates a failed creation", () => {
    expect(scriptSource).toMatch(/tenant_bootstrap_request_id/u);
    expect(scriptSource).toMatch(/inviteUserByEmail/u);
    expect(scriptSource).toMatch(/requires_password_setup: true/u);
    expect(scriptSource).toMatch(
      /if \(createdUserInThisRun && administratorUser\)[\s\S]*deleteUser/u
    );
    expect(scriptSource).not.toMatch(/console\.(?:log|error)\([^\n]*serviceRoleKey/u);
  });

  it("requires explicit execution confirmation and provides a check command", () => {
    expect(scriptSource).toContain("CREATE_PRODUCTION_TENANT");
    expect(packageJson.scripts["tenant:bootstrap:check"]).toContain("--check");
    expect(packageJson.scripts["tenant:bootstrap"]).toContain(
      "scripts/bootstrap-production-tenant.mjs"
    );
    expect(packageJson.scripts["tenant:bootstrap:recover"]).toContain(
      "--recover"
    );
  });

  it("marks every administrator invitation for password setup", () => {
    expect(onboardingFunctionSource).toMatch(
      /inviteUserByEmail[\s\S]*requires_password_setup: true/u
    );
  });

  it("creates the marked Auth invitation before the atomic database call", async () => {
    const client = createBootstrapClientStub();
    const result = await runBootstrap({
      client,
      environment: {
        ...validEnvironment,
        TENANT_BOOTSTRAP_CONFIRM: "CREATE_PRODUCTION_TENANT"
      }
    });

    expect(client.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      "first.admin@example.com",
      expect.objectContaining({
        data: expect.objectContaining({ requires_password_setup: true }),
        redirectTo: "https://app.example.com"
      })
    );
    expect(client.auth.admin.updateUserById).toHaveBeenCalledWith(
      "92222222-2222-4222-8222-222222222222",
      expect.objectContaining({
        app_metadata: expect.objectContaining({
          tenant_bootstrap_request_id:
            "91111111-1111-4111-8111-111111111111"
        })
      })
    );
    expect(result.status).toBe("created");
    expect(result).not.toHaveProperty("administratorEmail");
  });

  it("deletes only the Auth identity created by a failed execution", async () => {
    const client = createBootstrapClientStub({
      bootstrapError: { message: "TENANT_BOOTSTRAP_ORGANIZATION_SLUG_EXISTS" }
    });

    await expect(runBootstrap({
      client,
      environment: {
        ...validEnvironment,
        TENANT_BOOTSTRAP_CONFIRM: "CREATE_PRODUCTION_TENANT"
      }
    })).rejects.toThrow("TENANT_BOOTSTRAP_ORGANIZATION_SLUG_EXISTS");

    expect(client.auth.admin.deleteUser).toHaveBeenCalledWith(
      "92222222-2222-4222-8222-222222222222"
    );
  });

  it("renews only an exact incomplete bootstrap and requests recovery delivery", async () => {
    const client = createBootstrapClientStub({
      existingOperation: createCompletedOperation()
    });
    const result = await runBootstrap({
      client,
      environment: {
        ...validEnvironment,
        TENANT_BOOTSTRAP_RECOVERY_CONFIRM:
          "REISSUE_BOOTSTRAP_INVITATION"
      },
      recover: true
    });

    expect(client.rpc).toHaveBeenCalledWith(
      "renew_tenant_bootstrap_invitation",
      expect.objectContaining({
        bootstrap_request_id:
          "91111111-1111-4111-8111-111111111111"
      })
    );
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "first.admin@example.com",
      { redirectTo: "https://app.example.com" }
    );
    expect(result.status).toBe("invitation_reissued");
  });
});

function createBootstrapClientStub({
  bootstrapError = null,
  existingOperation = null
} = {}) {
  const invitedUser = {
    app_metadata: {},
    email: "first.admin@example.com",
    id: "92222222-2222-4222-8222-222222222222"
  };
  const markedUser = {
    ...invitedUser,
    app_metadata: {
      tenant_bootstrap_request_id:
        "91111111-1111-4111-8111-111111111111"
    }
  };
  const rpc = vi.fn(async (functionName) => {
    if (functionName === "get_tenant_bootstrap_operation") {
      return {
        data: existingOperation ?? { found: false },
        error: null
      };
    }

    if (functionName === "renew_tenant_bootstrap_invitation") {
      return { data: { renewed: true }, error: null };
    }

    return {
      data: bootstrapError
        ? null
        : {
          administratorUserId: markedUser.id,
          completedAt: "2026-08-09T12:00:00.000Z",
          found: true,
          initialUnitId: "93333333-3333-4333-8333-333333333333",
          invitationAccepted: false,
          invitationExpired: false,
          invitationId: "94444444-4444-4444-8444-444444444444",
          invitationRevoked: false,
          organizationId: "95555555-5555-4555-8555-555555555555",
          organizationSlug: "example-company",
          replayed: false,
          requestId: "91111111-1111-4111-8111-111111111111"
        },
      error: bootstrapError
    };
  });

  return {
    auth: {
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
      admin: {
        deleteUser: vi.fn(async () => ({ data: {}, error: null })),
        inviteUserByEmail: vi.fn(async () => ({
          data: { user: invitedUser },
          error: null
        })),
        listUsers: vi.fn(async () => ({
          data: { users: [] },
          error: null
        })),
        updateUserById: vi.fn(async () => ({
          data: { user: markedUser },
          error: null
        }))
      }
    },
    rpc
  };
}

function createCompletedOperation() {
  return {
    administratorUserId: "92222222-2222-4222-8222-222222222222",
    completedAt: "2026-08-09T12:00:00.000Z",
    found: true,
    initialUnitId: "93333333-3333-4333-8333-333333333333",
    invitationAccepted: false,
    invitationExpired: true,
    invitationId: "94444444-4444-4444-8444-444444444444",
    invitationRevoked: false,
    organizationId: "95555555-5555-4555-8555-555555555555",
    organizationSlug: "example-company",
    requestId: "91111111-1111-4111-8111-111111111111"
  };
}

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}
