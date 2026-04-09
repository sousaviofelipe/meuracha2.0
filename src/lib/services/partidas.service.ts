import {
  dbListarPartidas,
  dbCriarPartida,
  dbEncerrarPartida,
  dbDeletarPartida,
  dbGetEventosPartida,
  dbAdicionarEvento,
  dbRemoverEvento,
  dbAtualizarPlacar,
  dbIniciarCronometro,
  dbPausarCronometro,
  dbResetarCronometro,
} from "@/lib/db/partidas.db";
import { Partida, EventoPartida, TipoEvento } from "@/types";

export async function listarPartidas(rachaId: string): Promise<Partida[]> {
  return dbListarPartidas(rachaId);
}

export async function criarPartida(
  rachaId: string,
  data: string,
  timeA: string,
  timeB: string,
  local?: string,
): Promise<Partida> {
  return dbCriarPartida(rachaId, data, timeA, timeB, local);
}

export async function encerrarPartida(id: string): Promise<void> {
  return dbEncerrarPartida(id);
}

export async function deletarPartida(id: string): Promise<void> {
  return dbDeletarPartida(id);
}

export async function getEventosPartida(
  partidaId: string,
): Promise<EventoPartida[]> {
  return dbGetEventosPartida(partidaId);
}

export async function adicionarEvento(
  partidaId: string,
  jogadorId: string,
  tipo: TipoEvento,
  time: "A" | "B",
  minuto?: number,
): Promise<EventoPartida> {
  return dbAdicionarEvento(partidaId, jogadorId, tipo, time, minuto);
}

export async function iniciarCronometro(id: string): Promise<void> {
  return dbIniciarCronometro(id);
}

export async function pausarCronometro(
  id: string,
  segundos: number,
): Promise<void> {
  return dbPausarCronometro(id, segundos);
}

export async function resetarCronometro(id: string): Promise<void> {
  return dbResetarCronometro(id);
}

export async function removerEvento(id: string): Promise<void> {
  return dbRemoverEvento(id);
}

export async function atualizarPlacar(
  id: string,
  golsTimeA: number,
  golsTimeB: number,
): Promise<void> {
  return dbAtualizarPlacar(id, golsTimeA, golsTimeB);
}
