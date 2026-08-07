"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { dbGetRachaPorCodigo } from "@/lib/db/publico.db";
import {
  dbGetTodosPagamentos,
  dbAvisarPagamento,
  getMesesDisponiveis,
  nomeMes,
} from "@/lib/db/financeiro.db";
import { dbGetBalanco } from "@/lib/db/gastos.db";
import { getUser } from "@/lib/services/auth.service";
import { buscarJogadoresPorUserId } from "@/lib/services/jogadores.service";
import { getSupabase } from "@/lib/db/supabase";
import { Racha, Jogador, Pagamento } from "@/types";

export default function FinanceiroPublicoPage() {
  const params = useParams();
  const codigo = params.codigo as string;

  const [racha, setRacha] = useState<Racha | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [jogadorLogado, setJogadorLogado] = useState<Jogador | null>(null);
  const [avisando, setAvisando] = useState<string | null>(null);
  const [balanco, setBalanco] = useState<{
    totalArrecadado: number;
    totalGastos: number;
    saldo: number;
  } | null>(null);

  const mesesDisponiveis = getMesesDisponiveis();

  useEffect(() => {
    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo);
      if (!r) return;
      setRacha(r);

      const [{ data: jogs }, pags] = await Promise.all([
        getSupabase()
          .from("jogadores")
          .select("*")
          .eq("racha_id", r.id)
          .eq("ativo", true)
          .eq("mensalista", true)
          .order("nome"),
        dbGetTodosPagamentos(r.id),
      ]);

      setJogadores(jogs ?? []);
      setPagamentos(pags);

      // Balanço público (só se habilitado)
      if (r.balanco_publico) {
        const bal = await dbGetBalanco(r.id);
        setBalanco(bal);
      }

      // Jogador logado
      try {
        const user = await getUser();
        if (user) {
          const jogadoresDoUsuario = await buscarJogadoresPorUserId(user.id);
          const jogadorDestePerfil = jogadoresDoUsuario.find(
            (j) => j.racha_id === r.id,
          );
          if (jogadorDestePerfil) setJogadorLogado(jogadorDestePerfil);
        }
      } catch {}

      setLoading(false);
    }
    carregar();
  }, [codigo]);

  function getPagamento(
    jogadorId: string,
    mes: number,
    ano: number,
  ): Pagamento | undefined {
    return pagamentos.find(
      (p) => p.jogador_id === jogadorId && p.mes === mes && p.ano === ano,
    );
  }

  async function handleAvisar(mes: number, ano: number) {
    if (!jogadorLogado || !racha) return;
    const key = `${mes}-${ano}`;
    setAvisando(key);
    try {
      await dbAvisarPagamento(racha.id, jogadorLogado.id, mes, ano);
      setPagamentos((prev) => {
        const existe = prev.find(
          (p) =>
            p.jogador_id === jogadorLogado.id && p.mes === mes && p.ano === ano,
        );
        const novo: Pagamento = {
          id: existe?.id ?? crypto.randomUUID(),
          racha_id: racha.id,
          jogador_id: jogadorLogado.id,
          mes,
          ano,
          pago: false,
          status: "aguardando",
          criado_em: existe?.criado_em ?? new Date().toISOString(),
        };
        if (existe)
          return prev.map((p) =>
            p.jogador_id === jogadorLogado.id && p.mes === mes && p.ano === ano
              ? novo
              : p,
          );
        return [...prev, novo];
      });
    } finally {
      setAvisando(null);
    }
  }

  function formatReal(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function getStatusInfo(status: string | undefined) {
    if (status === "confirmado")
      return {
        cor: "text-green-400",
        label: "✓ Pago",
        bg: "bg-green-500/10 border-green-500/20",
      };
    if (status === "aguardando")
      return {
        cor: "text-yellow-400",
        label: "⏳ Aguardando confirmação",
        bg: "bg-yellow-500/10 border-yellow-500/20",
      };
    return {
      cor: "text-red-400",
      label: "Pendente",
      bg: "bg-red-500/10 border-red-500/20",
    };
  }

  // Meses em atraso do jogador logado
  const mesesEmAtraso = jogadorLogado
    ? mesesDisponiveis.filter((m) => {
        const pag = getPagamento(jogadorLogado.id, m.mes, m.ano);
        return !pag || pag.status === "pendente";
      })
    : [];

  // Inadimplentes gerais
  const inadimplentes = jogadores
    .map((j) => {
      const atraso = mesesDisponiveis.filter((m) => {
        const pag = getPagamento(j.id, m.mes, m.ano);
        return !pag || pag.status === "pendente" || pag.status === "aguardando";
      }).length;
      return { jogador: j, atraso };
    })
    .filter((x) => x.atraso > 0)
    .sort((a, b) => b.atraso - a.atraso);

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
            <h1 className="text-white font-black">💰 Mensalidades</h1>
            <p className="text-gray-500 text-xs">{racha?.nome}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-5 pb-10">
        {/* Balanço público — só se habilitado */}
        {balanco && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span>📊</span>
              </div>
              <span className="text-white font-black text-sm">
                Caixa do racha
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                <p className="text-green-400 font-black text-lg">
                  {formatReal(balanco.totalArrecadado)}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Arrecadado</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                <p className="text-red-400 font-black text-lg">
                  {formatReal(balanco.totalGastos)}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Gastos</p>
              </div>
              <div
                className={`rounded-xl p-3 text-center border ${balanco.saldo >= 0 ? "bg-blue-500/10 border-blue-500/20" : "bg-orange-500/10 border-orange-500/20"}`}
              >
                <p
                  className={`font-black text-lg ${balanco.saldo >= 0 ? "text-blue-400" : "text-orange-400"}`}
                >
                  {formatReal(balanco.saldo)}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">Saldo</p>
              </div>
            </div>
          </div>
        )}

        {/* PIX */}
        {(racha as any)?.pix_chave && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span>💳</span>
              </div>
              <span className="text-white font-black text-sm">
                Dados para pagamento
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs">Chave PIX</p>
                  <p className="text-white font-mono text-sm truncate">
                    {(racha as any).pix_chave}
                  </p>
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText((racha as any).pix_chave)
                  }
                  className="text-green-400 text-xs font-bold flex-shrink-0 hover:text-green-300 transition-colors"
                >
                  Copiar
                </button>
              </div>
              {(racha as any)?.pix_titular && (
                <div className="flex gap-4 px-1">
                  <div>
                    <p className="text-gray-500 text-xs">Titular</p>
                    <p className="text-white text-sm">
                      {(racha as any).pix_titular}
                    </p>
                  </div>
                  {(racha as any)?.pix_banco && (
                    <div>
                      <p className="text-gray-500 text-xs">Banco</p>
                      <p className="text-white text-sm">
                        {(racha as any).pix_banco}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Minha situação — jogador logado */}
        {jogadorLogado && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span>👤</span>
              </div>
              <span className="text-white font-black text-sm">
                Minha situação
              </span>
            </div>

            {mesesDisponiveis.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-2">
                Nenhum mês disponível
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {mesesDisponiveis.map((m) => {
                  const pag = getPagamento(jogadorLogado.id, m.mes, m.ano);
                  const status = getStatusInfo(pag?.status);
                  const key = `${m.mes}-${m.ano}`;
                  const isAvisando = avisando === key;
                  const podeAvisar = !pag || pag.status === "pendente";

                  return (
                    <div
                      key={key}
                      className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${status.bg}`}
                    >
                      <div className="flex-1">
                        <p className="text-white text-sm font-semibold capitalize">
                          {nomeMes(m.mes, m.ano)}
                        </p>
                        <p className={`text-xs ${status.cor}`}>
                          {status.label}
                        </p>
                        {pag?.pago_em && (
                          <p className="text-gray-600 text-xs">
                            em{" "}
                            {new Date(pag.pago_em).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      {podeAvisar && (
                        <button
                          onClick={() => handleAvisar(m.mes, m.ano)}
                          disabled={isAvisando}
                          className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex-shrink-0"
                        >
                          {isAvisando ? "..." : "Avise ao adm que pagou"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Inadimplentes gerais */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
              <span>📋</span>
            </div>
            <span className="text-white font-black text-sm">
              Situação geral
            </span>
          </div>

          {inadimplentes.length === 0 ? (
            <p className="text-green-400 text-sm text-center py-4">
              ✅ Todos os mensalistas em dia!
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {inadimplentes.map(({ jogador, atraso }) => (
                <div
                  key={jogador.id}
                  className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                    {jogador.foto_url ? (
                      <img
                        src={jogador.foto_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                        {jogador.nome.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-white text-sm flex-1 truncate">
                    {jogador.nome}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${atraso >= 2 ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}
                  >
                    {atraso} {atraso === 1 ? "mês" : "meses"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Se não logado */}
        {!jogadorLogado && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-gray-500 text-sm mb-3">
              Entre como jogador para ver sua situação e avisar seus pagamentos
            </p>
            <Link
              href={`/login?redirect=/racha/${codigo}/financeiro`}
              className="inline-block bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Entrar →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
