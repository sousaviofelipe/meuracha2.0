import { getSupabase } from "@/lib/db/supabase";
import { Racha, Estatistica, Notificacao, Enquete, Partida } from "@/types";
import { Escalacao } from "@/types";

export async function dbGetEscalacaoAtivaRacha(
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
export async function dbAtualizarRacha(
  id: string,
  nome: string,
  descricao: string,
  codigo: string,
): Promise<Racha> {
  const { data, error } = await getSupabase()
    .from("rachas")
    .update({ nome, descricao, codigo })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbVerificarCodigoDisponivel(
  codigo: string,
  rachaId: string,
): Promise<boolean> {
  const { data } = await getSupabase()
    .from("rachas")
    .select("id")
    .eq("codigo", codigo.toUpperCase())
    .neq("id", rachaId)
    .single();
  return !data;
}
export async function dbAtualizarEstatuto(
  id: string,
  url: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("rachas")
    .update({ estatuto_url: url })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbUploadEstatuto(
  file: File,
  rachaId: string,
): Promise<string> {
  const path = `${rachaId}/estatuto.pdf`;
  const { error } = await getSupabase()
    .storage.from("documentos")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (error) throw new Error(error.message);
  const { data } = getSupabase().storage.from("documentos").getPublicUrl(path);
  return data.publicUrl;
}
