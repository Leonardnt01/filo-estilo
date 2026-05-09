"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "default";
};

const ConfirmCtx = createContext<{
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}>({ confirm: () => Promise.resolve(false) });

export function useConfirm() {
  return useContext(ConfirmCtx);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  function handle(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}

      {state && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => handle(false)} />

          {/* Modal */}
          <div
            className="relative w-full max-w-md rounded-2xl p-6 animate-fade-in shadow-2xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)" }}
          >
            {/* Icon */}
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
              style={
                state.opts.variant === "danger"
                  ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }
                  : { background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }
              }
            >
              {state.opts.variant === "danger" ? (
                <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <svg className="h-7 w-7" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            <h3 className="text-lg font-bold text-center" style={{ color: "var(--text-primary)" }}>
              {state.opts.title}
            </h3>
            <p className="mt-2 text-sm text-center" style={{ color: "var(--text-secondary)" }}>
              {state.opts.message}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handle(false)}
                className="admin-btn flex-1 justify-center !py-2.5"
              >
                {state.opts.cancelText ?? "Cancelar"} 
              </button>
              <button
                onClick={() => handle(true)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-all ${
                  state.opts.variant === "danger"
                    ? "bg-red-500 hover:bg-red-600"
                    : ""
                }`}
                style={
                  state.opts.variant !== "danger"
                    ? { background: "var(--accent)", color: "#fff" }
                    : undefined
                }
              >
                {state.opts.confirmText ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
