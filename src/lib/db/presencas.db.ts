import { getSupabase } from "@/lib/db/supabase";
import { Presenca } from "@/types";

export async function dbListarPresencas(
  partida_id: string,
): Promise<Presenca[]> {
  const { data, error } = await getSupabase()
    .from("presencas")
    .select("*, jogador:jogadores(*)")
    .eq("partida_id", partida_id)
    .order("criado_em", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function dbBuscarPresenca(
  partida_id: string,
  jogador_id: string,
): Promise<Presenca | null> {
  const { data } = await getSupabase()
    .from("presencas")
    .select("*")
    .eq("partida_id", partida_id)
    .eq("jogador_id", jogador_id)
    .maybeSingle();
  return data ?? null;
}

export async function dbConfirmarPresenca(
  partida_id: string,
  jogador_id: string,
): Promise<Presenca> {
  const { data, error } = await getSupabase()
    .from("presencas")
    .upsert(
      { partida_id, jogador_id, confirmado: true, motivo: null },
      { onConflict: "partida_id,jogador_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbJustificarFalta(
  partida_id: string,
  jogador_id: string,
  motivo: string,
): Promise<Presenca> {
  const { data, error } = await getSupabase()
    .from("presencas")
    .upsert(
      { partida_id, jogador_id, confirmado: false, motivo },
      { onConflict: "partida_id,jogador_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbCancelarPresenca(
  partida_id: string,
  jogador_id: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("presencas")
    .update({ confirmado: false, motivo: null })
    .eq("partida_id", partida_id)
    .eq("jogador_id", jogador_id);
  if (error) throw new Error(error.message);
}

export async function dbContarPresencas(partida_id: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("presencas")
    .select("*", { count: "exact", head: true })
    .eq("partida_id", partida_id)
    .eq("confirmado", true);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function dbPresencasDoJogador(
  jogador_id: string,
): Promise<Presenca[]> {
  const { data, error } = await getSupabase()
    .from("presencas")
    .select("*, partida:partidas(*)")
    .eq("jogador_id", jogador_id)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function dbToggleBloqueioJogador(
  jogador_id: string,
  bloqueado: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from("jogadores")
    .update({ bloqueado })
    .eq("id", jogador_id);
  if (error) throw new Error(error.message);
}
