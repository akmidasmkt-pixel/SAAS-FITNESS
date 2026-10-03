-- A geração automática das mensalidades grava o mês de referência (competencia).
-- Sem esta permissão, o personal não conseguia gerar as cobranças do mês.
grant insert (competencia) on public.cobrancas to authenticated;
