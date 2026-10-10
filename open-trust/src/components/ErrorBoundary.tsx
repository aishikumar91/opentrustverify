import React from "react";

type State = { crashed: boolean; errorId: string };

/** Catches render crashes in the console so one bad panel never blanks the app. */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { crashed: false, errorId: "" };

  static getDerivedStateFromError(): Partial<State> {
    return { crashed: true, errorId: Math.random().toString(36).slice(2, 10) };
  }

  componentDidCatch(err: unknown) {
    console.error("UI crash:", err instanceof Error ? err.message : err);
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div className="font-ui flex min-h-screen items-center justify-center bg-[#F4F6FA] p-4">
        <div className="w-full max-w-sm rounded-[24px] border border-[#DDE1EA] bg-white p-6 text-center">
          <p className="text-sm font-semibold text-[#101828]">Something went wrong</p>
          <p className="mt-2 break-words font-mono text-[11px] text-[#5B6472]">
            Error {this.state.errorId} — your session and funds are safe.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ crashed: false, errorId: "" })}
            className="mt-4 min-h-10 w-full rounded-full bg-[#D7FF00] px-4 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
