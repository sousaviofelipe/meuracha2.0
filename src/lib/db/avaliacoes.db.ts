import { getSupabase } from "@/lib/db/supabase";
import { Avaliacao } from "@/types";

export async function dbListarAvaliacoesDoJogador(
  jogadorId: string,
): Promise<Avaliacao[]> {
  const { data, error } = await getSupabase()
    .from("avaliacoes")
    .select("*")
    .eq("jogador_id", jogadorId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function dbBuscarAvaliacaoDoUsuario(
  avaliadorId: string,
  jogadorId: string,
): Promise<Avaliacao | null> {
  const { data } = await getSupabase()
    .from("avaliacoes")
    .select("*")
    .eq("avaliador_id", avaliadorId)
    .eq("jogador_id", jogadorId)
    .maybeSingle();
  return data ?? null;
}

export async function dbSalvarAvaliacao(
  rachaId: string,
  avaliadorId: string,
  jogadorId: string,
  nota: number,
): Promise<Avaliacao> {
  const { data, error } = await getSupabase()
    .from("avaliacoes")
    .upsert(
      {
        racha_id: rachaId,
        avaliador_id: avaliadorId,
        jogador_id: jogadorId,
        nota,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "racha_id,avaliador_id,jogador_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbListarJogadoresComNivel(
  rachaId: string,
): Promise<any[]> {
  const { data, error } = await getSupabase()
    .from("jogadores")
    .select("*, nivel_medio")
    .eq("racha_id", rachaId)
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function dbListarAvaliacoesDoAvaliador(
  avaliadorId: string,
  rachaId: string,
): Promise<Avaliacao[]> {
  const { data, error } = await getSupabase()
    .from("avaliacoes")
    .select("*")
    .eq("avaliador_id", avaliadorId)
    .eq("racha_id", rachaId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function dbListarTotalPartidas(
  rachaId: string,
): Promise<{ jogador_id: string; total_partidas: number }[]> {
  const { data, error } = await getSupabase()
    .from("jogador_partidas")
    .select("jogador_id, total_partidas")
    .eq("racha_id", rachaId);
  if (error) throw new Error(error.message);
  return data ?? [];
}
