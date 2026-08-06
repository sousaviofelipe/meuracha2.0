import {
  dbListarPresencas,
  dbBuscarPresenca,
  dbConfirmarPresenca,
  dbCancelarPresenca,
  dbJustificarFalta,
  dbContarPresencas,
  dbPresencasDoJogador,
  dbToggleBloqueioJogador,
} from "@/lib/db/presencas.db";
import { Presenca } from "@/types";

export async function listarPresencas(partida_id: string): Promise<Presenca[]> {
  return dbListarPresencas(partida_id);
}

export async function buscarPresenca(
  partida_id: string,
  jogador_id: string,
): Promise<Presenca | null> {
  return dbBuscarPresenca(partida_id, jogador_id);
}

export async function confirmarPresenca(
  partida_id: string,
  jogador_id: string,
): Promise<Presenca> {
  return dbConfirmarPresenca(partida_id, jogador_id);
}

export async function justificarFalta(
  partida_id: string,
  jogador_id: string,
  motivo: string,
): Promise<Presenca> {
  return dbJustificarFalta(partida_id, jogador_id, motivo);
}

export async function cancelarPresenca(
  partida_id: string,
  jogador_id: string,
): Promise<void> {
  return dbCancelarPresenca(partida_id, jogador_id);
}

export async function contarPresencas(partida_id: string): Promise<number> {
  return dbContarPresencas(partida_id);
}

export async function presencasDoJogador(
  jogador_id: string,
): Promise<Presenca[]> {
  return dbPresencasDoJogador(jogador_id);
}

export async function togglePresenca(
  partida_id: string,
  jogador_id: string,
): Promise<{ confirmado: boolean }> {
  const presenca = await dbBuscarPresenca(partida_id, jogador_id);

  if (!presenca || !presenca.confirmado) {
    await dbConfirmarPresenca(partida_id, jogador_id);
    return { confirmado: true };
  } else {
    await dbCancelarPresenca(partida_id, jogador_id);
    return { confirmado: false };
  }
}

export async function toggleBloqueioJogador(
  jogador_id: string,
  bloqueado: boolean,
): Promise<void> {
  return dbToggleBloqueioJogador(jogador_id, bloqueado);
}

// Utilitário para verificar se o horário limite passou
export function horarioLimitePassou(
  dataPartida: string,
  horarioLimite: string | undefined,
): boolean {
  if (!horarioLimite) return false;

  const agora = new Date();
  const [horas, minutos] = horarioLimite.split(":").map(Number);

  const limite = new Date(dataPartida + "T12:00:00");
  limite.setHours(horas, minutos, 0, 0);

  return agora >= limite;
}

// Separa presenças em três grupos
export function agruparPresencas(
  presencas: Presenca[],
  todosJogadores: any[],
): {
  confirmados: Presenca[];
  ausencias: Presenca[];
  semResposta: any[];
} {
  const confirmados = presencas.filter((p) => p.confirmado);
  const ausencias = presencas.filter((p) => !p.confirmado && p.motivo);
  const idsComResposta = new Set(presencas.map((p) => p.jogador_id));
  // Jogadores bloqueados não aparecem em "sem resposta"
  const semResposta = todosJogadores.filter(
    (j) => !idsComResposta.has(j.id) && !j.bloqueado,
  );

  return { confirmados, ausencias, semResposta };
}
