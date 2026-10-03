export type Papel = "admin" | "personal" | "aluno";

export interface Perfil {
  id: string;
  nome: string;
  papel: Papel;
  trocar_senha: boolean;
  onboarding_ok: boolean;
  criado_em: string;
}

export type PlanoAssinatura = "gratis" | "mensal" | "anual" | "beta";
export type StatusAsaas = "nao_iniciado" | "pendente" | "aprovada" | "recusada";

export interface Personal {
  id: string;
  plano: PlanoAssinatura;
  bloqueio_ativo: boolean;
  bloqueio_dias: number;
  lembrete_antes: boolean;
  lembrete_dia: boolean;
  lembrete_depois: boolean;
  avisar_whatsapp: boolean;
  checkin_dia: number;
  asaas_status: StatusAsaas;
  asaas_conta_id: string | null;
  asaas_wallet_id: string | null;
  asaas_onboarding_url: string | null;
  asaas_tipo: "fisica" | "juridica" | null;
  asaas_doc_final: string | null;
  asaas_criada_em: string | null;
  criado_em: string;
}

export type Objetivo = "emagrecer" | "ganhar_massa" | "condicionamento" | "saude" | "outro";
export type FormaPagamento = "pix_automatico" | "cartao" | "pix_boleto" | "fora_do_app";

export interface Aluno {
  id: string;
  personal_id: string;
  user_id: string | null;
  nome: string;
  email: string | null;
  whatsapp: string;
  cpf: string | null;
  nascimento: string | null;
  objetivo: Objetivo;
  observacoes: string;
  status: "ativo" | "arquivado";
  plano_id: string | null;
  dia_vencimento: number;
  forma_pagamento: FormaPagamento;
  inicio_cobranca: string | null;
  consentimento_em: string | null;
  convidado_em: string | null;
  criado_em: string;
}

export interface Plano {
  id: string;
  personal_id: string;
  nome: string;
  valor: number;
  descricao: string;
  ativo: boolean;
  criado_em: string;
}

export interface Anamnese {
  aluno_id: string;
  personal_id: string;
  parq_ok: boolean | null;
  parq_obs: string;
  lesoes: string;
  rotina: string;
  objetivo_texto: string;
  medicamentos: string;
  atualizado_em: string;
}

export type Medida = "peso" | "gordura" | "cintura" | "quadril" | "braco" | "coxa" | "massa_magra";

export interface Meta {
  id: string;
  personal_id: string;
  aluno_id: string;
  medida: Medida;
  inicio: number;
  alvo: number;
  criado_em: string;
}

export interface Avaliacao {
  id: string;
  personal_id: string;
  aluno_id: string;
  data: string;
  peso: number | null;
  gordura: number | null;
  cintura: number | null;
  quadril: number | null;
  braco: number | null;
  coxa: number | null;
  massa_magra: number | null;
  observacoes: string;
  criado_em: string;
}

export interface Checkin {
  id: string;
  personal_id: string;
  aluno_id: string;
  data: string;
  peso: number | null;
  sono: number | null;
  energia: number | null;
  treinos_feitos: number | null;
  dor: boolean;
  dor_texto: string;
  recado: string;
  resposta: string;
  respondido_em: string | null;
  criado_em: string;
}

export type Angulo = "frente" | "lado" | "costas";

export interface Foto {
  id: string;
  personal_id: string;
  aluno_id: string;
  data: string;
  angulo: Angulo;
  caminho: string;
  origem: "avaliacao" | "checkin";
  criado_em: string;
}

export const GRUPOS = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Pernas", "Glúteos", "Abdômen", "Cardio", "Outros"] as const;
export type Grupo = (typeof GRUPOS)[number];

export interface Exercicio {
  id: string;
  personal_id: string;
  nome: string;
  grupo: Grupo;
  video_caminho: string | null;
  video_link: string | null;
  dica: string;
  proprio: boolean;
  ativo: boolean;
  criado_em: string;
}

export interface Ficha {
  id: string;
  personal_id: string;
  aluno_id: string;
  nome: string;
  dias: string;
  ordem: number;
  valida_ate: string | null;
  ativa: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface FichaItem {
  id: string;
  personal_id: string;
  ficha_id: string;
  exercicio_id: string;
  ordem: number;
  series: string;
  repeticoes: string;
  carga: string;
  descanso: string;
  observacao: string;
}

export interface TreinoFeito {
  id: string;
  personal_id: string;
  aluno_id: string;
  ficha_id: string | null;
  data: string;
  concluido: boolean;
  duracao_min: number | null;
  criado_em: string;
}

export interface SerieFeita {
  id: string;
  personal_id: string;
  aluno_id: string;
  treino_id: string;
  exercicio_id: string;
  serie: number;
  carga: number | null;
  repeticoes: number | null;
  criado_em: string;
}

export interface Mensagem {
  id: string;
  personal_id: string;
  aluno_id: string;
  autor_id: string;
  tipo: "texto" | "foto" | "audio" | "checkin";
  texto: string;
  arquivo: string | null;
  duracao_seg: number | null;
  checkin_id: string | null;
  lida_em: string | null;
  criado_em: string;
}

export type FormaCobranca = "pix" | "boleto" | "cartao" | "pix_automatico" | "fora_do_app";

export interface Cobranca {
  id: string;
  personal_id: string;
  aluno_id: string;
  plano_id: string | null;
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string | null;
  status: "pendente" | "paga" | "cancelada";
  forma: FormaCobranca | null;
  taxa: number | null;
  pago_em: string | null;
  asaas_id: string | null;
  pix_copia_cola: string | null;
  link_pagamento: string | null;
  criado_em: string;
}
