import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260817174207_reconcile_self_hosted_security_acl.sql"
);
const migration = await readFile(migrationPath, "utf8");

const apiRoles = ["public", "anon", "authenticated", "service_role"];
const tablePrivileges = [
  "select",
  "insert",
  "update",
  "delete",
  "truncate",
  "references",
  "trigger",
  "maintain"
];

const serviceRoleTables = new Set([
  "app_roles",
  "audit_events",
  "evaluation_assignments",
  "evaluation_cycles",
  "evaluation_template_questions",
  "evaluation_template_versions",
  "evaluation_templates",
  "manager_assignments",
  "organization_unit_memberships",
  "organization_units",
  "organizations",
  "project_memberships",
  "projects",
  "scope_types",
  "user_invitations",
  "user_profiles",
  "user_role_assignments"
]);

const restrictedTables = new Set([
  "anonymous_submission_credentials",
  "encrypted_evaluation_submissions",
  "evaluation_encryption_recovery_canaries",
  "organization_evaluation_retention_policies",
  "security_abuse_event_counters",
  "security_rate_limit_buckets",
  "tenant_bootstrap_operations"
]);

const authenticatedFunctions = new Set([
  "get_my_evaluation_assignments()",
  "get_my_workspace_context()"
]);

const serviceRoleFunctions = new Set([
  "accept_user_invitation(uuid,uuid)",
  "admin_assign_user_role(uuid,uuid,uuid,text,uuid)",
  "admin_clone_evaluation_template_version(uuid,uuid)",
  "admin_end_user_role(uuid,uuid,uuid)",
  "admin_publish_evaluation_template_version(uuid,uuid)",
  "admin_save_evaluation_template_draft(uuid,uuid,uuid,uuid,text,text,jsonb)",
  "admin_set_user_hierarchy_context(uuid,uuid,uuid,uuid,text,uuid)",
  "admin_update_evaluation_retention_policy(uuid,uuid,integer,boolean,boolean)",
  "admin_update_organization_name(uuid,uuid,text)",
  "admin_update_project_dates(uuid,uuid,uuid,date,timestamptz)",
  "admin_upsert_organization_unit(uuid,uuid,uuid,text,text,text,uuid,text)",
  "bootstrap_organization_tenant(uuid,text,uuid,text,text,text,text,text,text,integer)",
  "consume_anonymous_submission_request(text)",
  "execute_due_evaluation_content_retention()",
  "get_anonymous_submission_abuse_summary(uuid)",
  "get_anonymous_submission_abuse_summary_for_operator()",
  "get_anonymous_submission_context(text)",
  "get_encrypted_evaluation_report_batch(uuid,uuid,uuid)",
  "get_tenant_bootstrap_operation(uuid,text)",
  "issue_anonymous_submission_credential(uuid,uuid,text)",
  "list_manageable_evaluation_retention_policies(uuid)",
  "list_my_evaluation_report_targets(uuid)",
  "list_platform_organization_tenants(uuid)",
  "list_referenced_evaluation_encryption_key_versions()",
  "platform_bootstrap_organization_tenant(uuid,uuid,text,uuid,text,text,text,text,text,text,integer)",
  "platform_renew_tenant_bootstrap_invitation(uuid,uuid,integer)",
  "redeem_anonymous_submission_credential(text,text,text,text,integer,integer)",
  "renew_tenant_bootstrap_invitation(uuid,text,integer)",
  "require_active_organization_identity(uuid,uuid)",
  "require_active_platform_system_admin(uuid)",
  "require_active_system_admin(uuid,uuid)",
  "upsert_evaluation_encryption_recovery_canaries(text,jsonb)"
]);

const internalFunctions = new Set([
  "can_review_evaluation_subject(uuid,uuid,uuid,uuid,uuid)",
  "consume_security_rate_limit(text,bytea,integer,interval,timestamptz)",
  "create_default_evaluation_retention_policy()",
  "get_thresholded_evaluation_report_batch_without_close_metadata(uuid,uuid,uuid)",
  "read_anonymous_submission_abuse_summary()",
  "record_security_abuse_event(text,timestamptz)",
  "rls_auto_enable()"
]);

function splitTopLevelList(value) {
  const entries = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      entries.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  entries.push(value.slice(start).trim());
  return entries.filter(Boolean);
}

function normalizeTarget(target, kind) {
  const normalized = target
    .replace(/^public\./iu, "")
    .replace(/\s+/gu, "")
    .toLowerCase();

  return kind === "function"
    ? normalized.replaceAll("timestampwithtimezone", "timestamptz")
    : normalized;
}

function parseAclStatements(source) {
  const statementPattern =
    /\b(grant|revoke)\s+([^;]+?)\s+on\s+(table|function)\s+([^;]+?)\s+(to|from)\s+([^;]+);/giu;

  return [...source.matchAll(statementPattern)].map((match) => ({
    action: match[1].toLowerCase(),
    privileges: match[2]
      .toLowerCase()
      .replace(/\bprivileges\b/gu, "")
      .split(",")
      .map((privilege) => privilege.trim())
      .filter(Boolean),
    kind: match[3].toLowerCase(),
    targets: splitTopLevelList(match[4]).map((target) =>
      normalizeTarget(target, match[3].toLowerCase())
    ),
    roles: match[6]
      .split(",")
      .map((role) => role.trim().toLowerCase())
  }));
}

function parseDefaultPrivilegeStatements(source) {
  return splitTopLevelSql(source).flatMap((rawStatement) => {
    const statement = rawStatement
      .replace(/^(?:\s*--[^\n]*\n)+/gu, "")
      .trim();
    const match = statement.match(
      /^alter default privileges for role ([a-z0-9_]+) in schema ([a-z0-9_]+)\s+revoke\s+([\s\S]*?)\s+on\s+(tables|sequences|functions)\s+from\s+([^;]+);$/iu
    );

    if (!match) return [];

    return [{
      creatorRole: match[1].toLowerCase(),
      schema: match[2].toLowerCase(),
      privileges: match[3].toLowerCase().replace(/\s+/gu, " "),
      objectType: match[4].toLowerCase(),
      grantees: match[5]
        .split(",")
        .map((role) => role.trim().toLowerCase())
        .sort()
    }];
  });
}

function simulateAcl(statements, kind) {
  const relevant = statements.filter((statement) => statement.kind === kind);
  const targets = new Set(relevant.flatMap((statement) => statement.targets));
  const availablePrivileges = kind === "table" ? tablePrivileges : ["execute"];
  const acl = new Map();

  for (const target of targets) {
    acl.set(
      target,
      new Map(
        apiRoles.map((role) => [role, new Set(availablePrivileges)])
      )
    );
  }

  for (const statement of relevant) {
    const privileges = statement.privileges.includes("all")
      ? availablePrivileges
      : statement.privileges;

    for (const target of statement.targets) {
      for (const role of statement.roles) {
        const rolePrivileges = acl.get(target)?.get(role);
        expect(rolePrivileges, `Unknown ACL target or role: ${target}/${role}`).toBeDefined();
        for (const privilege of privileges) {
          if (statement.action === "grant") rolePrivileges.add(privilege);
          else rolePrivileges.delete(privilege);
        }
      }
    }
  }

  return acl;
}

function privilegeList(acl, target, role) {
  return [...(acl.get(target)?.get(role) ?? [])].sort();
}

function splitTopLevelSql(source) {
  const statements = [];
  let inDollarQuote = false;
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (source.slice(index, index + 2) === "$$") {
      inDollarQuote = !inDollarQuote;
      index += 1;
      continue;
    }

    if (source[index] === ";" && !inDollarQuote) {
      statements.push(source.slice(start, index + 1).trim());
      start = index + 1;
    }
  }

  return statements.filter(Boolean);
}

async function readSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const sources = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) sources.push(...(await readSourceFiles(path)));
    else if (/\.(?:ts|tsx)$/u.test(entry.name)) {
      sources.push(await readFile(path, "utf8"));
    }
  }

  return sources;
}

function readLiteralCalls(source, methodName) {
  const pattern = new RegExp(
    `\\.${methodName}\\(\\s*["']([^"']+)["']`,
    "gsu"
  );
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

const aclStatements = parseAclStatements(migration);
const tableAcl = simulateAcl(aclStatements, "table");
const functionAcl = simulateAcl(aclStatements, "function");
const defaultPrivilegeStatements = parseDefaultPrivilegeStatements(migration);

describe("self-hosted security reconciliation migration", () => {
  it("converges all 24 application tables to the reviewed least-privilege matrix", () => {
    expect(tableAcl.size).toBe(24);
    expect(new Set([...serviceRoleTables, ...restrictedTables]).size).toBe(24);

    for (const table of tableAcl.keys()) {
      expect(privilegeList(tableAcl, table, "public")).toEqual([]);
      expect(privilegeList(tableAcl, table, "anon")).toEqual([]);
      expect(privilegeList(tableAcl, table, "authenticated")).toEqual(
        table === "user_profiles" ? ["select"] : []
      );
      expect(privilegeList(tableAcl, table, "service_role")).toEqual(
        serviceRoleTables.has(table)
          ? ["delete", "insert", "select", "update"]
          : []
      );
    }
  });

  it("removes broad future-object defaults only for the verified application creator", () => {
    expect(defaultPrivilegeStatements).toEqual([
      {
        creatorRole: "postgres",
        schema: "public",
        privileges: "all privileges",
        objectType: "tables",
        grantees: ["anon", "authenticated", "public", "service_role"]
      },
      {
        creatorRole: "postgres",
        schema: "public",
        privileges: "all privileges",
        objectType: "sequences",
        grantees: ["anon", "authenticated", "public", "service_role"]
      },
      {
        creatorRole: "postgres",
        schema: "public",
        privileges: "execute",
        objectType: "functions",
        grantees: ["anon", "authenticated", "public", "service_role"]
      }
    ]);
    expect(migration).not.toMatch(
      /alter default privileges for role supabase_admin/iu
    );
  });

  it("converges the 41 reviewed callable functions to exact execution roles", () => {
    expect(functionAcl.size).toBe(41);
    expect(
      new Set([
        ...authenticatedFunctions,
        ...serviceRoleFunctions,
        ...internalFunctions
      ]).size
    ).toBe(41);

    for (const functionName of functionAcl.keys()) {
      expect(privilegeList(functionAcl, functionName, "public")).toEqual([]);
      expect(privilegeList(functionAcl, functionName, "anon")).toEqual([]);
      expect(privilegeList(functionAcl, functionName, "authenticated")).toEqual(
        authenticatedFunctions.has(functionName) ? ["execute"] : []
      );
      expect(privilegeList(functionAcl, functionName, "service_role")).toEqual(
        serviceRoleFunctions.has(functionName) ? ["execute"] : []
      );
    }
  });

  it("preserves the public HTTP submission flow behind service-role-only credential RPCs", async () => {
    const anonymousEndpoint = await readFile(
      join(
        process.cwd(),
        "supabase",
        "functions",
        "anonymous-evaluation-submissions",
        "index.ts"
      ),
      "utf8"
    );

    for (const functionName of [
      "consume_anonymous_submission_request(text)",
      "get_anonymous_submission_context(text)",
      "redeem_anonymous_submission_credential(text,text,text,text,integer,integer)"
    ]) {
      expect(privilegeList(functionAcl, functionName, "service_role")).toEqual([
        "execute"
      ]);
      expect(privilegeList(functionAcl, functionName, "anon")).toEqual([]);
    }

    expect(anonymousEndpoint).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(anonymousEndpoint).toContain('"consume_anonymous_submission_request"');
    expect(anonymousEndpoint).toContain('"get_anonymous_submission_context"');
    expect(anonymousEndpoint).toContain('"redeem_anonymous_submission_credential"');
  });

  it("keeps browser source free of service-role credentials", async () => {
    const frontendSource = (await readSourceFiles(join(process.cwd(), "src"))).join(
      "\n"
    );

    expect(frontendSource).not.toMatch(
      /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|service_role/iu
    );
  });

  it("matches direct browser and trusted-server callers to the reviewed ACL", async () => {
    const frontendSource = (await readSourceFiles(join(process.cwd(), "src"))).join(
      "\n"
    );
    const edgeSource = (
      await readSourceFiles(join(process.cwd(), "supabase", "functions"))
    ).join("\n");
    const scripts = await readdir(join(process.cwd(), "scripts"), {
      recursive: true
    });
    const scriptSource = (
      await Promise.all(
        scripts
          .filter((path) => /\.(?:mjs|mts)$/u.test(path))
          .map((path) => readFile(join(process.cwd(), "scripts", path), "utf8"))
      )
    ).join("\n");

    expect([...new Set(readLiteralCalls(frontendSource, "from"))].sort()).toEqual([
      "user_profiles"
    ]);
    expect([...new Set(readLiteralCalls(frontendSource, "rpc"))].sort()).toEqual([
      "get_my_evaluation_assignments",
      "get_my_workspace_context"
    ]);

    const edgeDirectTables = new Set(readLiteralCalls(edgeSource, "from"));
    expect([...edgeDirectTables].sort()).toEqual([
      "audit_events",
      "evaluation_assignments",
      "evaluation_cycles",
      "evaluation_template_versions",
      "evaluation_templates",
      "manager_assignments",
      "organization_unit_memberships",
      "organization_units",
      "organizations",
      "project_memberships",
      "projects",
      "user_invitations",
      "user_profiles",
      "user_role_assignments"
    ]);
    expect(edgeSource).toContain("evaluation_template_questions(");
    for (const table of restrictedTables) {
      expect(edgeDirectTables.has(table)).toBe(false);
    }

    const scriptDirectTables = new Set(readLiteralCalls(scriptSource, "from"));
    for (const table of restrictedTables) {
      expect(scriptDirectTables.has(table)).toBe(false);
    }
  });

  it("keeps all 32 service-role RPCs outside direct frontend database calls", async () => {
    const frontendSource = (await readSourceFiles(join(process.cwd(), "src"))).join(
      "\n"
    );
    const edgeSource = (
      await readSourceFiles(join(process.cwd(), "supabase", "functions"))
    ).join("\n");
    const scriptPaths = (await readdir(join(process.cwd(), "scripts"), {
      recursive: true
    })).filter((path) => /\.(?:mjs|mts)$/u.test(path));
    const scriptSource = (
      await Promise.all(
        scriptPaths.map((path) =>
          readFile(join(process.cwd(), "scripts", path), "utf8")
        )
      )
    ).join("\n");
    const migrationDirectory = join(process.cwd(), "supabase", "migrations");
    const historicalMigrationSource = (
      await Promise.all(
        (await readdir(migrationDirectory))
          .filter((path) => path.endsWith(".sql") && !path.startsWith("20260817174207"))
          .map((path) => readFile(join(migrationDirectory, path), "utf8"))
      )
    ).join("\n");

    const edgeFunctions = new Set([
      "accept_user_invitation",
      "admin_assign_user_role",
      "admin_clone_evaluation_template_version",
      "admin_end_user_role",
      "admin_publish_evaluation_template_version",
      "admin_save_evaluation_template_draft",
      "admin_set_user_hierarchy_context",
      "admin_update_evaluation_retention_policy",
      "admin_update_organization_name",
      "admin_update_project_dates",
      "admin_upsert_organization_unit",
      "consume_anonymous_submission_request",
      "get_anonymous_submission_abuse_summary",
      "get_anonymous_submission_context",
      "get_encrypted_evaluation_report_batch",
      "issue_anonymous_submission_credential",
      "list_manageable_evaluation_retention_policies",
      "list_my_evaluation_report_targets",
      "list_platform_organization_tenants",
      "list_referenced_evaluation_encryption_key_versions",
      "platform_bootstrap_organization_tenant",
      "platform_renew_tenant_bootstrap_invitation",
      "redeem_anonymous_submission_credential"
    ]);
    const operatorFunctions = new Set([
      "bootstrap_organization_tenant",
      "execute_due_evaluation_content_retention",
      "get_anonymous_submission_abuse_summary_for_operator",
      "get_tenant_bootstrap_operation",
      "renew_tenant_bootstrap_invitation",
      "upsert_evaluation_encryption_recovery_canaries"
    ]);
    const sqlInternalFunctions = new Set([
      "require_active_organization_identity",
      "require_active_platform_system_admin",
      "require_active_system_admin"
    ]);
    const classifiedFunctions = new Set([
      ...edgeFunctions,
      ...operatorFunctions,
      ...sqlInternalFunctions
    ]);
    const expectedFunctions = new Set(
      [...serviceRoleFunctions].map((signature) => signature.slice(0, signature.indexOf("(")))
    );

    expect(classifiedFunctions).toEqual(expectedFunctions);
    const frontendRpcCalls = new Set(readLiteralCalls(frontendSource, "rpc"));
    for (const functionName of expectedFunctions) {
      expect(frontendRpcCalls.has(functionName)).toBe(false);
    }
    for (const functionName of edgeFunctions) {
      expect(edgeSource).toContain(`"${functionName}"`);
    }
    for (const functionName of operatorFunctions) {
      expect(scriptSource).toContain(functionName);
    }
    for (const functionName of sqlInternalFunctions) {
      expect(
        historicalMigrationSource.split(functionName).length - 1
      ).toBeGreaterThan(1);
    }
  });

  it("keeps invitation context hardening before identity writes", () => {
    const functionMatch = migration.match(
      /create or replace function public\.accept_user_invitation[\s\S]*?as \$\$([\s\S]*?)\$\$;/iu
    );
    expect(functionMatch).not.toBeNull();

    const body = functionMatch[1];
    const firstIdentityWrite = body.indexOf("insert into public.user_profiles");
    for (const guard of [
      "INVITATION_CONTEXT_INCOMPLETE",
      "INVITATION_CONTEXT_INACTIVE",
      "INVITATION_MANAGER_INACTIVE"
    ]) {
      expect(body.indexOf(guard)).toBeGreaterThan(-1);
      expect(body.indexOf(guard)).toBeLessThan(firstIdentityWrite);
    }

    expect(migration).toMatch(
      /security definer\s+set search_path = public, pg_temp/iu
    );
    expect(privilegeList(functionAcl, "accept_user_invitation(uuid,uuid)", "service_role")).toEqual([
      "execute"
    ]);
  });

  it("contains only reviewed top-level DDL and ACL statements", () => {
    const statements = splitTopLevelSql(migration).map((statement) =>
      statement.replace(/^(?:\s*--[^\n]*\n)+/gu, "").trim().toLowerCase()
    );

    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      expect(statement).toMatch(
        /^(?:alter default privileges|create or replace function|revoke|grant|comment on function)\b/u
      );
    }

    expect(migration).not.toMatch(/\bdrop\s+(?:table|schema|function)\b/iu);
    expect(migration).not.toMatch(/\btruncate\s+(?:table\s+)?public\./iu);
  });
});
