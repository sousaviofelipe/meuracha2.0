export type Posicao = "Goleiro" | "Defensor" | "Meio-campo" | "Atacante";
export type TipoEvento =
  | "gol"
  | "assistencia"
  | "cartao_amarelo"
  | "cartao_vermelho";

export interface Racha {
  id: string;
  admin_id: string;
  nome: string;
  codigo: string;
  descricao?: string;
  criado_em: string;
}

export interface Jogador {
  id: string;
  racha_id: string;
  nome: string;
  posicao: Posicao;
  foto_url?: string;
  ativo: boolean;
  mensalista: boolean;
  criado_em: string;
}

export interface EventoPartida {
  id: string;
  partida_id: string;
  jogador_id: string;
  tipo: TipoEvento;
  time?: "A" | "B";
  minuto?: number;
  criado_em: string;
}

export interface Partida {
  id: string;
  racha_id: string;
  data: string;
  local?: string;
  time_a: string;
  time_b: string;
  gols_time_a: number;
  gols_time_b: number;
  encerrada: boolean;
  cronometro_inicio?: string;
  cronometro_pausado?: number;
  criado_em: string;
}

export interface Estatistica {
  id: string;
  jogador_id: string;
  racha_id: string;
  gols: number;
  assistencias: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
  atualizado_em: string;
  jogador?: Jogador;
}

export interface Notificacao {
  id: string;
  racha_id: string;
  titulo: string;
  mensagem: string;
  ativa: boolean;
  criado_em: string;
}

export interface Enquete {
  id: string;
  racha_id: string;
  pergunta: string;
  ativa: boolean;
  tipo: "texto" | "jogador";
  criado_em: string;
  opcoes?: EnqueteOpcao[];
}

export interface EnqueteOpcao {
  id: string;
  enquete_id: string;
  opcao: string;
  votos: number;
  jogador_id?: string;
  jogador?: Jogador;
}

export interface Escalacao {
  id: string;
  racha_id: string;
  nome_time_a: string;
  nome_time_b: string;
  jogadores_time_a: string[];
  jogadores_time_b: string[];
  ativa: boolean;
  criado_em: string;
}
export interface Pagamento {
  id: string;
  racha_id: string;
  jogador_id: string;
  mes: number;
  ano: number;
  pago: boolean;
  pago_em?: string;
  criado_em: string;
}

export interface JogadorFinanceiro {
  jogador: Jogador;
  pagamentos: Pagamento[];
  mesesAtraso: number;
}
