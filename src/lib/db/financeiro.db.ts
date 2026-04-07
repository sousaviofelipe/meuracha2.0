import { getSupabase } from "@/lib/db/supabase";
import { Pagamento } from "@/types";

export async function dbGetPagamentos(
  rachaId: string,
  meses: { mes: number; ano: number }[],
): Promise<Pagamento[]> {
  if (meses.length === 0) return [];
  const { data } = await getSupabase()
    .from("pagamentos")
    .select("*")
    .eq("racha_id", rachaId)
    .in(
      "mes",
      meses.map((m) => m.mes),
    );
  return data ?? [];
}

export async function dbGetTodosPagamentos(
  rachaId: string,
): Promise<Pagamento[]> {
  const { data } = await getSupabase()
    .from("pagamentos")
    .select("*")
    .eq("racha_id", rachaId);
  return data ?? [];
}

export async function dbTogglePagamento(
  rachaId: string,
  jogadorId: string,
  mes: number,
  ano: number,
  pago: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from("pagamentos")
    .upsert(
      {
        racha_id: rachaId,
        jogador_id: jogadorId,
        mes,
        ano,
        pago,
        pago_em: pago ? new Date().toISOString() : null,
      },
      { onConflict: "racha_id,jogador_id,mes,ano" },
    );
  if (error) throw new Error(error.message);
}

export async function dbAtualizarFinanceiro(
  rachaId: string,
  mensalidade: number,
  pixChave: string,
  pixTitular: string,
  pixBanco: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("rachas")
    .update({
      mensalidade,
      pix_chave: pixChave,
      pix_titular: pixTitular,
      pix_banco: pixBanco,
    })
    .eq("id", rachaId);
  if (error) throw new Error(error.message);
}
