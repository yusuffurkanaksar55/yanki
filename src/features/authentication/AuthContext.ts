import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { SignInCredentials } from "./authService";

export type AuthStatus =
  | "checking"
  | "authenticated"
  | "unauthenticated"
  | "blocked";

export type AuthFeedback = {
  readonly tone: "success" | "error";
  readonly message: string;
};

export type AuthContextValue = {
  readonly status: AuthStatus;
  readonly session: Session | null;
  readonly userEmail: string | null;
  readonly isSubmitting: boolean;
  readonly feedback: AuthFeedback | null;
  readonly signInWithPassword: (
    credentials: SignInCredentials
  ) => Promise<void>;
  readonly requestPasswordReset: (email: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly clearFeedback: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
