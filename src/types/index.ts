export type Posicao = "Goleiro" | "Defensor" | "Meio-campo" | "Atacante";
export type TipoEvento =
  | "gol"
  | "gol_contra"
  | "assistencia"
  | "cartao_amarelo"
  | "cartao_vermelho";

export interface Racha {
  id: string;
  admin_id: string;
  nome: string;
  codigo: string;
  descricao?: string;
  whatsapp_diretoria?: string;
  horario_limite_presenca?: string;
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
  email?: string;
  user_id?: string;
  bloqueado: boolean;
  nivel_medio?: number | null;
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

// --- Novas interfaces ---

export interface Presenca {
  id: string;
  partida_id: string;
  jogador_id: string;
  confirmado: boolean;
  motivo?: string;
  criado_em: string;
  jogador?: Jogador;
}

export interface PartidaComPresencas extends Partida {
  presencas?: Presenca[];
  total_confirmados?: number;
}

export interface JogadorPerfil {
  jogador: Jogador;
  estatisticas?: Estatistica;
  presencas_confirmadas: number;
  rachas: RachaDoJogador[];
}

export interface RachaDoJogador {
  racha_id: string;
  racha_nome: string;
  racha_codigo: string;
  jogador_id: string;
  vinculado: boolean;
}

export interface VinculoPendente {
  id: string;
  jogador_id: string;
  racha_id: string;
  user_id: string;
  usuario_email?: string;
  usuario_nome?: string; // <- adicionar aqui
  criado_em: string;
  jogador?: Jogador;
}

export interface Avaliacao {
  id: string;
  racha_id: string;
  avaliador_id: string;
  jogador_id: string;
  nota: number;
  criado_em: string;
  atualizado_em: string;
}

export interface JogadorComNivel extends Jogador {
  nivel_medio?: number | null;
  total_partidas?: number;
  avaliacao_do_usuario?: number | null;
}

export interface EscalacaoGerada {
  time_a: JogadorComNivel[];
  time_b: JogadorComNivel[];
  nome_time_a: string;
  nome_time_b: string;
}
