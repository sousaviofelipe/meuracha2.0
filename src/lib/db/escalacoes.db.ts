import { getSupabase } from "@/lib/db/supabase";
import { Escalacao } from "@/types";

export async function dbGetEscalacaoAtiva(
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

export async function dbCriarEscalacao(
  rachaId: string,
  nomeTimeA: string,
  nomeTimeB: string,
  jogadoresTimeA: string[],
  jogadoresTimeB: string[],
): Promise<Escalacao> {
  // Desativa escalações anteriores
  await getSupabase()
    .from("escalacoes")
    .update({ ativa: false })
    .eq("racha_id", rachaId);

  const { data, error } = await getSupabase()
    .from("escalacoes")
    .insert({
      racha_id: rachaId,
      nome_time_a: nomeTimeA,
      nome_time_b: nomeTimeB,
      jogadores_time_a: jogadoresTimeA,
      jogadores_time_b: jogadoresTimeB,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbRemoverEscalacao(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("escalacoes")
    .update({ ativa: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
