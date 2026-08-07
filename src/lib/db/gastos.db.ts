import { getSupabase } from "@/lib/db/supabase";
import { Gasto, CategoriaGasto } from "@/types";

export const CATEGORIAS_GASTO: Record<CategoriaGasto, string> = {
  campo: "🏟️ Campo",
  arbitragem: "🦺 Arbitragem",
  agua: "💧 Água",
  farmacia: "💊 Farmácia",
  outros: "📦 Outros",
};

export async function dbListarGastos(rachaId: string): Promise<Gasto[]> {
  const { data, error } = await getSupabase()
    .from("gastos")
    .select("*")
    .eq("racha_id", rachaId)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function dbListarGastosPorMes(
  rachaId: string,
  mes: number,
  ano: number,
): Promise<Gasto[]> {
  const { data, error } = await getSupabase()
    .from("gastos")
    .select("*")
    .eq("racha_id", rachaId)
    .eq("mes", mes)
    .eq("ano", ano)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function dbCriarGasto(
  rachaId: string,
  categoria: CategoriaGasto,
  valor: number,
  mes: number,
  ano: number,
  descricao?: string,
  dia?: number,
): Promise<Gasto> {
  const { data, error } = await getSupabase()
    .from("gastos")
    .insert({
      racha_id: rachaId,
      categoria,
      valor,
      mes,
      ano,
      dia: dia ?? null,
      descricao: descricao?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function dbDeletarGasto(id: string): Promise<void> {
  const { error } = await getSupabase().from("gastos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbGetBalanco(
  rachaId: string,
  mes?: number,
  ano?: number,
): Promise<{ totalArrecadado: number; totalGastos: number; saldo: number }> {
  const supabase = getSupabase();

  let pagQuery = supabase
    .from("pagamentos")
    .select("valor_pago, racha_id")
    .eq("racha_id", rachaId)
    .eq("status", "confirmado");

  let gastosQuery = supabase
    .from("gastos")
    .select("valor")
    .eq("racha_id", rachaId);

  if (mes !== undefined && ano !== undefined) {
    pagQuery = pagQuery.eq("mes", mes).eq("ano", ano);
    gastosQuery = gastosQuery.eq("mes", mes).eq("ano", ano);
  }

  const [{ data: pags }, { data: gastos }] = await Promise.all([
    pagQuery,
    gastosQuery,
  ]);

  // Busca valor da mensalidade
  const { data: rachaData } = await supabase
    .from("rachas")
    .select("mensalidade")
    .eq("id", rachaId)
    .single();

  const mensalidade = (rachaData as any)?.mensalidade ?? 0;
  const totalArrecadado = (pags ?? []).length * mensalidade;
  const totalGastos = (gastos ?? []).reduce((acc, g) => acc + g.valor, 0);
  const saldo = totalArrecadado - totalGastos;

  return { totalArrecadado, totalGastos, saldo };
}

export async function dbAtualizarBalancoPublico(
  rachaId: string,
  balanco_publico: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from("rachas")
    .update({ balanco_publico })
    .eq("id", rachaId);
  if (error) throw new Error(error.message);
}
