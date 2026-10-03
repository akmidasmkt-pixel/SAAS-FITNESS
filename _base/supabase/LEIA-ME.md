# Supabase da base C-Level

Os modelos em `modelos/` são genéricos e já foram testados no banco real:

1. `01_acesso_beta_por_convite.sql`: perfis, primeiro administrador por código e trava de beta fechado.
2. `02_tabela_com_dono.sql`: padrão de tabela em que cada usuário só vê os próprios dados.
3. `03_teste_permissoes.sql`: teste de permissões com dois usuários falsos, desfeito no final.

## Código de referência no ar (C-Level Finanças & Agenda)

Projeto Supabase `clevel-financas`, ref `oboaxkuznsjhlyravbhl`, região sa-east-1 (São Paulo).

- Funções (leia com `get_edge_function` e adapte):
  - `acesso` (verify_jwt desligado; valida o admin por dentro): status, primeiro_acesso, convidar, resetar_senha, listar. Libera o e-mail em `convites_pendentes` antes de `auth.admin.createUser`.
  - `agenda-ics` (verify_jwt desligado): agenda em formato .ics por token de 64 caracteres hex; o app repassa por `/api/agenda/[token]` para o link usar o domínio do produto.
  - `copiloto` (verify_jwt ligado): IA com ferramentas que grava com o login do usuário, então as regras de acesso valem para a IA. Precisa do segredo `ANTHROPIC_API_KEY`, que o Ramon cadastra no painel.
- Esquema completo: `select version, name, statements from supabase_migrations.schema_migrations order by version;`
- Funções SQL: `select pg_get_functiondef('public.nome(args)'::regprocedure);`
