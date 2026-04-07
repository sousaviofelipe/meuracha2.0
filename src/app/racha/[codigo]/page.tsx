"use client";

import { getSupabase } from "@/lib/db/supabase";
import { dbGetEscalacaoAtivaPublico } from "@/lib/db/publico.db";
import CampoEscalacao from "@/components/CampoEscalacao";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  dbGetRachaPorCodigo,
  dbGetEstatisticasPublico,
  dbGetNotificacaoAtivaPublico,
  dbGetEnqueteAtivaPublico,
  dbGetUltimaPartidaPublico,
  dbVotarPublico,
} from "@/lib/db/publico.db";
import { Racha, Estatistica, Notificacao, Enquete, Partida } from "@/types";

export default function DashboardPublicoPage() {
  const [escalacao, setEscalacao] = useState<Escalacao | null>(null);
  const [jogadoresPublico, setJogadoresPublico] = useState<Jogador[]>([]);
  const params = useParams();
  const router = useRouter();
  const codigo = params.codigo as string;
  const [racha, setRacha] = useState<Racha | null>(null);
  const [stats, setStats] = useState<Estatistica[]>([]);
  const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
  const [enquete, setEnquete] = useState<Enquete | null>(null);
  const [ultimaPartida, setUltimaPartida] = useState<Partida | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [votando, setVotando] = useState(false);
  const [votou, setVotou] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo);
      if (!r) return setNotFound(true);
      setRacha(r);

      const [s, n, e, p, esc] = await Promise.all([
        dbGetEstatisticasPublico(r.id),
        dbGetNotificacaoAtivaPublico(r.id),
        dbGetEnqueteAtivaPublico(r.id),
        dbGetUltimaPartidaPublico(r.id),
        dbGetEscalacaoAtivaPublico(r.id),
      ]);

      setStats(s);
      setNotificacao(n);
      setUltimaPartida(p);
      setEscalacao(esc);

      // Verifica voto salvo
      if (e?.id) {
        const votoSalvo = localStorage.getItem(`voto_enquete_${e.id}`);
        if (votoSalvo) setVotou(votoSalvo);
      }
      setEnquete(e);

      // Carrega jogadores da escalação separadamente
      if (
        esc &&
        (esc.jogadores_time_a?.length > 0 || esc.jogadores_time_b?.length > 0)
      ) {
        const todosIds = [
          ...(esc.jogadores_time_a ?? []),
          ...(esc.jogadores_time_b ?? []),
        ];
        try {
          const { data: jogs } = await getSupabase()
            .from("jogadores")
            .select("*")
            .in("id", todosIds);
          setJogadoresPublico(jogs ?? []);
        } catch {
          setJogadoresPublico([]);
        }
      }

      setLoading(false);
    }
    carregar();
  }, [codigo]);

  async function handleVotar(opcaoId: string) {
    if (votou || votando || !enquete) return;
    setVotando(true);
    try {
      await dbVotarPublico(opcaoId);
      setVotou(opcaoId);
      localStorage.setItem(`voto_enquete_${enquete.id}`, opcaoId);
      const e = await dbGetEnqueteAtivaPublico(racha!.id);
      setEnquete(e);
    } finally {
      setVotando(false);
    }
  }

  const artilheiros = [...stats]
    .sort((a, b) => b.gols - a.gols)
    .filter((s) => s.gols > 0)
    .slice(0, 10);
  const assistentes = [...stats]
    .sort((a, b) => b.assistencias - a.assistencias)
    .filter((s) => s.assistencias > 0)
    .slice(0, 10);
  const cartoes = [...stats]
    .sort(
      (a, b) =>
        b.cartoes_amarelos +
        b.cartoes_vermelhos -
        (a.cartoes_amarelos + a.cartoes_vermelhos),
    )
    .filter((s) => s.cartoes_amarelos + s.cartoes_vermelhos > 0)
    .slice(0, 10);

  if (loading && !notFound) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-green-400 animate-pulse text-lg">
          Carregando...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-6xl">⚽</p>
        <h1 className="text-white text-2xl font-black">Racha não encontrado</h1>
        <p className="text-gray-400">
          O código <span className="text-green-400 font-mono">{codigo}</span>{" "}
          não existe.
        </p>
        <Link href="/login" className="text-green-400 hover:underline text-sm">
          ← Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="RachaApp" className="h-8 w-auto" />
              <span className="text-green-400 font-black text-lg">
                Meu Racha
              </span>
            </div>
            <p className="text-gray-500 text-xs font-mono">{racha?.codigo}</p>
          </div>
          <Link
            href="/login"
            className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
          >
            Admin →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-5 pb-10">
        {/* Notificação */}
        {notificacao && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>🔔</span>
              <span className="text-yellow-400 font-bold text-sm">Aviso</span>
            </div>
            <p className="text-white font-semibold">{notificacao.titulo}</p>
            <p className="text-gray-400 text-sm mt-1">{notificacao.mensagem}</p>
          </div>
        )}

        {/* Escalação */}
        {escalacao && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span>🏟️</span>
              <span className="text-white font-bold">Escalação</span>
            </div>
            <CampoEscalacao
              escalacao={escalacao}
              jogadores={jogadoresPublico}
            />{" "}
          </div>
        )}

        {/* Enquete */}
        {enquete && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span>📋</span>
              <span className="text-blue-400 font-bold text-sm">
                Enquete OK
              </span>
            </div>
            <p className="text-white font-semibold mb-4">{enquete.pergunta}</p>
            <div className="flex flex-col gap-2">
              {enquete.opcoes?.map((op) => {
                const total =
                  enquete.opcoes?.reduce((acc, o) => acc + o.votos, 0) ?? 0;
                const pct =
                  total > 0 ? Math.round((op.votos / total) * 100) : 0;
                const selecionada = votou === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => handleVotar(op.id)}
                    disabled={!!votou || votando}
                    className={`w-full text-left rounded-xl overflow-hidden transition-all ${
                      votou
                        ? selecionada
                          ? "ring-2 ring-blue-400"
                          : "opacity-70"
                        : "hover:ring-2 hover:ring-blue-500/50 cursor-pointer"
                    }`}
                  >
                    <div className="relative bg-gray-800 px-4 py-3">
                      {votou && (
                        <div
                          className="absolute inset-0 bg-blue-500/20 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      <div className="relative flex justify-between items-center">
                        <span className="text-gray-200 text-sm">
                          {op.opcao}
                        </span>
                        {votou && (
                          <span className="text-blue-400 font-bold text-sm">
                            {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!votou && (
              <p className="text-gray-500 text-xs mt-3 text-center">
                Toque para votar
              </p>
            )}
            {votou && (
              <p className="text-gray-500 text-xs mt-3 text-center">
                Voto registrado ✓
              </p>
            )}
            <Link
              href={`/racha/${codigo}/enquetes`}
              className="block text-center text-blue-400 text-xs mt-3 hover:underline"
            >
              ver todas as enquetes →
            </Link>
          </div>
        )}

        {/* Última partida */}
        {ultimaPartida && (
          <Link href={`/racha/${codigo}/partidas`}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-3">
                <span>⚽</span>
                <span className="text-gray-400 font-bold text-sm">
                  Última Partida
                </span>
                <span className="ml-auto text-gray-600 text-xs">
                  {new Date(
                    ultimaPartida.data + "T12:00:00",
                  ).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="text-white font-bold flex-1 text-right truncate">
                  {ultimaPartida.time_a}
                </span>
                <div className="bg-gray-800 px-4 py-2 rounded-xl">
                  <span className="text-green-400 font-black text-2xl">
                    {ultimaPartida.gols_time_a} x {ultimaPartida.gols_time_b}
                  </span>
                </div>
                <span className="text-white font-bold flex-1 text-left truncate">
                  {ultimaPartida.time_b}
                </span>
              </div>
              <p className="text-gray-600 text-xs text-center mt-3">
                ver todas as partidas →
              </p>
            </div>
          </Link>
        )}

        {/* Artilheiros */}
        <Link href={`/racha/${codigo}/artilheiros`}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>🥇</span>
                <span className="text-white font-bold">Artilheiros</span>
              </div>
              <span className="text-gray-500 text-xs">ver todos →</span>
            </div>
            {artilheiros.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-2">
                Nenhum gol registrado
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {artilheiros.slice(0, 5).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span
                      className={`text-sm w-5 font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-600"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                      {(s.jogador as any)?.foto_url ? (
                        <img
                          src={(s.jogador as any).foto_url}
                          alt=""
                          style={{
                            width: 28,
                            height: 28,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          👤
                        </div>
                      )}
                    </div>
                    <span className="text-white text-sm flex-1">
                      {(s.jogador as any)?.nome ?? "—"}
                    </span>
                    <span className="text-green-400 font-bold text-sm">
                      {s.gols} ⚽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Assistências */}
        <Link href={`/racha/${codigo}/assistencias`}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>🎯</span>
                <span className="text-white font-bold">Assistências</span>
              </div>
              <span className="text-gray-500 text-xs">ver todos →</span>
            </div>
            {assistentes.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-2">
                Nenhuma assistência registrada
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {assistentes.slice(0, 5).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span
                      className={`text-sm w-5 font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-600"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                      {(s.jogador as any)?.foto_url ? (
                        <img
                          src={(s.jogador as any).foto_url}
                          alt=""
                          style={{
                            width: 28,
                            height: 28,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          👤
                        </div>
                      )}
                    </div>
                    <span className="text-white text-sm flex-1">
                      {(s.jogador as any)?.nome ?? "—"}
                    </span>
                    <span className="text-blue-400 font-bold text-sm">
                      {s.assistencias} 🎯
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Cartões */}
        <Link href={`/racha/${codigo}/cartoes`}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>🟨</span>
                <span className="text-white font-bold">Cartões</span>
              </div>
              <span className="text-gray-500 text-xs">ver todos →</span>
            </div>
            {cartoes.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-2">
                Nenhum cartão registrado
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {cartoes.slice(0, 5).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span
                      className={`text-sm w-5 font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-600"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                      {(s.jogador as any)?.foto_url ? (
                        <img
                          src={(s.jogador as any).foto_url}
                          alt=""
                          style={{
                            width: 28,
                            height: 28,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          👤
                        </div>
                      )}
                    </div>
                    <span className="text-white text-sm flex-1">
                      {(s.jogador as any)?.nome ?? "—"}
                    </span>
                    <div className="flex gap-2">
                      <span className="text-yellow-400 font-bold text-sm">
                        🟨 {s.cartoes_amarelos}
                      </span>
                      <span className="text-red-400 font-bold text-sm">
                        🟥 {s.cartoes_vermelhos}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>
      </main>
    </div>
  );
}
