import { getSupabase } from "@/lib/db/supabase";
import { Racha, Estatistica, Notificacao, Enquete, Partida } from "@/types";

export async function dbGetRachaPorAdmin(
  adminId: string,
): Promise<Racha | null> {
  const { data } = await getSupabase()
    .from("rachas")
    .select("*")
    .eq("admin_id", adminId)
    .single();
  return data;
}

export async function dbGetEstatisticas(
  rachaId: string,
): Promise<Estatistica[]> {
  const { data } = await getSupabase()
    .from("estatisticas")
    .select("*, jogador:jogadores(id, nome, posicao, foto_url)")
    .eq("racha_id", rachaId)
    .order("gols", { ascending: false });
  return data ?? [];
}

export async function dbGetNotificacaoAtiva(
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

export async function dbGetEnqueteAtiva(
  rachaId: string,
): Promise<Enquete | null> {
  const { data } = await getSupabase()
    .from("enquetes")
    .select("*, opcoes:enquete_opcoes(*)")
    .eq("racha_id", rachaId)
    .eq("ativa", true)
    .order("criado_em", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function dbGetUltimaPartida(
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
