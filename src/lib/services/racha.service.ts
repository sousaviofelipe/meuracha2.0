import { getSupabase } from "@/lib/db/supabase";
import { Racha } from "@/types";

function gerarCodigo(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "RACHA-";
  for (let i = 0; i < 4; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

export async function criarRacha(
  adminId: string,
  nome: string,
  descricao?: string,
): Promise<Racha> {
  const supabase = getSupabase();
  const codigo = gerarCodigo();
  const { data, error } = await supabase
    .from("rachas")
    .insert({ admin_id: adminId, nome, descricao, codigo })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getRachaPorAdmin(adminId: string): Promise<Racha | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("rachas")
    .select("*")
    .eq("admin_id", adminId)
    .single();
  return data;
}

export async function getRachaPorCodigo(codigo: string): Promise<Racha | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("rachas")
    .select("*")
    .eq("codigo", codigo)
    .single();
  return data;
}
