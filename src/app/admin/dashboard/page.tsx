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
import { dbListarTotalPartidas } from "@/lib/db/avaliacoes.db";
import { listarVinculosPendentes } from "@/lib/services/jogadores.service";
import { listarPresencas } from "@/lib/services/presencas.service";
import { getSupabase } from "@/lib/db/supabase";
import { Racha, Estatistica, Notificacao, Enquete, Partida } from "@/types";

const ACESSO_RAPIDO = [
  { href: "/admin/partidas", emoji: "⚽", label: "Partidas" },
  { href: "/admin/jogadores", emoji: "👥", label: "Jogadores" },
  { href: "/admin/escalacao", emoji: "🏟️", label: "Escalação" },
  { href: "/admin/financeiro", emoji: "💰", label: "Financeiro" },
  { href: "/admin/enquetes", emoji: "📋", label: "Enquetes" },
  { href: "/admin/notificacoes", emoji: "🔔", label: "Avisos" },
  { href: "/admin/configuracoes", emoji: "⚙️", label: "Config." },
];

export default function DashboardPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [stats, setStats] = useState<Estatistica[]>([]);
  const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
  const [enquete, setEnquete] = useState<Enquete | null>(null);
  const [ultimaPartida, setUltimaPartida] = useState<Partida | null>(null);
  const [proximaPartida, setProximaPartida] = useState<Partida | null>(null);
  const [rankingJogos, setRankingJogos] = useState<any[]>([]);
  const [totalJogadores, setTotalJogadores] = useState(0);
  const [totalPartidas, setTotalPartidas] = useState(0);
  const [vinculosPendentes, setVinculosPendentes] = useState(0);
  const [confirmados, setConfirmados] = useState(0);
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [emAtraso, setEmAtraso] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");

      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);

      const hoje = new Date().toISOString().split("T")[0];

      const [
        s,
        n,
        e,
        p,
        partidasMap,
        { data: jogs },
        { data: futuras },
        { data: todasPartidas },
        { data: pagamentos },
        vinculos,
      ] = await Promise.all([
        dbGetEstatisticas(r.id),
        dbGetNotificacaoAtiva(r.id),
        dbGetEnqueteAtiva(r.id),
        dbGetUltimaPartida(r.id),
        dbListarTotalPartidas(r.id),
        getSupabase()
          .from("jogadores")
          .select("*")
          .eq("racha_id", r.id)
          .eq("ativo", true),
        getSupabase()
          .from("partidas")
          .select("*")
          .eq("racha_id", r.id)
          .eq("encerrada", false)
          .gte("data", hoje)
          .order("data", { ascending: true })
          .limit(1),
        getSupabase()
          .from("partidas")
          .select("id")
          .eq("racha_id", r.id)
          .eq("encerrada", true),
        getSupabase()
          .from("pagamentos")
          .select("*")
          .eq("racha_id", r.id)
          .eq("pago", false),
        listarVinculosPendentes(r.id),
      ]);

      setStats(s);
      setNotificacao(n);
      setEnquete(e);
      setUltimaPartida(p);
      setTotalJogadores((jogs ?? []).length);
      setTotalPartidas((todasPartidas ?? []).length);
      setVinculosPendentes(vinculos.length);
      setEmAtraso(
        (pagamentos ?? [])
          .map((pg: any) => pg.jogador_id)
          .filter((v: any, i: any, a: any) => a.indexOf(v) === i).length,
      );

      const proxima = futuras?.[0] ?? null;
      setProximaPartida(proxima);

      // Confirmados da próxima partida
      if (proxima) {
        const presencasPartida = await listarPresencas(proxima.id);
        const conf = presencasPartida.filter((p) => p.confirmado).length;
        setConfirmados(conf);
        setTotalAtivos((jogs ?? []).filter((j: any) => !j.bloqueado).length);
      }

      // Ranking jogos
      const map: Record<string, number> = {};
      partidasMap.forEach((p) => {
        map[p.jogador_id] = p.total_partidas;
      });
      const ranking = (jogs ?? [])
        .map((j: any) => ({ ...j, total_partidas: map[j.id] ?? 0 }))
        .filter((j: any) => j.total_partidas > 0)
        .sort((a: any, b: any) =>
          b.total_partidas !== a.total_partidas
            ? b.total_partidas - a.total_partidas
            : a.nome.localeCompare(b.nome),
        );
      setRankingJogos(ranking);

      setLoading(false);
    }
    carregar();
  }, []);

  const artilheiros = [...stats]
    .sort((a, b) => b.gols - a.gols)
    .filter((s) => s.gols > 0)
    .slice(0, 3);
  const assistentes = [...stats]
    .sort((a, b) => b.assistencias - a.assistencias)
    .filter((s) => s.assistencias > 0)
    .slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 text-lg animate-pulse">
          Carregando...
        </div>
      </div>
    );
  }

  const pctConfirmados =
    totalAtivos > 0 ? Math.round((confirmados / totalAtivos) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Header do racha */}
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

      {/* Acesso rápido */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {ACESSO_RAPIDO.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:border-green-500/50 hover:bg-gray-800 transition-all cursor-pointer">
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-gray-400 text-xs font-medium text-center">
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Alerta vínculos pendentes */}
      {vinculosPendentes > 0 && (
        <Link href="/admin/jogadores">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-yellow-500/60 transition-colors cursor-pointer">
            <span className="text-xl">🔔</span>
            <div className="flex-1">
              <p className="text-yellow-400 font-bold text-sm">
                {vinculosPendentes} vínculo{vinculosPendentes > 1 ? "s" : ""}{" "}
                pendente{vinculosPendentes > 1 ? "s" : ""}
              </p>
              <p className="text-gray-500 text-xs">
                Jogador{vinculosPendentes > 1 ? "es" : ""} aguardando aprovação
              </p>
            </div>
            <span className="text-gray-500 text-sm">→</span>
          </div>
        </Link>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
          <p className="text-green-400 font-black text-3xl">{totalJogadores}</p>
          <p className="text-gray-500 text-xs mt-1">👥 Jogadores</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
          <p className="text-white font-black text-3xl">{totalPartidas}</p>
          <p className="text-gray-500 text-xs mt-1">⚽ Partidas</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
          <p
            className={`font-black text-3xl ${emAtraso > 0 ? "text-red-400" : "text-green-400"}`}
          >
            {emAtraso}
          </p>
          <p className="text-gray-500 text-xs mt-1">💰 Em atraso</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
          <p className="text-blue-400 font-black text-3xl">{confirmados}</p>
          <p className="text-gray-500 text-xs mt-1">✅ Confirmados</p>
        </div>
      </div>

      {/* Próxima partida + confirmações */}
      {proximaPartida && (
        <Link href="/admin/partidas">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span>📅</span>
                </div>
                <span className="text-white font-black text-sm">
                  Próxima partida
                </span>
              </div>
              <span className="text-gray-500 text-xs">
                {new Date(proximaPartida.data + "T12:00:00").toLocaleDateString(
                  "pt-BR",
                  { weekday: "short", day: "2-digit", month: "short" },
                )}
              </span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <span className="text-white font-bold flex-1 text-right truncate">
                {proximaPartida.time_a}
              </span>
              <div className="bg-gray-800 px-3 py-1.5 rounded-xl">
                <span className="text-green-400 font-black text-lg">vs</span>
              </div>
              <span className="text-white font-bold flex-1 text-left truncate">
                {proximaPartida.time_b}
              </span>
            </div>
            {/* Barra de confirmados */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">Confirmações</span>
                <span className="text-white text-xs font-bold">
                  {confirmados} / {totalAtivos} jogadores
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${pctConfirmados}%` }}
                />
              </div>
              <p className="text-gray-600 text-xs text-right">
                {pctConfirmados}% confirmado
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Notificação ativa */}
      {notificacao ? (
        <Link href="/admin/notificacoes">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 cursor-pointer hover:border-yellow-500/60 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <span>🔔</span>
              </div>
              <span className="text-yellow-400 font-bold text-sm">
                Notificação ativa
              </span>
            </div>
            <p className="text-white font-semibold">{notificacao.titulo}</p>
            <p className="text-gray-400 text-sm mt-1 line-clamp-1">
              {notificacao.mensagem}
            </p>
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

      {/* Enquete ativa */}
      {enquete ? (
        <Link href="/admin/enquetes">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 cursor-pointer hover:border-blue-500/60 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span>📋</span>
              </div>
              <span className="text-blue-400 font-bold text-sm">
                Enquete ativa
              </span>
            </div>
            <p className="text-white font-semibold mb-3">{enquete.pergunta}</p>
            <div className="flex flex-col gap-2">
              {[...(enquete.opcoes ?? [])]
                .sort((a, b) => b.votos - a.votos)
                .slice(0, 3)
                .map((op) => {
                  const total =
                    enquete.opcoes?.reduce((acc, o) => acc + o.votos, 0) ?? 0;
                  const pct =
                    total > 0 ? Math.round((op.votos / total) * 100) : 0;
                  return (
                    <div
                      key={op.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-800/70 border border-gray-700"
                    >
                      <span className="text-white text-sm flex-1 truncate">
                        {op.opcao}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-blue-400 font-bold text-xs w-8 text-right">
                          {pct}%
                        </span>
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
      {ultimaPartida && (
        <Link href="/admin/partidas">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-gray-700 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span>⚽</span>
              </div>
              <span className="text-white font-black text-sm">
                Última partida
              </span>
              <span className="text-gray-600 text-xs ml-auto">
                {new Date(ultimaPartida.data).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <span className="text-white font-bold text-lg flex-1 text-right truncate">
                {ultimaPartida.time_a}
              </span>
              <div className="bg-gray-800 px-4 py-2 rounded-xl">
                <span className="text-green-400 font-black text-2xl">
                  {ultimaPartida.gols_time_a} x {ultimaPartida.gols_time_b}
                </span>
              </div>
              <span className="text-white font-bold text-lg flex-1 text-left truncate">
                {ultimaPartida.time_b}
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Rankings reduzidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Artilheiros */}
        <Link href="/admin/estatisticas/artilheiros">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <span>🥇</span>
              </div>
              <span className="text-white font-black text-sm">Artilheiros</span>
            </div>
            {artilheiros.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-1">
                Sem dados
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {artilheiros.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span
                      className={`text-xs w-4 font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : "text-orange-400"}`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-white text-xs flex-1 truncate">
                      {(s.jogador as any)?.nome ?? "—"}
                    </span>
                    <span className="text-green-400 font-bold text-xs">
                      {s.gols}⚽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Assistências */}
        <Link href="/admin/estatisticas/assistencias">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span>🎯</span>
              </div>
              <span className="text-white font-black text-sm">
                Assistências
              </span>
            </div>
            {assistentes.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-1">
                Sem dados
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {assistentes.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span
                      className={`text-xs w-4 font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : "text-orange-400"}`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-white text-xs flex-1 truncate">
                      {(s.jogador as any)?.nome ?? "—"}
                    </span>
                    <span className="text-blue-400 font-bold text-xs">
                      {s.assistencias}🎯
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Jogos disputados */}
        <Link href={`/racha/${racha?.codigo}/jogos`}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span>🏟️</span>
              </div>
              <span className="text-white font-black text-sm">Jogos</span>
            </div>
            {rankingJogos.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-1">
                Sem dados
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {rankingJogos.slice(0, 3).map((j, i) => (
                  <div key={j.id} className="flex items-center gap-2">
                    <span
                      className={`text-xs w-4 font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : "text-orange-400"}`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-white text-xs flex-1 truncate">
                      {j.nome}
                    </span>
                    <span className="text-white font-bold text-xs">
                      {j.total_partidas}🏟️
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
