export type PublicEnvironment = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
};

type PublicEnvironmentInput = {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
};

export class EnvironmentConfigurationError extends Error {
  readonly code = "PUBLIC_ENVIRONMENT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "EnvironmentConfigurationError";
  }
}

export function readPublicEnvironment(
  environment: PublicEnvironmentInput = import.meta.env as PublicEnvironmentInput
): PublicEnvironment {
  const supabaseUrl = normalizeRequiredValue(environment.VITE_SUPABASE_URL);
  const supabaseAnonKey = normalizeRequiredValue(
    environment.VITE_SUPABASE_ANON_KEY
  );

  if (!supabaseUrl || !isValidHttpUrl(supabaseUrl)) {
    throw new EnvironmentConfigurationError("VITE_SUPABASE_URL is invalid.");
  }

  if (!supabaseAnonKey) {
    throw new EnvironmentConfigurationError("VITE_SUPABASE_ANON_KEY is missing.");
  }

  return {
    supabaseUrl,
    supabaseAnonKey
  };
}

function normalizeRequiredValue(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
