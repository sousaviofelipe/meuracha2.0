import { getSupabase } from "@/lib/db/supabase";
import { Enquete } from "@/types";

export async function dbListarEnquetes(rachaId: string): Promise<Enquete[]> {
  const { data } = await getSupabase()
    .from("enquetes")
    .select(
      "*, opcoes:enquete_opcoes(*, jogador:jogadores(id, nome, foto_url))",
    )
    .eq("racha_id", rachaId)
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function dbCriarEnqueteTexto(
  rachaId: string,
  pergunta: string,
  opcoes: string[],
): Promise<Enquete> {
  const { data, error } = await getSupabase()
    .from("enquetes")
    .insert({ racha_id: rachaId, pergunta, tipo: "texto" })
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

export async function dbCriarEnqueteJogador(
  rachaId: string,
  pergunta: string,
  jogadorIds: string[],
): Promise<Enquete> {
  const { data, error } = await getSupabase()
    .from("enquetes")
    .insert({ racha_id: rachaId, pergunta, tipo: "jogador" })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Busca nomes dos jogadores para usar como label da opção
  const { data: jogs } = await getSupabase()
    .from("jogadores")
    .select("id, nome")
    .in("id", jogadorIds);

  const opcoesData = jogadorIds.map((jid) => {
    const j = jogs?.find((x) => x.id === jid);
    return { enquete_id: data.id, opcao: j?.nome ?? "", jogador_id: jid };
  });

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

export async function dbDesvotarOpcao(opcaoId: string): Promise<void> {
  const { error } = await getSupabase().rpc("decrementar_voto", {
    opcao_id: opcaoId,
  });
  if (error) throw new Error(error.message);
}
