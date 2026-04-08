import { getSupabase } from "@/lib/db/supabase";
import { Jogador, Posicao } from "@/types";

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
): Promise<Jogador> {
  const { data, error } = await getSupabase()
    .from("jogadores")
    .insert({ racha_id: rachaId, nome, posicao, foto_url: fotoUrl })
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
): Promise<Jogador> {
  const { data, error } = await getSupabase()
    .from("jogadores")
    .update({ nome, posicao, foto_url: fotoUrl })
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
