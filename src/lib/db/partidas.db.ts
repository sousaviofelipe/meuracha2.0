import { getSupabase } from "@/lib/db/supabase";
import { Partida, EventoPartida, TipoEvento } from "@/types";

export async function dbListarPartidas(rachaId: string): Promise<Partida[]> {
  const { data } = await getSupabase()
    .from("partidas")
    .select("*")
    .eq("racha_id", rachaId)
    .order("data", { ascending: false });
  return data ?? [];
}

export async function dbCriarPartida(
  rachaId: string,
  data: string,
  timeA: string,
  timeB: string,
  local?: string,
): Promise<Partida> {
  const { data: d, error } = await getSupabase()
    .from("partidas")
    .insert({ racha_id: rachaId, data, time_a: timeA, time_b: timeB, local })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return d;
}

export async function dbEncerrarPartida(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("partidas")
    .update({ encerrada: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbDeletarPartida(id: string): Promise<void> {
  const { error } = await getSupabase().from("partidas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbGetEventosPartida(
  partidaId: string,
): Promise<EventoPartida[]> {
  const { data } = await getSupabase()
    .from("eventos_partida")
    .select("*, jogador:jogadores(id, nome, posicao, foto_url)")
    .eq("partida_id", partidaId)
    .order("criado_em");
  return data ?? [];
}

export async function dbAdicionarEvento(
  partidaId: string,
  jogadorId: string,
  tipo: TipoEvento,
  time: "A" | "B",
): Promise<EventoPartida> {
  const { data, error } = await getSupabase()
    .from("eventos_partida")
    .insert({ partida_id: partidaId, jogador_id: jogadorId, tipo, time })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbRemoverEvento(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("eventos_partida")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbAtualizarPlacar(
  id: string,
  golsTimeA: number,
  golsTimeB: number,
): Promise<void> {
  const { error } = await getSupabase()
    .from("partidas")
    .update({ gols_time_a: golsTimeA, gols_time_b: golsTimeB })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
