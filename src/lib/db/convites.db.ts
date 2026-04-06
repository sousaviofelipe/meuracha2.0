import { getSupabase } from "@/lib/db/supabase";

export async function dbValidarConvite(codigo: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("convites")
    .select("*")
    .eq("codigo", codigo.toUpperCase())
    .eq("usado", false)
    .single();
  return !!data;
}

export async function dbUsarConvite(
  codigo: string,
  userId: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("convites")
    .update({ usado: true, usado_por: userId })
    .eq("codigo", codigo.toUpperCase());
  if (error) throw new Error(error.message);
}
