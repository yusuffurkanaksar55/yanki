import type {
  AuthChangeEvent,
  AuthError,
  Session,
  SupabaseClient
} from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type SignInCredentials = {
  readonly email: string;
  readonly password: string;
};

export type AuthStateListener = (
  event: AuthChangeEvent,
  session: Session | null
) => void;

export type AuthSubscription = {
  readonly unsubscribe: () => void;
};

export type AuthService = {
  readonly getSession: () => Promise<Session | null>;
  readonly onAuthStateChange: (
    listener: AuthStateListener
  ) => AuthSubscription;
  readonly signInWithPassword: (
    credentials: SignInCredentials
  ) => Promise<void>;
  readonly requestPasswordReset: (email: string) => Promise<void>;
  readonly updatePassword: (password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
};

export type AuthServiceErrorCode =
  | "AUTH_SESSION_READ_FAILED"
  | "AUTH_SIGN_IN_FAILED"
  | "AUTH_PASSWORD_RESET_FAILED"
  | "AUTH_PASSWORD_UPDATE_FAILED"
  | "AUTH_SIGN_OUT_FAILED";

export class AuthServiceError extends Error {
  constructor(
    readonly code: AuthServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "AuthServiceError";
  }
}

let cachedAuthService: AuthService | null = null;

export const browserAuthService: AuthService = {
  getSession: () => getDefaultAuthService().getSession(),
  onAuthStateChange: (listener) =>
    getDefaultAuthService().onAuthStateChange(listener),
  signInWithPassword: (credentials) =>
    getDefaultAuthService().signInWithPassword(credentials),
  requestPasswordReset: (email) =>
    getDefaultAuthService().requestPasswordReset(email),
  updatePassword: (password) =>
    getDefaultAuthService().updatePassword(password),
  signOut: () => getDefaultAuthService().signOut()
};

export function createSupabaseAuthService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): AuthService {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();

      if (error) {
        throw new AuthServiceError("AUTH_SESSION_READ_FAILED", error);
      }

      return data.session ?? null;
    },

    onAuthStateChange(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        listener(event, session ?? null);
      });

      return {
        unsubscribe: () => data.subscription.unsubscribe()
      };
    },

    async signInWithPassword(credentials) {
      const { error } = await client.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        throw createAuthServiceError("AUTH_SIGN_IN_FAILED", error);
      }
    },

    async requestPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl()
      });

      if (error) {
        throw createAuthServiceError("AUTH_PASSWORD_RESET_FAILED", error);
      }
    },

    async updatePassword(password) {
      const { error } = await client.auth.updateUser({
        data: { requires_password_setup: false },
        password
      });

      if (error) {
        throw createAuthServiceError("AUTH_PASSWORD_UPDATE_FAILED", error);
      }
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: "local" });

      if (error) {
        throw createAuthServiceError("AUTH_SIGN_OUT_FAILED", error);
      }
    }
  };
}

function getDefaultAuthService(): AuthService {
  if (!cachedAuthService) {
    cachedAuthService = createSupabaseAuthService();
  }

  return cachedAuthService;
}

function createAuthServiceError(
  code: AuthServiceErrorCode,
  error: AuthError
): AuthServiceError {
  return new AuthServiceError(code, {
    name: error.name,
    status: error.status
  });
}

function getPasswordResetRedirectUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.location.origin;
}
