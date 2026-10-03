"use client";

import { useEffect, useState } from "react";

/** Lê um parâmetro do endereço (?nome=valor) depois de abrir a tela. */
export function useParam(nome: string): string | null {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    setV(new URLSearchParams(window.location.search).get(nome));
  }, [nome]);
  return v;
}
