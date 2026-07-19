import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const fixtureAccounts = [
  {
    key: "ceo",
    displayName: "Demo CEO",
    roleCode: "C_LEVEL_REVIEWER",
    unitSlug: "executive-office",
    membershipKind: "LEADER"
  },
  {
    key: "hr_admin",
    displayName: "Demo HR Admin",
    roleCode: "SYSTEM_ADMIN",
    unitSlug: "people-operations",
    membershipKind: "MEMBER"
  },
  {
    key: "team_leader",
    displayName: "Demo Team Leader",
    roleCode: "TEAM_LEADER",
    unitSlug: "product-team",
    membershipKind: "LEADER",
    managerKey: "ceo"
  },
  {
    key: "employee_1",
    displayName: "Demo Employee 1",
    roleCode: "EMPLOYEE",
    unitSlug: "product-team",
    membershipKind: "MEMBER",
    managerKey: "team_leader"
  },
  {
    key: "employee_2",
    displayName: "Demo Employee 2",
    roleCode: "EMPLOYEE",
    unitSlug: "product-team",
    membershipKind: "MEMBER",
    managerKey: "team_leader"
  },
  {
    key: "employee_3",
    displayName: "Demo Employee 3",
    roleCode: "EMPLOYEE",
    unitSlug: "product-team",
    membershipKind: "MEMBER",
    managerKey: "team_leader"
  }
];

const organization = {
  name: "Yanki Demo Organization",
  slug: "yanki-demo-organization"
};

const units = [
  {
    key: "executive-office",
    name: "Executive Office",
    slug: "executive-office",
    unitType: "UNIT"
  },
  {
    key: "people-operations",
    name: "People Operations",
    slug: "people-operations",
    unitType: "DEPARTMENT"
  },
  {
    key: "product-team",
    name: "Product Team",
    slug: "product-team",
    unitType: "TEAM"
  }
];

const supabaseUrl = readRequiredEnvironment("SUPABASE_URL");
const serviceRoleKey = readRequiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const emailDomain = process.env.TEST_EMAIL_DOMAIN?.trim() || "example.com";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const createdCredentials = [];

const organizationRecord = await upsertOrganization();
const unitRecords = await upsertUnits(organizationRecord.id);
const accountRecords = await upsertAccounts(organizationRecord.id, unitRecords);
await upsertManagerAssignments(organizationRecord.id, unitRecords, accountRecords);

console.log("Demo fixture is ready.");
console.table(createdCredentials);

async function upsertOrganization() {
  const { data, error } = await supabase
    .from("organizations")
    .upsert(
      {
        name: organization.name,
        slug: organization.slug,
        status: "ACTIVE"
      },
      { onConflict: "slug" }
    )
    .select("id,name,slug")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertUnits(organizationId) {
  const records = new Map();

  for (const unit of units) {
    const { data, error } = await supabase
      .from("organization_units")
      .upsert(
        {
          organization_id: organizationId,
          name: unit.name,
          slug: unit.slug,
          unit_type: unit.unitType,
          status: "ACTIVE"
        },
        { onConflict: "organization_id,slug" }
      )
      .select("id,slug")
      .single();

    if (error) {
      throw error;
    }

    records.set(unit.key, data);
  }

  return records;
}

async function upsertAccounts(organizationId, unitRecords) {
  const records = new Map();

  for (const account of fixtureAccounts) {
    const email = `${account.key}@${emailDomain}`;
    const password = createPassword();
    const user = await ensureAuthUser(email, password, account.displayName);

    await upsertProfile(user.id, email, account.displayName);
    await upsertMembership(organizationId, unitRecords, account, user.id);
    await upsertScopedRole(organizationId, unitRecords, account, user.id);

    createdCredentials.push({
      key: account.key,
      email,
      password
    });
    records.set(account.key, { ...account, userId: user.id });
  }

  return records;
}

async function ensureAuthUser(email, password, displayName) {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName
        }
      }
    );

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName
    }
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function findUserByEmail(email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) {
      throw error;
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase()
    );

    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }
}

async function upsertProfile(userId, email, displayName) {
  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      email,
      display_name: displayName,
      onboarding_status: "ACTIVE",
      activated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}

async function upsertMembership(organizationId, unitRecords, account, userId) {
  const unit = unitRecords.get(account.unitSlug);

  const { data: existingMembership, error: readError } = await supabase
    .from("organization_unit_memberships")
    .select("id")
    .eq("unit_id", unit.id)
    .eq("user_id", userId)
    .eq("membership_kind", account.membershipKind)
    .is("ends_at", null)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  const payload = {
    organization_id: organizationId,
    unit_id: unit.id,
    user_id: userId,
    membership_kind: account.membershipKind,
    is_primary: true
  };

  const { error } = existingMembership
    ? await supabase
        .from("organization_unit_memberships")
        .update(payload)
        .eq("id", existingMembership.id)
    : await supabase.from("organization_unit_memberships").insert(payload);

  if (error) {
    throw error;
  }
}

async function upsertScopedRole(organizationId, unitRecords, account, userId) {
  const roleScope = getRoleScope(organizationId, unitRecords, account);

  const { data: existingRole, error: readError } = await supabase
    .from("user_role_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("role_code", account.roleCode)
    .eq("scope_type", roleScope.scopeType)
    .eq("scope_id", roleScope.scopeId)
    .is("ends_at", null)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  const payload = {
    user_id: userId,
    role_code: account.roleCode,
    scope_type: roleScope.scopeType,
    scope_id: roleScope.scopeId
  };

  const { error } = existingRole
    ? await supabase
        .from("user_role_assignments")
        .update(payload)
        .eq("id", existingRole.id)
    : await supabase.from("user_role_assignments").insert(payload);

  if (error) {
    throw error;
  }
}

function getRoleScope(organizationId, unitRecords, account) {
  if (
    account.roleCode === "SYSTEM_ADMIN" ||
    account.roleCode === "C_LEVEL_REVIEWER"
  ) {
    return {
      scopeType: "ORGANIZATION",
      scopeId: organizationId
    };
  }

  const unit = unitRecords.get(account.unitSlug);

  return {
    scopeType: "TEAM",
    scopeId: unit.id
  };
}

async function upsertManagerAssignments(
  organizationId,
  unitRecords,
  accountRecords
) {
  for (const account of fixtureAccounts) {
    if (!account.managerKey) {
      continue;
    }

    const manager = accountRecords.get(account.managerKey);
    const directReport = accountRecords.get(account.key);
    const unit = unitRecords.get(account.unitSlug);

    const { data: existingAssignment, error: readError } = await supabase
      .from("manager_assignments")
      .select("id")
      .eq("direct_report_user_id", directReport.userId)
      .eq("relationship_type", "DIRECT_MANAGER")
      .is("ends_at", null)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    const payload = {
      organization_id: organizationId,
      manager_user_id: manager.userId,
      direct_report_user_id: directReport.userId,
      relationship_type: "DIRECT_MANAGER",
      scope_unit_id: unit.id
    };

    const { error } = existingAssignment
      ? await supabase
          .from("manager_assignments")
          .update(payload)
          .eq("id", existingAssignment.id)
      : await supabase.from("manager_assignments").insert(payload);

    if (error) {
      throw error;
    }
  }
}

function createPassword() {
  return `Yanki-${randomBytes(12).toString("base64url")}!1`;
}

function readRequiredEnvironment(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
