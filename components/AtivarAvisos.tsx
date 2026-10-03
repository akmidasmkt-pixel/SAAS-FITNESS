"use client";

import { useEffect, useState } from "react";
import { ativarAvisos, estadoAvisos, type EstadoAvisos } from "@/lib/push";
import { mensagemErro } from "@/lib/supabase";
import { useUi } from "@/lib/ui";
import { Botao, Card, CardTopo } from "./ui";
import { IconFechar } from "@/lib/icons";

function useAvisos() {
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);
  const [ativando, setAtivando] = useState(false);
  const { avisar } = useUi();
  useEffect(() => { estadoAvisos().then(setEstado).catch(() => setEstado("sem_suporte")); }, []);
  async function ativar() {
    setAtivando(true);
    try {
      const r = await ativarAvisos();
      setEstado(r);
      if (r === "ativo") avisar("Avisos ativados neste aparelho.");
      else if (r === "negado") avisar("Os avisos foram bloqueados. Libere nas configurações do navegador.", "erro");
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    } finally {
      setAtivando(false);
    }
  }
  return { estado, ativando, ativar };
}

const TEXTO_IPHONE = "No iPhone, os avisos funcionam com o app instalado: no Safari, toque em Compartilhar › “Adicionar à Tela de Início” e abra por lá.";

/** Faixa discreta no topo das telas iniciais, só enquanto os avisos não estão ligados. */
export function FaixaAvisos({ texto }: { texto: string }) {
  const { estado, ativando, ativar } = useAvisos();
  const [fechada, setFechada] = useState(true);
  useEffect(() => {
    try { setFechada(localStorage.getItem("clevel-faixa-avisos") === "fechada"); } catch { setFechada(false); }
  }, []);
  if (fechada || !estado || estado === "ativo" || estado === "sem_suporte" || estado === "negado") return null;
  function fechar() {
    setFechada(true);
    try { localStorage.setItem("clevel-faixa-avisos", "fechada"); } catch {}
  }
  return (
    <div className="rounded-2xl bg-azul-bg border border-azul-borda px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-azul-esc">Ative os avisos no celular</p>
        <p className="text-xs text-azul-esc/85 mt-0.5 leading-relaxed">{estado === "instalar_iphone" ? TEXTO_IPHONE : texto}</p>
        {estado === "inativo" ? <Botao pequeno className="mt-2" onClick={ativar} disabled={ativando}>{ativando ? "Ativando…" : "Ativar avisos"}</Botao> : null}
      </div>
      <button type="button" onClick={fechar} aria-label="Dispensar" className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-azul-esc/70 hover:bg-white/60 cursor-pointer"><IconFechar size={14} /></button>
    </div>
  );
}

/** Cartão para Ajustes e Pagamentos. */
export function CartaoAvisos({ texto }: { texto: string }) {
  const { estado, ativando, ativar } = useAvisos();
  const sub = {
    ativo: "Ligados neste aparelho",
    inativo: "Desligados neste aparelho",
    negado: "Bloqueados no navegador",
    sem_suporte: "Este navegador não recebe avisos",
    instalar_iphone: "Instale o app para receber",
  }[estado ?? "inativo"];
  return (
    <Card>
      <CardTopo titulo="Avisos no celular" sub={sub} />
      <div className="px-4 sm:px-5 pb-4 flex flex-col gap-2 text-sm text-texto2">
        <p>{texto}</p>
        {estado === "inativo" ? <Botao onClick={ativar} disabled={ativando}>{ativando ? "Ativando…" : "Ativar avisos"}</Botao> : null}
        {estado === "ativo" ? <Botao variante="secundario" onClick={ativar} disabled={ativando}>Mandar um aviso de teste</Botao> : null}
        {estado === "instalar_iphone" ? <p className="text-xs">{TEXTO_IPHONE}</p> : null}
        {estado === "negado" ? <p className="text-xs">Para liberar, toque no cadeado ao lado do endereço do site e permita as notificações.</p> : null}
      </div>
    </Card>
  );
}
