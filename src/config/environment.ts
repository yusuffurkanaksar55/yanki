export type PublicEnvironment = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
};

export type BuildTimePublicEnvironment = {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
};

export type RuntimePublicEnvironment = {
  readonly supabaseUrl?: string;
  readonly supabaseAnonKey?: string;
};

export class EnvironmentConfigurationError extends Error {
  readonly code = "PUBLIC_ENVIRONMENT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "EnvironmentConfigurationError";
  }
}

export function readPublicEnvironment(
  buildTimeEnvironment: BuildTimePublicEnvironment =
    import.meta.env as BuildTimePublicEnvironment,
  runtimeEnvironment: RuntimePublicEnvironment | undefined =
    readBrowserRuntimeEnvironment()
): PublicEnvironment {
  const hasRuntimeEnvironment =
    runtimeEnvironment?.supabaseUrl !== undefined ||
    runtimeEnvironment?.supabaseAnonKey !== undefined;
  const supabaseUrl = normalizeRequiredValue(
    hasRuntimeEnvironment
      ? runtimeEnvironment?.supabaseUrl
      : buildTimeEnvironment.VITE_SUPABASE_URL
  );
  const supabaseAnonKey = normalizeRequiredValue(
    hasRuntimeEnvironment
      ? runtimeEnvironment?.supabaseAnonKey
      : buildTimeEnvironment.VITE_SUPABASE_ANON_KEY
  );

  if (!supabaseUrl || !isValidHttpUrl(supabaseUrl)) {
    throw new EnvironmentConfigurationError("Public Supabase URL is invalid.");
  }

  if (!supabaseAnonKey) {
    throw new EnvironmentConfigurationError(
      "Public Supabase anonymous key is missing."
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey
  };
}

function readBrowserRuntimeEnvironment(): RuntimePublicEnvironment | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.__YANKI_CONFIG__;
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
