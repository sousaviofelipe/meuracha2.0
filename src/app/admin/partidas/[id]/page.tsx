"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import { listarJogadores } from "@/lib/services/jogadores.service";
import {
  getEventosPartida,
  adicionarEvento,
  removerEvento,
  atualizarPlacar,
  iniciarCronometro,
  pausarCronometro,
  resetarCronometro,
} from "@/lib/services/partidas.service";
import { getSupabase } from "@/lib/db/supabase";
import { Partida, Jogador, EventoPartida, TipoEvento } from "@/types";

const TIPO_CONFIG = {
  gol: {
    label: "Gol",
    emoji: "⚽",
    cor: "text-green-400",
    bg: "bg-green-500/20",
  },
  assistencia: {
    label: "Assistência",
    emoji: "🎯",
    cor: "text-blue-400",
    bg: "bg-blue-500/20",
  },
  cartao_amarelo: {
    label: "Amarelo",
    emoji: "🟨",
    cor: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  cartao_vermelho: {
    label: "Vermelho",
    emoji: "🟥",
    cor: "text-red-400",
    bg: "bg-red-500/20",
  },
};

function formatarTempo(seg: number) {
  const m = Math.floor(seg / 60)
    .toString()
    .padStart(2, "0");
  const s = (seg % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function FichaTecnicaPage() {
  const router = useRouter();
  const params = useParams();
  const partidaId = params.id as string;

  const [partida, setPartida] = useState<Partida | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [eventos, setEventos] = useState<EventoPartida[]>([]);
  const [loading, setLoading] = useState(true);

  // Cronômetro
  const [segundos, setSegundos] = useState(0);
  const [rodando, setRodando] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modal
  const [modalEvento, setModalEvento] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoEvento>("gol");
  const [jogadorSelecionado, setJogadorSelecionado] = useState("");
  const [timeSelecionado, setTimeSelecionado] = useState<"A" | "B">("A");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");

      const { data: p } = await getSupabase()
        .from("partidas")
        .select("*")
        .eq("id", partidaId)
        .single();
      if (!p) return router.push("/admin/partidas");
      setPartida(p);

      // Restaura cronômetro
      let seg = p.cronometro_pausado ?? 0;
      if (p.cronometro_inicio) {
        const diff = Math.floor(
          (Date.now() - new Date(p.cronometro_inicio).getTime()) / 1000,
        );
        seg = seg + diff;
        setRodando(true);
      }
      setSegundos(seg);

      const [j, e] = await Promise.all([
        listarJogadores(r.id),
        getEventosPartida(partidaId),
      ]);
      setJogadores(j.filter((x) => x.ativo));
      setEventos(e);
      setLoading(false);
    }
    carregar();
  }, []);

  // Cronômetro tick
  useEffect(() => {
    if (rodando) {
      intervalRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rodando]);

  async function handleIniciar() {
    if (!partida) return;
    await iniciarCronometro(partida.id);
    setPartida((prev) =>
      prev
        ? {
            ...prev,
            cronometro_inicio: new Date().toISOString(),
            cronometro_pausado: segundos,
          }
        : prev,
    );
    setRodando(true);
  }

  async function handlePausar() {
    if (!partida) return;
    await pausarCronometro(partida.id, segundos);
    setPartida((prev) =>
      prev
        ? {
            ...prev,
            cronometro_inicio: undefined,
            cronometro_pausado: segundos,
          }
        : prev,
    );
    setRodando(false);
  }

  async function handleResetar() {
    if (!partida || !confirm("Resetar o cronômetro?")) return;
    await resetarCronometro(partida.id);
    setSegundos(0);
    setRodando(false);
  }

  async function handleAdicionarEvento() {
    if (!jogadorSelecionado) return setErro("Selecione um jogador");
    if (!partida) return;
    setSalvando(true);
    setErro("");
    try {
      const minuto = Math.floor(segundos / 60);
      await adicionarEvento(
        partidaId,
        jogadorSelecionado,
        tipoSelecionado,
        timeSelecionado,
        minuto,
      );

      // Atualiza placar automaticamente se for gol
      if (tipoSelecionado === "gol") {
        const novosGolsA =
          partida.gols_time_a + (timeSelecionado === "A" ? 1 : 0);
        const novosGolsB =
          partida.gols_time_b + (timeSelecionado === "B" ? 1 : 0);
        await atualizarPlacar(partida.id, novosGolsA, novosGolsB);
        setPartida((prev) =>
          prev
            ? { ...prev, gols_time_a: novosGolsA, gols_time_b: novosGolsB }
            : prev,
        );
      }

      const eventosAtualizados = await getEventosPartida(partidaId);
      setEventos(eventosAtualizados);
      setModalEvento(false);
      setJogadorSelecionado("");
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemoverEvento(evento: EventoPartida) {
    if (!confirm("Remover este evento?")) return;
    if (!partida) return;
    await removerEvento(evento.id);

    // Reverte placar se for gol
    if (evento.tipo === "gol") {
      const novosGolsA = Math.max(
        0,
        partida.gols_time_a - (evento.time === "A" ? 1 : 0),
      );
      const novosGolsB = Math.max(
        0,
        partida.gols_time_b - (evento.time === "B" ? 1 : 0),
      );
      await atualizarPlacar(partida.id, novosGolsA, novosGolsB);
      setPartida((prev) =>
        prev
          ? { ...prev, gols_time_a: novosGolsA, gols_time_b: novosGolsB }
          : prev,
      );
    }

    setEventos((prev) => prev.filter((e) => e.id !== evento.id));
  }

  const eventosOrdenados = [...eventos].sort(
    (a, b) =>
      (a.minuto ?? 0) - (b.minuto ?? 0) ||
      new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Voltar
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white">Ficha Técnica</h1>
          <p className="text-gray-400 text-sm">
            {partida &&
              new Date(partida.data + "T12:00:00").toLocaleDateString("pt-BR")}
            {partida?.local ? ` • ${partida.local}` : ""}
          </p>
        </div>
        {partida?.encerrada && (
          <span className="text-xs bg-gray-800 text-gray-500 px-3 py-1 rounded-full">
            Encerrada
          </span>
        )}
      </div>

      {/* Placar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 text-right">
            <p className="text-white font-black text-lg truncate">
              {partida?.time_a}
            </p>
          </div>
          <div className="bg-gray-800 px-6 py-3 rounded-2xl text-center min-w-[100px]">
            <span className="text-green-400 font-black text-3xl">
              {partida?.gols_time_a} x {partida?.gols_time_b}
            </span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-black text-lg truncate">
              {partida?.time_b}
            </p>
          </div>
        </div>
      </div>

      {/* Cronômetro */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`text-3xl font-black font-mono ${rodando ? "text-green-400" : "text-white"}`}
            >
              {formatarTempo(segundos)}
            </span>
            {rodando && (
              <span className="flex items-center gap-1 text-green-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                ao vivo
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!rodando ? (
              <button
                onClick={handleIniciar}
                className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                ▶ Iniciar
              </button>
            ) : (
              <button
                onClick={handlePausar}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                ⏸ Pausar
              </button>
            )}
            <button
              onClick={handleResetar}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              ↺
            </button>
          </div>
        </div>
      </div>

      {/* Botão adicionar evento */}
      <button
        onClick={() => {
          setModalEvento(true);
          setErro("");
          setJogadorSelecionado("");
          setTipoSelecionado("gol");
          setTimeSelecionado("A");
        }}
        className="w-full py-3 rounded-2xl bg-green-500 hover:bg-green-400 text-black font-bold transition-colors"
      >
        + Adicionar Evento
      </button>

      {/* Linha do tempo */}
      <div className="flex flex-col gap-1">
        <h2 className="text-gray-400 text-sm font-semibold mb-2">
          Linha do tempo • {eventos.length} evento
          {eventos.length !== 1 ? "s" : ""}
        </h2>

        {eventosOrdenados.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-2xl p-8 text-center text-gray-600">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm">Nenhum evento registrado</p>
          </div>
        ) : (
          <div className="relative flex flex-col gap-0">
            {/* Linha vertical */}
            <div className="absolute left-[52px] top-4 bottom-4 w-px bg-gradient-to-b from-green-500/30 to-orange-500/30" />

            {eventosOrdenados.map((e, idx) => {
              const j = (e as any).jogador;
              const cfg = TIPO_CONFIG[e.tipo];
              const isTimeA = e.time === "A";

              return (
                <div key={e.id} className="flex items-start gap-3 py-2 group">
                  {/* Minuto */}
                  <div className="w-10 text-right flex-shrink-0 pt-2.5">
                    <span className="text-gray-500 text-xs font-mono">
                      {e.minuto !== null && e.minuto !== undefined
                        ? `${e.minuto}'`
                        : "—"}
                    </span>
                  </div>

                  {/* Ícone */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-1 ${cfg.bg}`}
                  >
                    <span className="text-sm">{cfg.emoji}</span>
                  </div>

                  {/* Card do evento */}
                  <div
                    className={`flex-1 border rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      isTimeA
                        ? "bg-green-500/10 border-green-500/30 group-hover:border-green-500/60"
                        : "bg-orange-500/10 border-orange-500/30 group-hover:border-orange-500/60"
                    }`}
                  >
                    {" "}
                    {/* Foto */}
                    <div
                      className="rounded-full overflow-hidden flex-shrink-0"
                      style={{ width: 32, height: 32 }}
                    >
                      {j?.foto_url ? (
                        <img
                          src={j.foto_url}
                          alt={j.nome}
                          style={{
                            width: 32,
                            height: 32,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs font-bold text-white">
                          {j?.nome?.charAt(0) ?? "?"}
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">
                        {j?.nome ?? "—"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${cfg.cor}`}>
                          {cfg.label}
                        </span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span
                          className={`text-xs font-bold ${isTimeA ? "text-green-400" : "text-orange-400"}`}
                        >
                          {isTimeA ? partida?.time_a : partida?.time_b}
                        </span>
                      </div>
                    </div>
                    {/* Remover */}
                    <button
                      onClick={() => handleRemoverEvento(e)}
                      className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Evento */}
      {modalEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-white font-black text-lg">Adicionar Evento</h2>

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              {(
                Object.entries(TIPO_CONFIG) as [
                  TipoEvento,
                  (typeof TIPO_CONFIG)[TipoEvento],
                ][]
              ).map(([tipo, cfg]) => (
                <button
                  key={tipo}
                  onClick={() => setTipoSelecionado(tipo)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    tipoSelecionado === tipo
                      ? "bg-green-500 text-black"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>

            {/* Time */}
            <div>
              <p className="text-gray-400 text-sm mb-2">Time do jogador</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTimeSelecionado("A")}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    timeSelecionado === "A"
                      ? "bg-green-500 text-black"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {partida?.time_a}
                </button>
                <button
                  onClick={() => setTimeSelecionado("B")}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    timeSelecionado === "B"
                      ? "bg-green-500 text-black"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {partida?.time_b}
                </button>
              </div>

              {/* Jogador */}
              <div className="flex flex-col gap-2 mt-3">
                {" "}
                <p className="text-gray-400 text-sm mb-2">
                  Selecione o jogador
                </p>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {jogadores.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => setJogadorSelecionado(j.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors border ${
                        jogadorSelecionado === j.id
                          ? "bg-green-500/20 border-green-500/40 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      <div
                        className="rounded-full overflow-hidden flex-shrink-0"
                        style={{ width: 32, height: 32 }}
                      >
                        {j.foto_url ? (
                          <img
                            src={j.foto_url}
                            alt={j.nome}
                            style={{
                              width: 32,
                              height: 32,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                            {j.nome.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{j.nome}</p>
                        <p className="text-xs opacity-60">{j.posicao}</p>
                      </div>
                      {jogadorSelecionado === j.id && (
                        <span className="text-green-400">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-800 flex flex-col gap-3">
              {erro && <p className="text-red-400 text-sm">{erro}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setModalEvento(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdicionarEvento}
                  disabled={salvando}
                  className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
                >
                  {salvando
                    ? "Salvando..."
                    : `Registrar ${TIPO_CONFIG[tipoSelecionado].emoji}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
