import { Escalacao } from "@/types";
import { getSupabase } from "@/lib/db/supabase";
import {
  Racha,
  Estatistica,
  Notificacao,
  Enquete,
  Partida,
  EventoPartida,
} from "@/types";

export async function dbGetEscalacaoAtivaPublico(
  rachaId: string,
): Promise<Escalacao | null> {
  const { data } = await getSupabase()
    .from("escalacoes")
    .select("*")
    .eq("racha_id", rachaId)
    .eq("ativa", true)
    .order("criado_em", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function dbGetRachaPorCodigo(
  codigo: string,
): Promise<Racha | null> {
  const { data } = await getSupabase()
    .from("rachas")
    .select("*")
    .eq("codigo", codigo.toUpperCase())
    .single();
  return data;
}

export async function dbGetEstatisticasPublico(
  rachaId: string,
): Promise<Estatistica[]> {
  const { data } = await getSupabase()
    .from("estatisticas")
    .select("*, jogador:jogadores(id, nome, posicao, foto_url)")
    .eq("racha_id", rachaId);
  return data ?? [];
}

export async function dbGetNotificacaoAtivaPublico(
  rachaId: string,
): Promise<Notificacao | null> {
  const { data } = await getSupabase()
    .from("notificacoes")
    .select("*")
    .eq("racha_id", rachaId)
    .eq("ativa", true)
    .order("criado_em", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function dbGetEnqueteAtivaPublico(
  rachaId: string,
): Promise<Enquete | null> {
  const { data } = await getSupabase()
    .from("enquetes")
    .select(
      "*, opcoes:enquete_opcoes(*, jogador:jogadores(id, nome, foto_url))",
    )
    .eq("racha_id", rachaId)
    .eq("ativa", true)
    .order("criado_em", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function dbDesvotarPublico(opcaoId: string): Promise<void> {
  const { error } = await getSupabase().rpc("decrementar_voto", {
    opcao_id: opcaoId,
  });
  if (error) throw new Error(error.message);
}

export async function dbGetUltimaPartidaPublico(
  rachaId: string,
): Promise<Partida | null> {
  const { data } = await getSupabase()
    .from("partidas")
    .select("*")
    .eq("racha_id", rachaId)
    .eq("encerrada", true)
    .order("data", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function dbGetEventosPartidaPublico(
  partidaId: string,
): Promise<EventoPartida[]> {
  const { data } = await getSupabase()
    .from("eventos_partida")
    .select("*, jogador:jogadores(id, nome, posicao, foto_url)")
    .eq("partida_id", partidaId)
    .order("criado_em");
  return data ?? [];
}

export async function dbGetPartidasPublico(
  rachaId: string,
): Promise<Partida[]> {
  const { data } = await getSupabase()
    .from("partidas")
    .select("*")
    .eq("racha_id", rachaId)
    .eq("encerrada", true)
    .order("data", { ascending: false });
  return data ?? [];
}

export async function dbVotarPublico(opcaoId: string): Promise<void> {
  const { error } = await getSupabase().rpc("incrementar_voto", {
    opcao_id: opcaoId,
  });
  if (error) throw new Error(error.message);
}
