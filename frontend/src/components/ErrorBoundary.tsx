import { Component, type ErrorInfo, type ReactNode } from "react";

import { ServerErrorPanel, makeReferenceId } from "@/components/ErrorPanels";

/**
 * The route-level Error Boundary (Task 3, upgraded by 9.5 Task 10): 11 §4.2's
 * copy, plus a copyable reference id and a collapsible technical detail.
 * The id shown to the user is the same one logged — one console line per
 * crash, resolvable by reference. Raw error text only ever appears inside the
 * collapsed detail; the headline copy stays verbatim.
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  referenceId: string | null;
  detail: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, referenceId: null, detail: "" };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    // The id is minted in componentDidCatch: getDerivedStateFromError must
    // stay pure, and the catch hook always follows it before render.
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const referenceId = makeReferenceId();
    const detail = [String(error.message), info.componentStack ?? ""]
      .filter((part) => part !== "")
      .join("\n");
    // One logging place — the same id the panel displays.
    console.error(`[ErrorBoundary] ${referenceId}`, error, info.componentStack);
    // React may re-enter before the state update flushes (e.g. StrictMode
    // double-invoke); the latest id wins and it is the one logged last.
    this.setState({ referenceId, detail });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ServerErrorPanel
          referenceId={this.state.referenceId ?? "E-UNKNOWN"}
          detail={this.state.detail === "" ? undefined : this.state.detail}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}
