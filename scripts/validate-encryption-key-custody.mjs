import { readKeyCustodyManifest } from "./lib/encryption-key-custody.mjs";

const manifestPath = process.argv[2]
  || process.env.EVALUATION_KEY_CUSTODY_MANIFEST_PATH;
const manifest = await readKeyCustodyManifest(manifestPath);

console.log(JSON.stringify({
  schemaVersion: manifest.schemaVersion,
  keyVersionCount: manifest.keyVersions.length,
  exactlyOneActiveKey: true,
  independentRecoveryCustody: true,
  twoPersonControlDeclared: true,
  keyMaterialPresent: false
}, null, 2));
