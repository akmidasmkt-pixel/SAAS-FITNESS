"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface Ui {
  avisar: (msg: string, tipo?: "ok" | "erro") => void;
}
const Ctx = createContext<Ui | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "erro"; id: number } | null>(null);

  const avisar = useCallback((msg: string, tipo: "ok" | "erro" = "ok") => setToast({ msg, tipo, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tipo === "erro" ? 5000 : 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const valor = useMemo(() => ({ avisar }), [avisar]);
  return (
    <Ctx.Provider value={valor}>
      {children}
      {toast ? (
        <div role="status" aria-live="polite" className="fixed z-[70] left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 px-4 w-full max-w-sm">
          <div className={`rounded-[12px] px-4 py-3 text-sm font-bold shadow-lg ${toast.tipo === "erro" ? "bg-vermelho text-white" : "bg-tinta text-white"}`}>{toast.msg}</div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useUi() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUi fora do UiProvider");
  return v;
}
