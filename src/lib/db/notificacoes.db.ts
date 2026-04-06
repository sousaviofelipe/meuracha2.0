import { getSupabase } from "@/lib/db/supabase";
import { Notificacao } from "@/types";

export async function dbListarNotificacoes(
  rachaId: string,
): Promise<Notificacao[]> {
  const { data } = await getSupabase()
    .from("notificacoes")
    .select("*")
    .eq("racha_id", rachaId)
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function dbCriarNotificacao(
  rachaId: string,
  titulo: string,
  mensagem: string,
): Promise<Notificacao> {
  const { data, error } = await getSupabase()
    .from("notificacoes")
    .insert({ racha_id: rachaId, titulo, mensagem })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbEditarNotificacao(
  id: string,
  titulo: string,
  mensagem: string,
): Promise<Notificacao> {
  const { data, error } = await getSupabase()
    .from("notificacoes")
    .update({ titulo, mensagem })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbToggleNotificacao(
  id: string,
  ativa: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from("notificacoes")
    .update({ ativa })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbDeletarNotificacao(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("notificacoes")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
