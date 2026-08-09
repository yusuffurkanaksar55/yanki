export interface OffsiteBackupConfiguration {
  readonly environmentId: string;
  readonly resticCommand: string;
  readonly remoteRepository: boolean;
  readonly stdinFilename: string;
  readonly tags: readonly string[];
}

export interface BackupSource {
  command: string;
  argumentsList: string[];
  environment: Record<string, string | undefined>;
  mode: "DOCKER" | "DATABASE_URL";
}

export interface RetentionPolicy {
  readonly daily: number;
  readonly weekly: number;
  readonly monthly: number;
  readonly yearly: number;
}

export const expectedResticVersion: string;
export const localRepositoryAcceptanceConfirmation: string;
export function readOffsiteBackupConfiguration(
  environment?: Record<string, string | undefined>
): Promise<OffsiteBackupConfiguration>;
export function createBackupSource(
  environment?: Record<string, string | undefined>
): BackupSource;
export function buildResticBackupArguments(
  configuration: OffsiteBackupConfiguration,
  source: BackupSource
): string[];
export function readRetentionPolicy(
  environment?: Record<string, string | undefined>
): RetentionPolicy;
export function buildResticRetentionArguments(
  configuration: OffsiteBackupConfiguration,
  policy: RetentionPolicy
): string[];
export function readIntegritySubset(value?: string): string;
export function assertSnapshotMatches(
  snapshot: unknown,
  configuration: OffsiteBackupConfiguration,
  expectedSnapshotId: string
): true;
export function parseBackupSummary(output: string): {
  snapshotId: string;
  sourceBytes: number | null;
  repositoryBytesAdded: number | null;
};
export function assertResticVersion(
  command: string,
  environment?: Record<string, string | undefined>
): void;
export function runRestic(
  command: string,
  argumentsList: string[],
  environment?: Record<string, string | undefined>
): Promise<{ stdout: string; stderr: string }>;
