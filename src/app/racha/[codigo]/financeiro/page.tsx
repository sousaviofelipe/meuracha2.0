"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { dbGetRachaPorCodigo } from "@/lib/db/publico.db";
import { getSupabase } from "@/lib/db/supabase";
import {
  getMesesRecentes,
  calcularAtraso,
  MESES_NOMES,
} from "@/lib/utils/meses";
import { Jogador, Pagamento } from "@/types";

export default function FinanceiroPublicoPage() {
  const params = useParams();
  const codigo = params.codigo as string;
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [racha, setRacha] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const meses = getMesesRecentes(3);

  useEffect(() => {
    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo);
      if (!r) return;
      setRacha(r);

      const { data: jogs } = await getSupabase()
        .from("jogadores")
        .select("*")
        .eq("racha_id", r.id)
        .eq("ativo", true)
        .eq("mensalista", true)
        .order("nome");

      const { data: pags } = await getSupabase()
        .from("pagamentos")
        .select("*")
        .eq("racha_id", r.id);

      setJogadores(jogs ?? []);
      setPagamentos(pags ?? []);
      setLoading(false);
    }
    carregar();
  }, [codigo]);

  function getPagamento(jogadorId: string, mes: number, ano: number) {
    return pagamentos.find(
      (p) => p.jogador_id === jogadorId && p.mes === mes && p.ano === ano,
    );
  }

  async function handleCopiarPix() {
    if (!racha?.pix_chave) return;
    await navigator.clipboard.writeText(racha.pix_chave);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const jogadoresOrdenados = [...jogadores].sort((a, b) => {
    const atrasoA = calcularAtraso(a.id, pagamentos, meses);
    const atrasoB = calcularAtraso(b.id, pagamentos, meses);
    return atrasoB - atrasoA;
  });

  const totalDevendo = jogadoresOrdenados.filter(
    (j) => calcularAtraso(j.id, pagamentos, meses) > 0,
  ).length;

  const totalEmDia = jogadoresOrdenados.length - totalDevendo;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href={`/racha/${codigo}`}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-white font-black">💸 Financeiro do Racha</h1>
            <p className="text-gray-500 text-xs">{racha?.nome}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-4 pb-10">
        {/* RESUMO */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 text-center">
            <p className="text-green-400 text-lg font-black">{totalEmDia}</p>
            <p className="text-xs text-gray-500">Em dia</p>
          </div>
          <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 text-center">
            <p className="text-red-400 text-lg font-black">{totalDevendo}</p>
            <p className="text-xs text-gray-500">Devendo</p>
          </div>
        </div>

        {/* PIX */}
        {racha?.pix_chave && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
            <p className="text-green-400 font-bold mb-3">
              💳 Pagar mensalidade
            </p>

            <div className="flex flex-col gap-1 mb-3">
              {racha.pix_titular && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Titular</span>
                  <span className="text-white text-sm font-medium">
                    {racha.pix_titular}
                  </span>
                </div>
              )}

              {racha.pix_banco && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Banco</span>
                  <span className="text-white text-sm font-medium">
                    {racha.pix_banco}
                  </span>
                </div>
              )}

              {racha.mensalidade > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Valor</span>
                  <span className="text-green-400 text-sm font-black">
                    R$ {Number(racha.mensalidade).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-sm">Chave PIX</span>
                <span className="text-white text-sm font-mono">
                  {racha.pix_chave}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopiarPix}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                copiado
                  ? "bg-green-500 text-black"
                  : "bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
              }`}
            >
              {copiado ? "🔥 PIX COPIADO!" : "📋 Copiar chave PIX"}
            </button>
          </div>
        )}

        {/* JOGADORES */}
        <div className="flex flex-col gap-3">
          {jogadoresOrdenados.map((j, i) => {
            const atraso = calcularAtraso(j.id, pagamentos, meses);
            const valorDevido = atraso * (racha?.mensalidade ?? 0);

            return (
              <div
                key={j.id}
                className={`bg-gray-900 border rounded-2xl p-4 ${
                  atraso >= 2
                    ? "border-red-500/40"
                    : atraso === 1
                      ? "border-yellow-500/40"
                      : "border-gray-800"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="rounded-full overflow-hidden flex-shrink-0"
                    style={{ width: 36, height: 36 }}
                  >
                    {j.foto_url ? (
                      <img
                        src={j.foto_url}
                        alt={j.nome}
                        style={{
                          width: 36,
                          height: 36,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm">
                        {j.nome.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold">{j.nome}</span>

                      {i === 0 && atraso > 0 && (
                        <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black">
                          💀 CALOTEIRO MASTER
                        </span>
                      )}
                      {i === 1 && atraso > 0 && (
                        <span className="text-[10px] bg-gray-500 text-white px-2 py-0.5 rounded-full font-black">
                          🏃 DEVENDO E CORRENDO
                        </span>
                      )}
                      {i === 2 && atraso > 0 && (
                        <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">
                          🤞 SÓ PROMESSA
                        </span>
                      )}
                    </div>

                    {atraso > 0 && racha?.mensalidade > 0 && (
                      <p className="text-xs text-red-400 font-bold">
                        Deve R$ {valorDevido.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {atraso === 0 && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      Em dia ✓
                    </span>
                  )}
                  {atraso === 1 && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                      1 mês
                    </span>
                  )}
                  {atraso >= 2 && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                      {atraso} meses
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {meses.map(({ mes, ano }) => {
                    const pag = getPagamento(j.id, mes, ano);
                    const pago = pag?.pago ?? false;

                    const hoje = new Date();
                    const mesAtual =
                      mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();

                    return (
                      <div
                        key={`${mes}-${ano}`}
                        className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl border ${
                          pago
                            ? "bg-green-500/20 border-green-500/30"
                            : mesAtual
                              ? "bg-gray-800 border-gray-600"
                              : "bg-red-500/10 border-red-500/20"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-300">
                          {MESES_NOMES[mes - 1].slice(0, 3)}
                        </span>
                        <span className="text-xs text-gray-500">{ano}</span>
                        <span className="text-base">
                          {pago ? "✅" : mesAtual ? "⏳" : "🚫"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
