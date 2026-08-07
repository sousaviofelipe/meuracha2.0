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
import {
  dbGetTodosPagamentos,
  dbConfirmarPagamento,
  dbGetPagamentosJogador,
  getMesesDisponiveis,
  nomeMes,
} from "@/lib/db/financeiro.db";
import { getSupabase } from "@/lib/db/supabase";
import {
  Racha,
  Estatistica,
  Notificacao,
  Enquete,
  Partida,
  Pagamento,
  Jogador,
} from "@/types";

const ACESSO_RAPIDO = [
  { href: "/admin/partidas", emoji: "⚽", label: "Partidas" },
  { href: "/admin/jogadores", emoji: "👥", label: "Jogadores" },
  { href: "/admin/escalacao", emoji: "🏟️", label: "Escalação" },
  { href: "/admin/financeiro", emoji: "💰", label: "Financeiro" },
  { href: "/admin/enquetes", emoji: "📋", label: "Enquetes" },
  { href: "/admin/notificacoes", emoji: "🔔", label: "Avisos" },
  { href: "/admin/configuracoes", emoji: "⚙️", label: "Config." },
];

interface Inadimplente extends Jogador {
  mesesAtraso: number;
  mesesDevidos: { mes: number; ano: number }[];
}

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
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal inadimplente
  const [modalInadimplente, setModalInadimplente] =
    useState<Inadimplente | null>(null);
  const [pagamentosModal, setPagamentosModal] = useState<Pagamento[]>([]);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");

      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);

      const hoje = new Date().toISOString().split("T")[0];
      const mesesDisponiveis = getMesesDisponiveis();

      const [
        s,
        n,
        e,
        p,
        partidasMap,
        { data: jogs },
        { data: futuras },
        { data: todasPartidas },
        todosPagamentos,
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
          .eq("ativo", true)
          .eq("mensalista", true),
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
        dbGetTodosPagamentos(r.id),
        listarVinculosPendentes(r.id),
      ]);

      setStats(s);
      setNotificacao(n);
      setEnquete(e);
      setUltimaPartida(p);
      setTotalJogadores((jogs ?? []).length);
      setTotalPartidas((todasPartidas ?? []).length);
      setVinculosPendentes(vinculos.length);

      // Calcular inadimplentes
      const lista: Inadimplente[] = [];
      for (const jog of jogs ?? []) {
        const pagamentosJog = todosPagamentos.filter(
          (pg) => pg.jogador_id === jog.id,
        );
        const mesesDevidos: { mes: number; ano: number }[] = [];

        for (const m of mesesDisponiveis) {
          const pag = pagamentosJog.find(
            (pg) => pg.mes === m.mes && pg.ano === m.ano,
          );
          if (
            !pag ||
            pag.status === "pendente" ||
            pag.status === "aguardando"
          ) {
            mesesDevidos.push(m);
          }
        }

        if (mesesDevidos.length > 0) {
          lista.push({
            ...jog,
            mesesAtraso: mesesDevidos.length,
            mesesDevidos,
          });
        }
      }

      const top5 = lista
        .sort((a, b) => b.mesesAtraso - a.mesesAtraso)
        .slice(0, 5);
      setInadimplentes(top5);

      const proxima = futuras?.[0] ?? null;
      setProximaPartida(proxima);

      if (proxima) {
        const presencasPartida = await listarPresencas(proxima.id);
        const conf = presencasPartida.filter((p) => p.confirmado).length;
        setConfirmados(conf);
        const { data: jogAtivos } = await getSupabase()
          .from("jogadores")
          .select("*")
          .eq("racha_id", r.id)
          .eq("ativo", true);
        setTotalAtivos(
          (jogAtivos ?? []).filter((j: any) => !j.bloqueado).length,
        );
      }

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

  async function abrirModalInadimplente(inadimplente: Inadimplente) {
    setModalInadimplente(inadimplente);
    if (racha) {
      const pags = await dbGetPagamentosJogador(inadimplente.id, racha.id);
      setPagamentosModal(pags);
    }
  }

  async function handleConfirmarPagamento(mes: number, ano: number) {
    if (!modalInadimplente || !racha) return;
    const key = `${mes}-${ano}`;
    setConfirmando(key);
    try {
      await dbConfirmarPagamento(racha.id, modalInadimplente.id, mes, ano);
      // Atualiza modal
      setModalInadimplente((prev) => {
        if (!prev) return prev;
        const novosMeses = prev.mesesDevidos.filter(
          (m) => !(m.mes === mes && m.ano === ano),
        );
        return {
          ...prev,
          mesesAtraso: novosMeses.length,
          mesesDevidos: novosMeses,
        };
      });
      setInadimplentes((prev) =>
        prev
          .map((i) => {
            if (i.id !== modalInadimplente.id) return i;
            const novosMeses = i.mesesDevidos.filter(
              (m) => !(m.mes === mes && m.ano === ano),
            );
            return {
              ...i,
              mesesAtraso: novosMeses.length,
              mesesDevidos: novosMeses,
            };
          })
          .filter((i) => i.mesesAtraso > 0),
      );
      const pags = await dbGetPagamentosJogador(modalInadimplente.id, racha.id);
      setPagamentosModal(pags);
    } finally {
      setConfirmando(null);
    }
  }

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
      {/* Header */}
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

      {/* Inadimplentes */}
      {inadimplentes.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
                <span>💸</span>
              </div>
              <span className="text-red-400 font-black text-sm">Em atraso</span>
            </div>
            <Link
              href="/admin/financeiro"
              className="text-gray-500 hover:text-red-400 text-xs transition-colors"
            >
              ver todos →
            </Link>
          </div>
          <div className="flex gap-3 flex-wrap">
            {inadimplentes.map((j) => (
              <button
                key={j.id}
                onClick={() => abrirModalInadimplente(j)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden border-2 border-red-500/40 group-hover:border-red-400 transition-colors">
                    {j.foto_url ? (
                      <img
                        src={j.foto_url}
                        alt={j.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold">
                        {j.nome.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1 py-0.5 rounded-full leading-none">
                    {j.mesesAtraso}
                  </div>
                </div>
                <span className="text-gray-400 text-[10px] text-center max-w-[48px] truncate">
                  {j.nome.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
            className={`font-black text-3xl ${inadimplentes.length > 0 ? "text-red-400" : "text-green-400"}`}
          >
            {inadimplentes.length}
          </p>
          <p className="text-gray-500 text-xs mt-1">💰 Em atraso</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
          <p className="text-blue-400 font-black text-3xl">{confirmados}</p>
          <p className="text-gray-500 text-xs mt-1">✅ Confirmados</p>
        </div>
      </div>

      {/* Próxima partida */}
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

      {/* Notificação */}
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

      {/* Enquete */}
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

      {/* Rankings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Modal inadimplente */}
      {modalInadimplente && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
          onClick={() => setModalInadimplente(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-800 flex items-center gap-4 flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-gray-800 overflow-hidden border-2 border-red-500/40 flex-shrink-0">
                {modalInadimplente.foto_url ? (
                  <img
                    src={modalInadimplente.foto_url}
                    alt={modalInadimplente.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                    {modalInadimplente.nome.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black truncate">
                  {modalInadimplente.nome}
                </p>
                <p className="text-red-400 text-sm font-semibold">
                  {modalInadimplente.mesesDevidos.length}{" "}
                  {modalInadimplente.mesesDevidos.length === 1
                    ? "mês em atraso"
                    : "meses em atraso"}
                </p>
              </div>
              <button
                onClick={() => setModalInadimplente(null)}
                className="text-gray-500 hover:text-white text-xl transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Meses devidos */}
            <div className="overflow-y-auto p-5 flex flex-col gap-3">
              {modalInadimplente.mesesDevidos.length === 0 ? (
                <p className="text-green-400 text-sm text-center py-4">
                  ✅ Todos os meses em dia!
                </p>
              ) : (
                <>
                  <p className="text-gray-400 text-xs font-semibold">
                    Meses pendentes — confirme o pagamento:
                  </p>
                  {modalInadimplente.mesesDevidos.map((m) => {
                    const key = `${m.mes}-${m.ano}`;
                    const pag = pagamentosModal.find(
                      (p) => p.mes === m.mes && p.ano === m.ano,
                    );
                    const aguardando = pag?.status === "aguardando";

                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${aguardando ? "bg-yellow-500/10 border-yellow-500/30" : "bg-gray-800 border-gray-700"}`}
                      >
                        <div className="flex-1">
                          <p className="text-white text-sm font-semibold capitalize">
                            {nomeMes(m.mes, m.ano)}
                          </p>
                          {aguardando && (
                            <p className="text-yellow-400 text-xs">
                              ⏳ Jogador avisou que pagou
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleConfirmarPagamento(m.mes, m.ano)}
                          disabled={confirmando === key}
                          className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex-shrink-0"
                        >
                          {confirmando === key ? "..." : "✓ Confirmar"}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 flex-shrink-0">
              <Link
                href="/admin/financeiro"
                onClick={() => setModalInadimplente(null)}
                className="block text-center text-green-400 text-sm font-semibold hover:underline"
              >
                Ver histórico completo →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
