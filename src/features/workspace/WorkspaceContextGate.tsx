import { useEffect, useState, type ReactNode } from "react";
import { tr } from "../../locales/tr/messages";
import {
  browserWorkspaceContextService,
  WorkspaceContextServiceError,
  type WorkspaceContext,
  type WorkspaceContextService
} from "./workspaceContextService";

type WorkspaceContextGateState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly context: WorkspaceContext }
  | { readonly status: "blocked"; readonly message: string };

type WorkspaceContextGateRenderProps = {
  readonly workspaceContext: WorkspaceContext;
};

type WorkspaceContextGateProps = {
  readonly children: (props: WorkspaceContextGateRenderProps) => ReactNode;
  readonly service?: WorkspaceContextService;
};

export function WorkspaceContextGate({
  children,
  service = browserWorkspaceContextService
}: WorkspaceContextGateProps) {
  const [state, setState] = useState<WorkspaceContextGateState>({
    status: "loading"
  });

  useEffect(() => {
    let isActive = true;

    async function loadWorkspaceContext() {
      setState({ status: "loading" });

      try {
        const context = await service.getMyWorkspaceContext();

        if (!isActive) {
          return;
        }

        setState({ status: "ready", context });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          status: "blocked",
          message: toWorkspaceContextFeedbackMessage(error)
        });
      }
    }

    void loadWorkspaceContext();

    return () => {
      isActive = false;
    };
  }, [service]);

  if (state.status === "ready") {
    return <>{children({ workspaceContext: state.context })}</>;
  }

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-6 text-ink">
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm">
          {tr.workspace.loading}
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-6 text-ink">
      <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{tr.workspace.blocked.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">{state.message}</p>
      </section>
    </main>
  );
}

function toWorkspaceContextFeedbackMessage(error: unknown): string {
  if (error instanceof WorkspaceContextServiceError) {
    return tr.workspace.feedback[error.code];
  }

  return tr.workspace.feedback.genericError;
}
