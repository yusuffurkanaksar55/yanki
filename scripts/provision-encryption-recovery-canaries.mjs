import {
  createEncryptionRecoveryCanaries,
  loadCustodiedEncryptionKeys,
  readKeyCustodyManifest
} from "./lib/encryption-key-custody.mjs";

const expectedConfirmation = "UPSERT_ENCRYPTION_RECOVERY_CANARIES";

if (process.env.EVALUATION_RECOVERY_CANARY_CONFIRM !== expectedConfirmation) {
  throw new Error(
    `Set EVALUATION_RECOVERY_CANARY_CONFIRM=${expectedConfirmation} before `
      + "writing recovery canaries."
  );
}

const supabaseUrl = readRequiredEnvironment("SUPABASE_URL");
const serviceRoleKey = readRequiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const manifest = await readKeyCustodyManifest(
  readRequiredEnvironment("EVALUATION_KEY_CUSTODY_MANIFEST_PATH")
);
const keys = loadCustodiedEncryptionKeys(manifest);
const canaries = await createEncryptionRecoveryCanaries(manifest, keys);
const response = await fetch(
  `${supabaseUrl.replace(/\/$/u, "")}/rest/v1/rpc/upsert_evaluation_encryption_recovery_canaries`,
  {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      managed_environment_id: manifest.environmentId,
      managed_canaries: canaries
    })
  }
);

if (!response.ok) {
  throw new Error(`Recovery canary provisioning failed with status ${response.status}.`);
}

const storedCount = await response.json();

if (storedCount !== canaries.length) {
  throw new Error("Recovery canary provisioning returned an unexpected count.");
}

console.log(JSON.stringify({
  canaryCount: storedCount,
  canariesStored: true,
  evaluationContentRead: false,
  keyMaterialLogged: false
}, null, 2));

function readRequiredEnvironment(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
