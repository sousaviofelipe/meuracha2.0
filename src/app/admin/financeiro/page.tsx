"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import { listarJogadores } from "@/lib/services/jogadores.service";
import {
  dbGetTodosPagamentos,
  dbTogglePagamento,
} from "@/lib/db/financeiro.db";
import {
  getMesesRecentes,
  calcularAtraso,
  MESES_NOMES,
} from "@/lib/utils/meses";
import { Jogador, Pagamento, Racha } from "@/types";

export default function FinanceiroPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  const meses = getMesesRecentes(3);

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);
      const [j, p] = await Promise.all([
        listarJogadores(r.id),
        dbGetTodosPagamentos(r.id),
      ]);
      setJogadores(j.filter((x) => x.ativo));
      setPagamentos(p);
      setLoading(false);
    }
    carregar();
  }, []);

  async function handleToggle(
    jogadorId: string,
    mes: number,
    ano: number,
    pagoAtual: boolean,
  ) {
    if (!racha) return;
    const key = `${jogadorId}-${mes}-${ano}`;
    setSalvando(key);
    try {
      await dbTogglePagamento(racha.id, jogadorId, mes, ano, !pagoAtual);
      setPagamentos((prev) => {
        const existe = prev.find(
          (p) => p.jogador_id === jogadorId && p.mes === mes && p.ano === ano,
        );
        if (existe) {
          return prev.map((p) =>
            p.jogador_id === jogadorId && p.mes === mes && p.ano === ano
              ? { ...p, pago: !pagoAtual }
              : p,
          );
        }
        return [
          ...prev,
          {
            id: key,
            racha_id: racha.id,
            jogador_id: jogadorId,
            mes,
            ano,
            pago: !pagoAtual,
            criado_em: new Date().toISOString(),
          },
        ];
      });
    } finally {
      setSalvando(null);
    }
  }

  function getPagamento(jogadorId: string, mes: number, ano: number) {
    return pagamentos.find(
      (p) => p.jogador_id === jogadorId && p.mes === mes && p.ano === ano,
    );
  }

  function getCorAtraso(atraso: number) {
    if (atraso === 0) return "border-gray-800";
    if (atraso === 1) return "border-yellow-500/50";
    return "border-red-500/50";
  }

  function getBadgeAtraso(atraso: number) {
    if (atraso === 0) return null;
    if (atraso === 1)
      return (
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
          {atraso} mês
        </span>
      );
    return (
      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
        {atraso} meses
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  const jogadoresOrdenados = [...jogadores].sort((a, b) => {
    const atrasoA = calcularAtraso(a.id, pagamentos, meses);
    const atrasoB = calcularAtraso(b.id, pagamentos, meses);
    return atrasoB - atrasoA;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Financeiro</h1>
          <p className="text-gray-400 text-sm">Controle de mensalidades</p>
        </div>
        {(racha as any)?.mensalidade > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-right">
            <p className="text-gray-500 text-xs">Mensalidade</p>
            <p className="text-green-400 font-black">
              R$ {Number((racha as any).mensalidade).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-400 text-xs">Em dia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-gray-400 text-xs">1 mês atraso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-400 text-xs">2+ meses atraso</span>
        </div>
      </div>

      {/* Lista de jogadores */}
      <div className="flex flex-col gap-3">
        {jogadoresOrdenados.map((j) => {
          const atraso = calcularAtraso(j.id, pagamentos, meses);
          return (
            <div
              key={j.id}
              className={`bg-gray-900 border rounded-2xl p-4 transition-colors ${getCorAtraso(atraso)}`}
            >
              {/* Header jogador */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="rounded-full overflow-hidden flex-shrink-0"
                  style={{ width: 40, height: 40 }}
                >
                  {j.foto_url ? (
                    <img
                      src={j.foto_url}
                      alt={j.nome}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white font-bold">
                      {j.nome.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">{j.nome}</p>
                  <p className="text-gray-500 text-xs">{j.posicao}</p>
                </div>
                {getBadgeAtraso(atraso)}
              </div>

              {/* Meses */}
              <div className="grid grid-cols-3 gap-2">
                {meses.map(({ mes, ano, label }) => {
                  const pag = getPagamento(j.id, mes, ano);
                  const pago = pag?.pago ?? false;
                  const key = `${j.id}-${mes}-${ano}`;
                  const carregando = salvando === key;
                  const hoje = new Date();
                  const mesAtual =
                    mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();

                  return (
                    <button
                      key={key}
                      onClick={() => handleToggle(j.id, mes, ano, pago)}
                      disabled={!!salvando}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-colors border ${
                        pago
                          ? "bg-green-500/20 border-green-500/40 hover:bg-green-500/30"
                          : mesAtual
                            ? "bg-gray-800 border-gray-600 hover:bg-gray-700"
                            : "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                      }`}
                    >
                      <span className="text-xs font-bold text-gray-300">
                        {MESES_NOMES[mes - 1].slice(0, 3)}
                      </span>
                      <span className="text-xs text-gray-500">{ano}</span>
                      <span className="text-base">
                        {carregando ? "⏳" : pago ? "✅" : "❌"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
