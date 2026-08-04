import { createSupabaseClient } from "@/lib/auth";
import { getSupabase } from "@/lib/db/supabase";
import { Jogador } from "@/types";

export async function signIn(email: string, password: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signUp(email: string, password: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const supabase = createSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getSession() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export async function getUser() {
  const supabase = createSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signInJogador(email: string, password: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signUpJogador(email: string, password: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { tipo: "jogador" } },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function buscarJogadoresDoUsuario(
  userId: string,
): Promise<Jogador[]> {
  const { data, error } = await getSupabase()
    .from("jogadores")
    .select("*, racha:rachas(id, nome, codigo)")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function solicitarVinculo(
  rachaId: string,
  userId: string,
  userEmail: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("vinculos_pendentes")
    .insert({ racha_id: rachaId, user_id: userId, usuario_email: userEmail });
  if (error) throw new Error(error.message);
}

export async function verificarVinculoPendente(
  rachaId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await getSupabase()
    .from("vinculos_pendentes")
    .select("id")
    .eq("racha_id", rachaId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("rachas")
    .select("id")
    .eq("admin_id", userId)
    .maybeSingle();
  return !!data;
}

export async function resetPassword(email: string): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/jogador/nova-senha`,
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
