import { getSupabase } from "@/lib/db/supabase";
import { Enquete, EnqueteOpcao } from "@/types";

export async function dbListarEnquetes(rachaId: string): Promise<Enquete[]> {
  const { data } = await getSupabase()
    .from("enquetes")
    .select("*, opcoes:enquete_opcoes(*)")
    .eq("racha_id", rachaId)
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function dbCriarEnquete(
  rachaId: string,
  pergunta: string,
  opcoes: string[],
): Promise<Enquete> {
  const { data, error } = await getSupabase()
    .from("enquetes")
    .insert({ racha_id: rachaId, pergunta })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const opcoesData = opcoes.map((opcao) => ({ enquete_id: data.id, opcao }));
  const { error: errOpcoes } = await getSupabase()
    .from("enquete_opcoes")
    .insert(opcoesData);
  if (errOpcoes) throw new Error(errOpcoes.message);

  return data;
}

export async function dbToggleEnquete(
  id: string,
  ativa: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from("enquetes")
    .update({ ativa })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbDeletarEnquete(id: string): Promise<void> {
  const { error } = await getSupabase().from("enquetes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbVotar(opcaoId: string): Promise<void> {
  const { error } = await getSupabase().rpc("incrementar_voto", {
    opcao_id: opcaoId,
  });
  if (error) throw new Error(error.message);
}
