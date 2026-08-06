"use client";

import { getMesesRecentes, calcularAtraso } from "@/lib/utils/meses";
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
  dbGetUltimaPartidaPublico,
  dbVotarPublico,
  dbDesvotarPublico,
} from "@/lib/db/publico.db";
import { dbListarTotalPartidas } from "@/lib/db/avaliacoes.db";
import { getUser, signOut } from "@/lib/services/auth.service";
import { buscarJogadoresPorUserId } from "@/lib/services/jogadores.service";
import {
  listarPresencas,
  confirmarPresenca,
  justificarFalta,
  horarioLimitePassou,
  agruparPresencas,
} from "@/lib/services/presencas.service";
import {
  Racha,
  Estatistica,
  Notificacao,
  Enquete,
  Partida,
  Escalacao,
  Jogador,
  Presenca,
} from "@/types";

const MOTIVOS_RAPIDOS = ["Compromisso", "Lesão", "Viagem", "Trabalho"];

export default function DashboardPublicoPage() {
  const [rankingJogos, setRankingJogos] = useState<any[]>([]);
  const [estatutoUrl, setEstatutoUrl] = useState<string | null>(null);
  const [jogadoresFinanceiro, setJogadoresFinanceiro] = useState<any[]>([]);
  const [pagamentosPublico, setPagamentosPublico] = useState<any[]>([]);
  const [escalacao, setEscalacao] = useState<Escalacao | null>(null);
  const [jogadoresPublico, setJogadoresPublico] = useState<Jogador[]>([]);
  const [todosJogadores, setTodosJogadores] = useState<Jogador[]>([]);
  const params = useParams();
  const router = useRouter();
  const codigo = params.codigo as string;
  const [racha, setRacha] = useState<Racha | null>(null);
  const [stats, setStats] = useState<Estatistica[]>([]);
  const [notificacao, setNotificacao] = useState<Notificacao | null>(null);
  const [enquetes, setEnquetes] = useState<Enquete[]>([]);
  const [ultimaPartida, setUltimaPartida] = useState<Partida | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [votando, setVotando] = useState(false);
  const [votos, setVotos] = useState<Record<string, string>>({});

  // Jogador logado
  const [jogadorLogado, setJogadorLogado] = useState<Jogador | null>(null);
  const [usuarioLogadoSemVinculo, setUsuarioLogadoSemVinculo] = useState(false);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [partidasFuturas, setPartidasFuturas] = useState<Partida[]>([]);
  const [salvandoPresenca, setSalvandoPresenca] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);

  // Modal perfil do jogador
  const [modalPerfil, setModalPerfil] = useState(false);
  const [statJogador, setStatJogador] = useState<Estatistica | null>(null);
  const [totalJogos, setTotalJogos] = useState(0);

  // Modal de detalhes da partida
  const [modalPartida, setModalPartida] = useState<Partida | null>(null);
  const [modalPresencas, setModalPresencas] = useState<Presenca[]>([]);
  const [carregandoModal, setCarregandoModal] = useState(false);

  // Modal de justificativa de falta
  const [modalFalta, setModalFalta] = useState<Partida | null>(null);
  const [motivoFalta, setMotivoFalta] = useState("");
  const [motivoCustom, setMotivoCustom] = useState("");
  const [salvandoFalta, setSalvandoFalta] = useState(false);

  useEffect(() => {
    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo);
      if (!r) return setNotFound(true);
      setRacha(r);
      setEstatutoUrl((r as any).estatuto_url ?? null);

      const [s, n, p, esc] = await Promise.all([
        dbGetEstatisticasPublico(r.id),
        dbGetNotificacaoAtivaPublico(r.id),
        dbGetUltimaPartidaPublico(r.id),
        dbGetEscalacaoAtivaPublico(r.id),
      ]);

      setStats(s);
      setNotificacao(n);
      setUltimaPartida(p);
      setEscalacao(esc);

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

      const { data: todosJogs } = await getSupabase()
        .from("jogadores")
        .select("*")
        .eq("racha_id", r.id)
        .eq("ativo", true);
      setTodosJogadores(todosJogs ?? []);

      const partidasMap = await dbListarTotalPartidas(r.id);
      const partidasRanking = [...(todosJogs ?? [])]
        .map((j: any) => ({
          ...j,
          total_partidas:
            partidasMap.find((p) => p.jogador_id === j.id)?.total_partidas ?? 0,
        }))
        .filter((j: any) => j.total_partidas > 0)
        .sort((a: any, b: any) =>
          b.total_partidas !== a.total_partidas
            ? b.total_partidas - a.total_partidas
            : a.nome.localeCompare(b.nome),
        );
      setRankingJogos(partidasRanking);

      const { data: jogs } = await getSupabase()
        .from("jogadores")
        .select("*")
        .eq("racha_id", r.id)
        .eq("ativo", true)
        .eq("mensalista", true);
      const { data: pags } = await getSupabase()
        .from("pagamentos")
        .select("*")
        .eq("racha_id", r.id);
      setJogadoresFinanceiro(jogs ?? []);
      setPagamentosPublico(pags ?? []);

      const { data: enqs } = await getSupabase()
        .from("enquetes")
        .select(
          "*, opcoes:enquete_opcoes(*, jogador:jogadores(id, nome, foto_url))",
        )
        .eq("racha_id", r.id)
        .eq("ativa", true)
        .order("criado_em", { ascending: false });
      setEnquetes(enqs ?? []);

      const hoje = new Date().toISOString().split("T")[0];
      const { data: futuras } = await getSupabase()
        .from("partidas")
        .select("*")
        .eq("racha_id", r.id)
        .eq("encerrada", false)
        .gte("data", hoje)
        .order("data", { ascending: true })
        .limit(3);
      setPartidasFuturas(futuras ?? []);

      const votosSalvos: Record<string, string> = {};
      Object.keys(localStorage)
        .filter((k) => k.startsWith("voto_enquete_"))
        .forEach((k) => {
          const id = k.replace("voto_enquete_", "");
          votosSalvos[id] = localStorage.getItem(k) ?? "";
        });
      setVotos(votosSalvos);

      try {
        const user = await getUser();
        if (user) {
          const jogadoresDoUsuario = await buscarJogadoresPorUserId(user.id);
          const jogadorDestePerfil = jogadoresDoUsuario.find(
            (j) => j.racha_id === r.id,
          );
          if (jogadorDestePerfil) {
            setJogadorLogado(jogadorDestePerfil);
            if (futuras && futuras.length > 0) {
              const todasPresencas: Presenca[] = [];
              for (const partida of futuras) {
                const p = await listarPresencas(partida.id);
                todasPresencas.push(...p);
              }
              setPresencas(todasPresencas);
            }
            // Carrega stats do jogador logado
            const statDoJogador = s.find(
              (x) => x.jogador_id === jogadorDestePerfil.id,
            );
            setStatJogador(statDoJogador ?? null);
            const partidas = await dbListarTotalPartidas(r.id);
            const jogos =
              partidas.find((p) => p.jogador_id === jogadorDestePerfil.id)
                ?.total_partidas ?? 0;
            setTotalJogos(jogos);
          } else {
            setUsuarioLogadoSemVinculo(true);
          }
        }
      } catch {}

      setLoading(false);
    }
    carregar();
  }, [codigo]);

  async function handleSair() {
    setSaindo(true);
    await signOut();
    router.push("/login");
  }

  async function abrirModalPartida(partida: Partida) {
    setModalPartida(partida);
    setCarregandoModal(true);
    try {
      const p = await listarPresencas(partida.id);
      setModalPresencas(p);
    } finally {
      setCarregandoModal(false);
    }
  }

  async function handleConfirmar(partidaId: string) {
    if (!jogadorLogado || salvandoPresenca) return;
    setSalvandoPresenca(partidaId);
    try {
      await confirmarPresenca(partidaId, jogadorLogado.id);
      const novaPresenca: Presenca = {
        id: crypto.randomUUID(),
        partida_id: partidaId,
        jogador_id: jogadorLogado.id,
        confirmado: true,
        criado_em: new Date().toISOString(),
      };
      setPresencas((prev) => {
        const existe = prev.find(
          (p) =>
            p.partida_id === partidaId && p.jogador_id === jogadorLogado.id,
        );
        if (existe)
          return prev.map((p) =>
            p.partida_id === partidaId && p.jogador_id === jogadorLogado.id
              ? { ...p, confirmado: true, motivo: undefined }
              : p,
          );
        return [...prev, novaPresenca];
      });
      if (modalPartida?.id === partidaId) {
        const p = await listarPresencas(partidaId);
        setModalPresencas(p);
      }
    } finally {
      setSalvandoPresenca(null);
    }
  }

  async function handleSalvarFalta() {
    if (!jogadorLogado || !modalFalta || salvandoFalta) return;
    const motivo = motivoFalta === "outro" ? motivoCustom.trim() : motivoFalta;
    if (!motivo) return;
    setSalvandoFalta(true);
    try {
      await justificarFalta(modalFalta.id, jogadorLogado.id, motivo);
      setPresencas((prev) => {
        const existe = prev.find(
          (p) =>
            p.partida_id === modalFalta.id && p.jogador_id === jogadorLogado.id,
        );
        if (existe)
          return prev.map((p) =>
            p.partida_id === modalFalta.id && p.jogador_id === jogadorLogado.id
              ? { ...p, confirmado: false, motivo }
              : p,
          );
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            partida_id: modalFalta.id,
            jogador_id: jogadorLogado.id,
            confirmado: false,
            motivo,
            criado_em: new Date().toISOString(),
          },
        ];
      });
      setModalFalta(null);
      setMotivoFalta("");
      setMotivoCustom("");
    } finally {
      setSalvandoFalta(false);
    }
  }

  function presencaAtual(partidaId: string): Presenca | undefined {
    if (!jogadorLogado) return undefined;
    return presencas.find(
      (p) => p.partida_id === partidaId && p.jogador_id === jogadorLogado.id,
    );
  }

  function totalConfirmados(partidaId: string): number {
    return presencas.filter((p) => p.partida_id === partidaId && p.confirmado)
      .length;
  }

  async function handleVotar(enqueteId: string, opcaoId: string) {
    if (!jogadorLogado || votando || !racha) return;
    const votouAtual = votos[enqueteId];
    const jaVotouETrocou =
      votouAtual && localStorage.getItem(`trocou_voto_${enqueteId}`);
    if (jaVotouETrocou) return;
    if (votouAtual === opcaoId) return;
    setVotando(true);
    try {
      if (votouAtual) {
        await dbDesvotarPublico(votouAtual);
        localStorage.setItem(`trocou_voto_${enqueteId}`, "1");
      }
      await dbVotarPublico(opcaoId);
      setVotos((prev) => ({ ...prev, [enqueteId]: opcaoId }));
      localStorage.setItem(`voto_enquete_${enqueteId}`, opcaoId);
      const { data } = await getSupabase()
        .from("enquetes")
        .select(
          "*, opcoes:enquete_opcoes(*, jogador:jogadores(id, nome, foto_url))",
        )
        .eq("id", enqueteId)
        .single();
      if (data)
        setEnquetes((prev) => prev.map((e) => (e.id === enqueteId ? data : e)));
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
          <div className="flex items-center gap-3">
            {jogadorLogado ? (
              <>
                {/* Avatar — abre modal de perfil */}
                <button
                  onClick={() => setModalPerfil(true)}
                  className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-green-500/20 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                    {jogadorLogado.foto_url ? (
                      <img
                        src={jogadorLogado.foto_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-xs">
                        👤
                      </span>
                    )}
                  </div>
                  {jogadorLogado.nome.split(" ")[0]}
                </button>
                {/* Botão sair */}
                <button
                  onClick={handleSair}
                  disabled={saindo}
                  className="text-gray-500 hover:text-red-400 text-xs transition-colors disabled:opacity-50"
                >
                  {saindo ? "..." : "Sair"}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-gray-500 hover:text-green-400 text-xs transition-colors font-semibold"
              >
                Entrar →
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-5 pb-10">
        {/* Notificação */}
        {jogadorLogado && notificacao && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>🔔</span>
              <span className="text-yellow-400 font-bold text-sm">Aviso</span>
            </div>
            <p className="text-white font-semibold">{notificacao.titulo}</p>
            <p className="text-gray-400 text-sm mt-1">{notificacao.mensagem}</p>
          </div>
        )}

        {jogadorLogado && (
          <div className="text-center">
            <Link
              href={`/racha/${codigo}/avaliar`}
              className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-yellow-500/20 transition-colors"
            >
              ⭐ Avaliar jogadores
            </Link>
          </div>
        )}

        {/* Próximas partidas */}
        {partidasFuturas.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span className="text-white font-bold">Próximas partidas</span>
            </div>
            {partidasFuturas.map((partida) => {
              const presenca = presencaAtual(partida.id);
              const total = totalConfirmados(partida.id);
              const carregando = salvandoPresenca === partida.id;
              const bloqueado = jogadorLogado?.bloqueado ?? false;
              const limitePasso = horarioLimitePassou(
                partida.data,
                racha?.horario_limite_presenca ?? undefined,
              );

              return (
                <div
                  key={partida.id}
                  className="bg-gray-800 rounded-xl px-4 py-3 flex flex-col gap-2"
                >
                  <button
                    onClick={() => abrirModalPartida(partida)}
                    className="flex items-center gap-3 w-full text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">
                        {partida.time_a} vs {partida.time_b}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {new Date(
                          partida.data + "T12:00:00",
                        ).toLocaleDateString("pt-BR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                        {partida.local ? ` · ${partida.local}` : ""}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {total} confirmado{total !== 1 ? "s" : ""} · ver lista →
                      </p>
                    </div>
                  </button>

                  {jogadorLogado && (
                    <div className="flex gap-2">
                      {bloqueado ? (
                        racha?.whatsapp_diretoria ? (
                          <a
                            href={`https://wa.me/55${racha.whatsapp_diretoria}?text=${encodeURIComponent("Olá! Gostaria de falar sobre minha situação no racha.")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 rounded-xl text-xs font-bold text-center bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors"
                          >
                            💬 Falar com a diretoria
                          </a>
                        ) : (
                          <p className="text-red-400 text-xs flex-1 text-center py-2">
                            Confirmação bloqueada pela diretoria
                          </p>
                        )
                      ) : limitePasso ? (
                        <div className="flex-1 py-2 rounded-xl text-xs font-bold text-center bg-gray-700 text-gray-500 cursor-default">
                          {presenca?.confirmado
                            ? "✓ Confirmado"
                            : presenca?.motivo
                              ? `❌ ${presenca.motivo}`
                              : "⏰ Prazo encerrado"}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleConfirmar(partida.id)}
                            disabled={!!carregando}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${presenca?.confirmado ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-gray-700 text-gray-400 hover:bg-green-500/20 hover:text-green-400"}`}
                          >
                            {carregando
                              ? "..."
                              : presenca?.confirmado
                                ? "✓ Confirmado"
                                : "Confirmar"}
                          </button>
                          <button
                            onClick={() => {
                              setModalFalta(partida);
                              setMotivoFalta("");
                              setMotivoCustom("");
                            }}
                            disabled={!!carregando}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${presenca && !presenca.confirmado && presenca.motivo ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-gray-700 text-gray-400 hover:bg-red-500/20 hover:text-red-400"}`}
                          >
                            {presenca && !presenca.confirmado && presenca.motivo
                              ? `❌ ${presenca.motivo}`
                              : "Justificar falta"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {!jogadorLogado && (
                    <Link
                      href="/login"
                      className="block text-center py-2 rounded-xl text-xs font-bold bg-gray-700 text-gray-500 hover:text-green-400 transition-colors"
                    >
                      Entrar para confirmar
                    </Link>
                  )}
                </div>
              );
            })}
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
            />
          </div>
        )}

        {/* Enquetes */}
        {enquetes.map((enquete) => {
          const votou = votos[enquete.id] ?? null;
          const jaVotouETrocou =
            votou && localStorage.getItem(`trocou_voto_${enquete.id}`);
          const isJogador = (enquete as any).tipo === "jogador";
          const podeVotar = !!jogadorLogado;

          return (
            <div
              key={enquete.id}
              className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span>{isJogador ? "👤" : "📋"}</span>
                <span className="text-blue-400 font-bold text-sm flex-1">
                  {enquete.pergunta}
                </span>
                <span className="text-gray-500 text-xs">
                  {enquete.opcoes?.reduce((acc, o) => acc + o.votos, 0) ?? 0}{" "}
                  votos
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {[...(enquete.opcoes ?? [])]
                  .sort((a, b) => (votou ? b.votos - a.votos : 0))
                  .map((op) => {
                    const total =
                      enquete.opcoes?.reduce((acc, o) => acc + o.votos, 0) ?? 0;
                    const pct =
                      total > 0 ? Math.round((op.votos / total) * 100) : 0;
                    const selecionada = votou === op.id;
                    const jogador = (op as any).jogador;
                    const bloqueado = !podeVotar || !!jaVotouETrocou;

                    return isJogador ? (
                      <button
                        key={op.id}
                        onClick={() =>
                          podeVotar && !jaVotouETrocou
                            ? handleVotar(enquete.id, op.id)
                            : null
                        }
                        disabled={bloqueado && !votou}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-all ${selecionada ? "border-blue-400 bg-blue-500/20" : podeVotar && !jaVotouETrocou ? "border-gray-700 bg-gray-800 hover:border-blue-500/50 cursor-pointer" : "border-gray-700 bg-gray-800 opacity-70 cursor-default"}`}
                      >
                        <div
                          className="rounded-full overflow-hidden border-2 flex-shrink-0"
                          style={{
                            width: 40,
                            height: 40,
                            borderColor: selecionada ? "#60a5fa" : "#374151",
                          }}
                        >
                          {jogador?.foto_url ? (
                            <img
                              src={jogador.foto_url}
                              alt={jogador.nome}
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white font-bold">
                              {op.opcao.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-white text-sm font-medium flex-1 text-left">
                          {op.opcao}
                        </span>
                        {votou && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-blue-400 font-bold text-xs w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        )}
                        {selecionada && (
                          <span className="text-blue-400 text-sm flex-shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    ) : (
                      <button
                        key={op.id}
                        onClick={() =>
                          podeVotar && !jaVotouETrocou
                            ? handleVotar(enquete.id, op.id)
                            : null
                        }
                        disabled={bloqueado && !votou}
                        className={`w-full text-left rounded-xl overflow-hidden transition-all ${selecionada ? "ring-2 ring-blue-400" : podeVotar && !jaVotouETrocou ? "hover:ring-2 hover:ring-blue-500/50 cursor-pointer" : "cursor-default"}`}
                      >
                        <div className="relative bg-gray-800 px-4 py-3">
                          {votou && (
                            <div
                              className="absolute inset-0 bg-blue-500/20"
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
              <div className="mt-3 text-center">
                {!podeVotar && (
                  <Link
                    href="/login"
                    className="text-blue-400 text-xs hover:underline"
                  >
                    Entre como jogador para votar →
                  </Link>
                )}
                {podeVotar && !votou && (
                  <p className="text-gray-500 text-xs">Toque para votar</p>
                )}
                {podeVotar && votou && !jaVotouETrocou && (
                  <p className="text-blue-400 text-xs">
                    ✓ Votado — você pode trocar uma vez
                  </p>
                )}
                {podeVotar && jaVotouETrocou && (
                  <p className="text-gray-500 text-xs">✓ Voto registrado</p>
                )}
              </div>
              <Link
                href={`/racha/${codigo}/enquetes`}
                className="block text-center text-blue-400 text-xs mt-3 hover:underline"
              >
                ver todas as enquetes →
              </Link>
            </div>
          );
        })}

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

        {/* Jogos disputados */}
        <Link href={`/racha/${codigo}/jogos`}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>🏟️</span>
                <span className="text-white font-bold">Jogos disputados</span>
              </div>
              <span className="text-gray-500 text-xs">ver todos →</span>
            </div>
            {rankingJogos.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-2">
                Nenhum jogo registrado
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {rankingJogos.slice(0, 5).map((j, i) => (
                  <div key={j.id} className="flex items-center gap-3">
                    <span
                      className={`text-sm w-5 font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-600"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                      {j.foto_url ? (
                        <img
                          src={j.foto_url}
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
                    <span className="text-white text-sm flex-1">{j.nome}</span>
                    <span className="text-white font-bold text-sm">
                      {j.total_partidas} 🏟️
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

        {/* Financeiro */}
        {jogadoresFinanceiro.length > 0 && (
          <Link href={`/racha/${codigo}/financeiro`}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span>💰</span>
                  <span className="text-white font-bold">Mensalidades</span>
                </div>
                <span className="text-gray-500 text-xs">ver todos →</span>
              </div>
              {(() => {
                const meses = getMesesRecentes(3);
                const devedores = [...jogadoresFinanceiro]
                  .map((j) => ({
                    j,
                    atraso: calcularAtraso(j.id, pagamentosPublico, meses),
                  }))
                  .filter((x) => x.atraso > 0)
                  .sort((a, b) => b.atraso - a.atraso)
                  .slice(0, 5);
                if (devedores.length === 0)
                  return (
                    <p className="text-green-400 text-sm text-center py-2">
                      ✅ Todos em dia!
                    </p>
                  );
                return (
                  <div className="flex flex-col gap-2">
                    {devedores.map(({ j, atraso }) => (
                      <div key={j.id} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                          {j.foto_url ? (
                            <img
                              src={j.foto_url}
                              alt=""
                              style={{
                                width: 28,
                                height: 28,
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                              {j.nome.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-white text-sm flex-1">
                          {j.nome}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${atraso >= 2 ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}
                        >
                          {atraso} {atraso === 1 ? "mês" : "meses"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </Link>
        )}

        {/* Estatuto */}
        {estatutoUrl && (
          <Link href={`/racha/${codigo}/estatuto`}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors cursor-pointer flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📄</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">Estatuto do Racha</p>
                <p className="text-gray-500 text-sm">Regras e regulamento</p>
              </div>
              <span className="text-gray-500 text-sm">→</span>
            </div>
          </Link>
        )}

        <div className="text-center pt-2">
          <Link
            href="/instalar"
            className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
          >
            📲 Como instalar o app?
          </Link>
        </div>
      </main>

      {/* Modal perfil do jogador */}
      {modalPerfil && jogadorLogado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
          onClick={() => setModalPerfil(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black">Meu perfil</h2>
              <button
                onClick={() => setModalPerfil(false)}
                className="text-gray-500 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Foto + info */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 border-2 border-green-500/30">
                {jogadorLogado.foto_url ? (
                  <img
                    src={jogadorLogado.foto_url}
                    alt={jogadorLogado.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    👤
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-black text-lg">
                  {jogadorLogado.nome}
                </p>
                <p className="text-gray-400 text-sm">{jogadorLogado.posicao}</p>
                <p className="text-gray-500 text-xs mt-0.5">{racha?.nome}</p>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-green-400 font-black text-2xl">
                  {statJogador?.gols ?? 0}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">⚽ Gols</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-blue-400 font-black text-2xl">
                  {statJogador?.assistencias ?? 0}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">🎯 Assistências</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-white font-black text-2xl">{totalJogos}</p>
                <p className="text-gray-500 text-xs mt-0.5">🏟️ Jogos</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-yellow-400 font-black text-xl">
                    {statJogador?.cartoes_amarelos ?? 0}
                  </span>
                  <span className="text-gray-600 text-sm">|</span>
                  <span className="text-red-400 font-black text-xl">
                    {statJogador?.cartoes_vermelhos ?? 0}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">🟨 🟥 Cartões</p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Link
                href={`/racha/${codigo}/avaliar`}
                onClick={() => setModalPerfil(false)}
                className="flex-1 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-semibold text-center hover:bg-yellow-500/20 transition-colors"
              >
                ⭐ Avaliar jogadores
              </Link>
              <Link
                href="/jogador/perfil"
                onClick={() => setModalPerfil(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm font-semibold text-center hover:bg-gray-700 transition-colors"
              >
                Meus rachas →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhes da partida */}
      {modalPartida && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
          onClick={() => setModalPartida(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-white font-black">
                  {modalPartida.time_a} vs {modalPartida.time_b}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {new Date(modalPartida.data + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                    { weekday: "long", day: "2-digit", month: "long" },
                  )}
                  {modalPartida.local ? ` · ${modalPartida.local}` : ""}
                </p>
              </div>
              <button
                onClick={() => setModalPartida(null)}
                className="text-gray-500 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex flex-col gap-5">
              {carregandoModal ? (
                <p className="text-gray-500 text-sm text-center animate-pulse">
                  Carregando...
                </p>
              ) : (
                (() => {
                  const { confirmados, ausencias, semResposta } =
                    agruparPresencas(modalPresencas, todosJogadores);
                  return (
                    <>
                      <div>
                        <p className="text-green-400 text-xs font-bold mb-2">
                          ✅ Confirmados ({confirmados.length})
                        </p>
                        {confirmados.length === 0 ? (
                          <p className="text-gray-600 text-xs">
                            Nenhum confirmado ainda
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {confirmados.map((p) => {
                              const jog =
                                p.jogador ??
                                todosJogadores.find(
                                  (j) => j.id === p.jogador_id,
                                );
                              return (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-2"
                                >
                                  <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                                    {jog?.foto_url ? (
                                      <img
                                        src={jog.foto_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs">
                                        👤
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-white text-sm">
                                    {jog?.nome ?? "—"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {ausencias.length > 0 && (
                        <div>
                          <p className="text-red-400 text-xs font-bold mb-2">
                            ❌ Ausências justificadas ({ausencias.length})
                          </p>
                          <div className="flex flex-col gap-2">
                            {ausencias.map((p) => {
                              const jog =
                                p.jogador ??
                                todosJogadores.find(
                                  (j) => j.id === p.jogador_id,
                                );
                              return (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-2"
                                >
                                  <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                                    {jog?.foto_url ? (
                                      <img
                                        src={jog.foto_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs">
                                        👤
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-white text-sm flex-1">
                                    {jog?.nome ?? "—"}
                                  </span>
                                  <span className="text-gray-500 text-xs bg-gray-800 px-2 py-0.5 rounded-full">
                                    {p.motivo}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {semResposta.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs font-bold mb-2">
                            ⏳ Sem resposta ({semResposta.length})
                          </p>
                          <div className="flex flex-col gap-2">
                            {semResposta.map((jog: Jogador) => (
                              <div
                                key={jog.id}
                                className="flex items-center gap-2"
                              >
                                <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                                  {jog.foto_url ? (
                                    <img
                                      src={jog.foto_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs">
                                      👤
                                    </div>
                                  )}
                                </div>
                                <span className="text-gray-400 text-sm">
                                  {jog.nome}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal justificativa de falta */}
      {modalFalta && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
          onClick={() => setModalFalta(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md flex flex-col gap-4 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black">Justificar falta</h2>
              <button
                onClick={() => setModalFalta(null)}
                className="text-gray-500 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-400 text-sm">
              {modalFalta.time_a} vs {modalFalta.time_b} ·{" "}
              {new Date(modalFalta.data + "T12:00:00").toLocaleDateString(
                "pt-BR",
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS_RAPIDOS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMotivoFalta(m)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${motivoFalta === m ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                >
                  {m}
                </button>
              ))}
              <button
                onClick={() => setMotivoFalta("outro")}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors col-span-2 ${motivoFalta === "outro" ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                Outro motivo
              </button>
            </div>
            {motivoFalta === "outro" && (
              <input
                type="text"
                placeholder="Descreva o motivo..."
                value={motivoCustom}
                onChange={(e) => setMotivoCustom(e.target.value)}
                maxLength={50}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setModalFalta(null)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarFalta}
                disabled={
                  salvandoFalta ||
                  !motivoFalta ||
                  (motivoFalta === "outro" && !motivoCustom.trim())
                }
                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
              >
                {salvandoFalta ? "Salvando..." : "Confirmar falta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
