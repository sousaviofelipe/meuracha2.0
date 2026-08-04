import { getSupabase } from "@/lib/db/supabase";
import { Jogador, Posicao, VinculoPendente } from "@/types";

export async function dbListarJogadores(rachaId: string): Promise<Jogador[]> {
  const { data } = await getSupabase()
    .from("jogadores")
    .select("*")
    .eq("racha_id", rachaId)
    .order("nome");
  return data ?? [];
}

export async function dbCriarJogador(
  rachaId: string,
  nome: string,
  posicao: Posicao,
  fotoUrl?: string,
  email?: string,
): Promise<Jogador> {
  const { data, error } = await getSupabase()
    .from("jogadores")
    .insert({
      racha_id: rachaId,
      nome,
      posicao,
      foto_url: fotoUrl,
      email: email ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbEditarJogador(
  id: string,
  nome: string,
  posicao: Posicao,
  fotoUrl?: string,
  email?: string,
): Promise<Jogador> {
  const { data, error } = await getSupabase()
    .from("jogadores")
    .update({ nome, posicao, foto_url: fotoUrl, email: email ?? null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbToggleJogador(
  id: string,
  ativo: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from("jogadores")
    .update({ ativo })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbDeletarJogador(id: string): Promise<void> {
  const { error } = await getSupabase().from("jogadores").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function uploadFotoJogador(
  file: File,
  jogadorId: string,
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${jogadorId}.${ext}`;
  const { error } = await getSupabase()
    .storage.from("jogadores")
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = getSupabase().storage.from("jogadores").getPublicUrl(path);
  return data.publicUrl;
}

export async function dbToggleMensalista(
  id: string,
  mensalista: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from("jogadores")
    .update({ mensalista })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Novas funções ---

export async function dbBuscarJogadorPorUserId(
  userId: string,
): Promise<Jogador[]> {
  const { data, error } = await getSupabase()
    .from("jogadores")
    .select("*")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Busca os rachas separadamente para evitar problema de RLS no join
  const rachaIds = [...new Set(data.map((j: any) => j.racha_id))];
  const { data: rachas } = await getSupabase()
    .from("rachas")
    .select("id, nome, codigo")
    .in("id", rachaIds);

  return data.map((j) => ({
    ...j,
    racha: rachas?.find((r) => r.id === j.racha_id) ?? null,
  }));
}

export async function dbBuscarJogadorPorEmail(
  email: string,
  rachaId: string,
): Promise<Jogador | null> {
  const { data } = await getSupabase()
    .from("jogadores")
    .select("*")
    .eq("email", email)
    .eq("racha_id", rachaId)
    .maybeSingle();
  return data ?? null;
}

export async function dbVincularJogadorManualmente(
  jogadorId: string,
  userId: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("jogadores")
    .update({ user_id: userId })
    .eq("id", jogadorId);
  if (error) throw new Error(error.message);
}

export async function dbDesvincularJogador(jogadorId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("jogadores")
    .update({ user_id: null })
    .eq("id", jogadorId);
  if (error) throw new Error(error.message);
}

export async function dbListarVinculosPendentes(
  rachaId: string,
): Promise<VinculoPendente[]> {
  const { data, error } = await getSupabase()
    .from("vinculos_pendentes")
    .select("*, jogador:jogadores(*)")
    .eq("racha_id", rachaId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function dbAprovarVinculo(
  vinculoId: string,
  jogadorId: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabase();

  const { error: vinculoError } = await supabase
    .from("vinculos_pendentes")
    .delete()
    .eq("id", vinculoId);
  if (vinculoError) throw new Error(vinculoError.message);

  const { error: jogadorError } = await supabase
    .from("jogadores")
    .update({ user_id: userId })
    .eq("id", jogadorId);
  if (jogadorError) throw new Error(jogadorError.message);
}

export async function dbRejeitarVinculo(vinculoId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("vinculos_pendentes")
    .delete()
    .eq("id", vinculoId);
  if (error) throw new Error(error.message);
}
