"use client";

import { useEffect, useState } from "react";
import CompartilharRacha from "@/components/admin/CompartilharRacha";
import { getUser } from "@/lib/services/auth.service";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import {
  dbGetEstatisticas,
  dbGetNotificacaoAtiva,
  dbGetEnqueteAtiva,
  dbGetUltimaPartida,
} from "@/lib/db/rachas.db";
import { Racha, Estatistica, Notificacao, Enquete, Partida } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [stats, setStats] = useState<Estatistica[]>([]);
  const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
  const [enquete, setEnquete] = useState<Enquete | null>(null);
  const [ultimaPartida, setUltimaPartida] = useState<Partida | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");

      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);

      const [s, n, e, p] = await Promise.all([
        dbGetEstatisticas(r.id),
        dbGetNotificacaoAtiva(r.id),
        dbGetEnqueteAtiva(r.id),
        dbGetUltimaPartida(r.id),
      ]);
      setStats(s);
      setNotificacao(n);
      setEnquete(e);
      setUltimaPartida(p);
      setLoading(false);
    }
    carregar();
  }, []);

  const artilheiros = [...stats].sort((a, b) => b.gols - a.gols).slice(0, 10);
  const assistentes = [...stats]
    .sort((a, b) => b.assistencias - a.assistencias)
    .slice(0, 10);
  const amarelos = [...stats]
    .sort((a, b) => b.cartoes_amarelos - a.cartoes_amarelos)
    .slice(0, 10);
  const vermelhos = [...stats]
    .sort((a, b) => b.cartoes_vermelhos - a.cartoes_vermelhos)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 text-lg animate-pulse">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header do racha */}
      import CompartilharRacha from '@/components/admin/CompartilharRacha' //
      ...
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-white">{racha?.nome}</h1>
          <p className="text-gray-400 text-sm">
            Código:{" "}
            <span className="text-green-400 font-mono font-bold">
              {racha?.codigo}
            </span>
          </p>
        </div>
        {racha && <CompartilharRacha racha={racha} />}
      </div>
      {/* Notificação */}
      {notificacao ? (
        <Link href="/admin/notificacoes">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 cursor-pointer hover:border-yellow-500/60 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span>🔔</span>
              <span className="text-yellow-400 font-bold text-sm">
                Notificação Ativa
              </span>
            </div>
            <p className="text-white font-semibold">{notificacao.titulo}</p>
            <p className="text-gray-400 text-sm mt-1">{notificacao.mensagem}</p>
          </div>
        </Link>
      ) : (
        <Link href="/admin/notificacoes">
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-4 cursor-pointer hover:border-gray-500 transition-colors text-center">
            <p className="text-gray-500 text-sm">
              🔔 Nenhuma notificação ativa — clique para criar
            </p>
          </div>
        </Link>
      )}
      {/* Enquete */}
      {enquete ? (
        <Link href="/admin/enquetes">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 cursor-pointer hover:border-blue-500/60 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span>📋</span>
              <span className="text-blue-400 font-bold text-sm">
                Enquete Ativa
              </span>
            </div>
            <p className="text-white font-semibold mb-3">{enquete.pergunta}</p>
            <div className="flex flex-col gap-2">
              {enquete.opcoes?.map((op) => {
                const total =
                  enquete.opcoes?.reduce((acc, o) => acc + o.votos, 0) ?? 0;
                const pct =
                  total > 0 ? Math.round((op.votos / total) * 100) : 0;
                return (
                  <div key={op.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{op.opcao}</span>
                      <span className="text-blue-400 font-bold">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Link>
      ) : (
        <Link href="/admin/enquetes">
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-4 cursor-pointer hover:border-gray-500 transition-colors text-center">
            <p className="text-gray-500 text-sm">
              📋 Nenhuma enquete ativa — clique para criar
            </p>
          </div>
        </Link>
      )}
      {/* Última partida */}
      {ultimaPartida ? (
        <Link href="/admin/partidas">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-gray-700 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span>⚽</span>
              <span className="text-gray-400 font-bold text-sm">
                Última Partida
              </span>
              <span className="text-gray-600 text-xs ml-auto">
                {new Date(ultimaPartida.data).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <span className="text-white font-bold text-lg flex-1 text-right">
                {ultimaPartida.time_a}
              </span>
              <div className="bg-gray-800 px-4 py-2 rounded-xl">
                <span className="text-green-400 font-black text-2xl">
                  {ultimaPartida.gols_time_a} x {ultimaPartida.gols_time_b}
                </span>
              </div>
              <span className="text-white font-bold text-lg flex-1 text-left">
                {ultimaPartida.time_b}
              </span>
            </div>
          </div>
        </Link>
      ) : (
        <Link href="/admin/partidas">
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-4 cursor-pointer hover:border-gray-500 transition-colors text-center">
            <p className="text-gray-500 text-sm">
              ⚽ Nenhuma partida encerrada ainda — clique para criar
            </p>
          </div>
        </Link>
      )}
      {/* Artilheiros */}
      <Link href="/admin/estatisticas/artilheiros">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-gray-700 transition-colors">
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
                  <span className="text-gray-500 text-sm w-4">{i + 1}</span>
                  <span className="text-white text-sm flex-1">
                    {(s.jogador as any)?.nome ?? "—"}
                  </span>
                  <span className="text-green-400 font-bold text-sm">
                    {s.gols} gols
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Link>
      {/* Assistências */}
      <Link href="/admin/estatisticas/assistencias">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-gray-700 transition-colors">
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
                  <span className="text-gray-500 text-sm w-4">{i + 1}</span>
                  <span className="text-white text-sm flex-1">
                    {(s.jogador as any)?.nome ?? "—"}
                  </span>
                  <span className="text-blue-400 font-bold text-sm">
                    {s.assistencias} assist.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Link>
      {/* Cartões */}
      <Link href="/admin/estatisticas/cartoes">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span>🟨</span>
              <span className="text-white font-bold">Cartões</span>
            </div>
            <span className="text-gray-500 text-xs">ver todos →</span>
          </div>
          {amarelos.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-2">
              Nenhum cartão registrado
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {amarelos.slice(0, 5).map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-4">{i + 1}</span>
                  <span className="text-white text-sm flex-1">
                    {(s.jogador as any)?.nome ?? "—"}
                  </span>
                  <span className="text-yellow-400 font-bold text-sm">
                    🟨 {s.cartoes_amarelos}
                  </span>
                  <span className="text-red-400 font-bold text-sm">
                    🟥 {s.cartoes_vermelhos}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
