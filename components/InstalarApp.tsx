"use client";

import { useEffect, useState } from "react";
import { Botao, Card, CardTopo } from "./ui";

export function InstalarApp() {
  const [evento, setEvento] = useState<any>(null);
  const [instalado, setInstalado] = useState(false);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvento(e); };
    window.addEventListener("beforeinstallprompt", h);
    setInstalado(window.matchMedia("(display-mode: standalone)").matches);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return (
    <Card>
      <CardTopo titulo="Instalar no celular" sub={instalado ? "O app já está instalado neste aparelho" : "Abre como app, com ícone na tela inicial"} />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-2 text-sm text-texto2">
        {evento ? <Botao onClick={() => evento.prompt()}>Instalar agora</Botao> : null}
        <p><b className="text-tinta">iPhone:</b> no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p>
        <p><b className="text-tinta">Android:</b> no Chrome, toque nos três pontinhos e em “Instalar app”.</p>
      </div>
    </Card>
  );
}
