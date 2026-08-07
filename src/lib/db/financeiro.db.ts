import { getSupabase } from "@/lib/db/supabase";
import { Pagamento } from "@/types";

// Meses disponíveis — junho/2026 em diante
export function getMesesDisponiveis(): { mes: number; ano: number }[] {
  const meses = [];
  const inicio = { mes: 6, ano: 2026 };
  const agora = new Date();
  let mes = inicio.mes;
  let ano = inicio.ano;

  while (
    ano < agora.getFullYear() ||
    (ano === agora.getFullYear() && mes <= agora.getMonth() + 1)
  ) {
    meses.push({ mes, ano });
    mes++;
    if (mes > 12) {
      mes = 1;
      ano++;
    }
  }
  return meses;
}

export function nomeMes(mes: number, ano: number): string {
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

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
    .eq("racha_id", rachaId)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });
  return data ?? [];
}

export async function dbGetPagamentosJogador(
  jogadorId: string,
  rachaId: string,
): Promise<Pagamento[]> {
  const { data } = await getSupabase()
    .from("pagamentos")
    .select("*")
    .eq("jogador_id", jogadorId)
    .eq("racha_id", rachaId)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });
  return data ?? [];
}

export async function dbGetPagamentosPorMes(
  rachaId: string,
  mes: number,
  ano: number,
): Promise<Pagamento[]> {
  const { data } = await getSupabase()
    .from("pagamentos")
    .select("*")
    .eq("racha_id", rachaId)
    .eq("mes", mes)
    .eq("ano", ano);
  return data ?? [];
}

export async function dbConfirmarPagamento(
  rachaId: string,
  jogadorId: string,
  mes: number,
  ano: number,
): Promise<void> {
  const { error } = await getSupabase().from("pagamentos").upsert(
    {
      racha_id: rachaId,
      jogador_id: jogadorId,
      mes,
      ano,
      pago: true,
      status: "confirmado",
      pago_em: new Date().toISOString(),
    },
    { onConflict: "racha_id,jogador_id,mes,ano" },
  );
  if (error) throw new Error(error.message);
}

export async function dbRejeitarPagamento(
  rachaId: string,
  jogadorId: string,
  mes: number,
  ano: number,
): Promise<void> {
  const { error } = await getSupabase().from("pagamentos").upsert(
    {
      racha_id: rachaId,
      jogador_id: jogadorId,
      mes,
      ano,
      pago: false,
      status: "pendente",
      pago_em: null,
    },
    { onConflict: "racha_id,jogador_id,mes,ano" },
  );
  if (error) throw new Error(error.message);
}

export async function dbAvisarPagamento(
  rachaId: string,
  jogadorId: string,
  mes: number,
  ano: number,
): Promise<void> {
  const { error } = await getSupabase().from("pagamentos").upsert(
    {
      racha_id: rachaId,
      jogador_id: jogadorId,
      mes,
      ano,
      pago: false,
      status: "aguardando",
    },
    { onConflict: "racha_id,jogador_id,mes,ano" },
  );
  if (error) throw new Error(error.message);
}

export async function dbGetPagamentosAguardando(
  rachaId: string,
): Promise<Pagamento[]> {
  const { data } = await getSupabase()
    .from("pagamentos")
    .select("*")
    .eq("racha_id", rachaId)
    .eq("status", "aguardando")
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });
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
        status: pago ? "confirmado" : "pendente",
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
