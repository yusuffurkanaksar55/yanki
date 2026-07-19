import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { EnvironmentConfigurationError } from "../../config/environment";
import { tr } from "../../locales/tr/messages";
import {
  AuthServiceError,
  browserAuthService,
  type AuthService,
  type SignInCredentials
} from "./authService";
import type { Session } from "@supabase/supabase-js";
import {
  AuthContext,
  type AuthContextValue,
  type AuthFeedback,
  type AuthStatus
} from "./AuthContext";

type AuthProviderProps = {
  readonly children: ReactNode;
  readonly service?: AuthService;
};

export function AuthProvider({
  children,
  service = browserAuthService
}: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);

  useEffect(() => {
    let isActive = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function initializeAuth() {
      try {
        subscription = service.onAuthStateChange((nextSession) => {
          if (!isActive) {
            return;
          }

          setSession(nextSession);
          setStatus(nextSession ? "authenticated" : "unauthenticated");
        });

        const currentSession = await service.getSession();

        if (!isActive) {
          return;
        }

        setSession(currentSession);
        setStatus(currentSession ? "authenticated" : "unauthenticated");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSession(null);
        setStatus("blocked");
        setFeedback(toAuthFeedback(error));
      }
    }

    void initializeAuth();

    return () => {
      isActive = false;
      subscription?.unsubscribe();
    };
  }, [service]);

  const signInWithPassword = useCallback(
    async (credentials: SignInCredentials) => {
      setIsSubmitting(true);
      setFeedback(null);

      try {
        await service.signInWithPassword(credentials);
      } catch (error) {
        setFeedback(toAuthFeedback(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [service]
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      setIsSubmitting(true);
      setFeedback(null);

      try {
        await service.requestPasswordReset(email);
        setFeedback({
          tone: "success",
          message: tr.auth.feedback.passwordResetRequested
        });
      } catch (error) {
        setFeedback(toAuthFeedback(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [service]
  );

  const signOut = useCallback(async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await service.signOut();
    } catch (error) {
      setFeedback(toAuthFeedback(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [service]);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      userEmail: session?.user.email ?? null,
      isSubmitting,
      feedback,
      signInWithPassword,
      requestPasswordReset,
      signOut,
      clearFeedback
    }),
    [
      clearFeedback,
      feedback,
      isSubmitting,
      requestPasswordReset,
      session,
      signInWithPassword,
      signOut,
      status
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function toAuthFeedback(error: unknown): AuthFeedback {
  if (error instanceof EnvironmentConfigurationError) {
    return {
      tone: "error",
      message: tr.auth.feedback.configurationError
    };
  }

  if (error instanceof AuthServiceError) {
    return {
      tone: "error",
      message: tr.auth.feedback[error.code]
    };
  }

  return {
    tone: "error",
    message: tr.auth.feedback.genericError
  };
}
