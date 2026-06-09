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
  gol_contra: {
    label: "Gol Contra",
    emoji: "😬",
    cor: "text-red-400",
    bg: "bg-red-500/20",
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

function agruparEventos(eventos: EventoPartida[]) {
  const resultado: Array<{
    principal: EventoPartida;
    assistencia?: EventoPartida;
  }> = [];
  const assistenciasUsadas = new Set<string>();

  for (const e of eventos) {
    if (e.tipo === "assistencia" && assistenciasUsadas.has(e.id)) continue;
    if (e.tipo !== "gol") {
      resultado.push({ principal: e });
      continue;
    }

    const assist = eventos.find(
      (x) =>
        x.tipo === "assistencia" &&
        x.time === e.time &&
        x.minuto === e.minuto &&
        !assistenciasUsadas.has(x.id),
    );

    if (assist) {
      assistenciasUsadas.add(assist.id);
      resultado.push({ principal: e, assistencia: assist });
    } else {
      resultado.push({ principal: e });
    }
  }

  return resultado;
}

export default function FichaTecnicaPage() {
  const router = useRouter();
  const params = useParams();
  const partidaId = params.id as string;

  const [partida, setPartida] = useState<Partida | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [eventos, setEventos] = useState<EventoPartida[]>([]);
  const [loading, setLoading] = useState(true);

  const [segundos, setSegundos] = useState(0);
  const [rodando, setRodando] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [modalEvento, setModalEvento] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoEvento>("gol");
  const [jogadorSelecionado, setJogadorSelecionado] = useState("");
  const [assistenteSelecionado, setAssistenteSelecionado] = useState("");
  const [timeSelecionado, setTimeSelecionado] = useState<"A" | "B">("A");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [adicionarAssistencia, setAdicionarAssistencia] = useState(false);

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
    if (!jogadorSelecionado) return setErro("Selecione o jogador");
    if (adicionarAssistencia && !assistenteSelecionado)
      return setErro("Selecione o jogador da assistência ou desmarque a opção");
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

      if (
        tipoSelecionado === "gol" &&
        adicionarAssistencia &&
        assistenteSelecionado
      ) {
        await adicionarEvento(
          partidaId,
          assistenteSelecionado,
          "assistencia",
          timeSelecionado,
          minuto,
        );
      }

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

      if (tipoSelecionado === "gol_contra") {
        // Ponto vai para o adversário
        const novosGolsA =
          partida.gols_time_a + (timeSelecionado === "B" ? 1 : 0);
        const novosGolsB =
          partida.gols_time_b + (timeSelecionado === "A" ? 1 : 0);
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
      setAssistenteSelecionado("");
      setAdicionarAssistencia(false);
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

    if (evento.tipo === "gol_contra") {
      // Reverte: tira ponto do adversário
      const novosGolsA = Math.max(
        0,
        partida.gols_time_a - (evento.time === "B" ? 1 : 0),
      );
      const novosGolsB = Math.max(
        0,
        partida.gols_time_b - (evento.time === "A" ? 1 : 0),
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

  function abrirModal() {
    setModalEvento(true);
    setErro("");
    setJogadorSelecionado("");
    setAssistenteSelecionado("");
    setTipoSelecionado("gol");
    setTimeSelecionado("A");
    setAdicionarAssistencia(false);
  }

  const eventosOrdenados = [...eventos].sort(
    (a, b) =>
      (a.minuto ?? 0) - (b.minuto ?? 0) ||
      new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
  );

  const gruposEventos = agruparEventos(eventosOrdenados);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  const jogadoresDoTime = jogadores.filter((j) => j.id !== jogadorSelecionado);

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
        <div className="flex flex-col items-center gap-2">
          {/* Placar centralizado */}
          <div className="bg-gray-800 px-8 py-3 rounded-2xl">
            <span className="text-green-400 font-black text-4xl whitespace-nowrap">
              {partida?.gols_time_a} x {partida?.gols_time_b}
            </span>
          </div>
          {/* Nomes abaixo */}
          <div className="flex items-center justify-between w-full px-1 mt-1">
            <p className="text-gray-300 font-bold text-xs flex-1 text-left truncate">
              {partida?.time_a}
            </p>
            <p className="text-gray-600 text-xs px-3">vs</p>
            <p className="text-gray-300 font-bold text-xs flex-1 text-right truncate">
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
        onClick={abrirModal}
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

        {gruposEventos.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-2xl p-8 text-center text-gray-600">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm">Nenhum evento registrado</p>
          </div>
        ) : (
          <div className="relative flex flex-col gap-0">
            <div className="absolute left-[52px] top-4 bottom-4 w-px bg-gradient-to-b from-green-500/30 to-orange-500/30" />

            {gruposEventos.map(({ principal: e, assistencia }) => {
              const j = (e as any).jogador;
              const cfg =
                TIPO_CONFIG[e.tipo as keyof typeof TIPO_CONFIG] ??
                TIPO_CONFIG.gol;
              const isTimeA = e.time === "A";
              const assistenteJogador = assistencia
                ? (assistencia as any).jogador
                : null;
              const isGolContra = e.tipo === "gol_contra";

              return (
                <div key={e.id} className="flex items-start gap-3 py-2 group">
                  {/* Minuto */}
                  <div className="w-6 text-right flex-shrink-0 pt-2.5">
                    <span className="text-gray-400 text-xs font-mono">
                      {e.minuto !== null && e.minuto !== undefined
                        ? `${e.minuto}'`
                        : "—"}
                    </span>
                  </div>

                  {/* Ícone */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-1 ${cfg.bg}`}
                  >
                    <span className="text-sm">{cfg.emoji}</span>
                  </div>

                  {/* Card do evento */}
                  <div
                    className={`flex-1 border rounded-xl overflow-hidden transition-all ${
                      isGolContra
                        ? "bg-red-500/10 border-red-500/30 group-hover:bg-red-500/20"
                        : isTimeA
                          ? "bg-green-500/10 border-green-500/30 group-hover:bg-green-500/20"
                          : "bg-orange-500/10 border-orange-500/30 group-hover:bg-orange-500/20"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 ${!isTimeA ? "flex-row-reverse" : ""}`}
                    >
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
                      <div
                        className={`flex-1 min-w-0 ${!isTimeA ? "text-right" : ""}`}
                      >
                        <p className="text-white text-sm font-bold truncate">
                          {j?.nome ?? "—"}
                        </p>
                        <div
                          className={`flex items-center gap-2 ${!isTimeA ? "flex-row-reverse" : ""}`}
                        >
                          <span className={`text-xs font-medium ${cfg.cor}`}>
                            {cfg.label}
                          </span>
                          <span className="text-gray-600 text-xs">•</span>
                          {isGolContra ? (
                            <span
                              className={`text-xs font-bold ${isTimeA ? "text-orange-400" : "text-green-400"}`}
                            >
                              contra{" "}
                              {isTimeA ? partida?.time_b : partida?.time_a}
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-bold ${isTimeA ? "text-green-400" : "text-orange-400"}`}
                            >
                              {isTimeA ? partida?.time_a : partida?.time_b}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Remover */}
                      <button
                        onClick={() => handleRemoverEvento(e)}
                        className="text-gray-500 hover:text-red-400 transition-colors text-sm flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Linha da assistência */}
                    {assistencia && assistenteJogador && (
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 border-t ${isTimeA ? "border-green-500/20" : "border-orange-500/20"} ${!isTimeA ? "flex-row-reverse" : ""}`}
                      >
                        <span className="text-blue-400 text-xs">🎯</span>
                        <div
                          className="rounded-full overflow-hidden flex-shrink-0"
                          style={{ width: 20, height: 20 }}
                        >
                          {assistenteJogador.foto_url ? (
                            <img
                              src={assistenteJogador.foto_url}
                              alt={assistenteJogador.nome}
                              style={{
                                width: 20,
                                height: 20,
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-[9px] font-bold text-white">
                              {assistenteJogador.nome?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-blue-400 text-xs font-medium truncate">
                          {assistenteJogador.nome?.split(" ")[0]}
                        </span>
                        <span className="text-gray-600 text-xs ml-auto">
                          assist.
                        </span>
                        <button
                          onClick={() => handleRemoverEvento(assistencia)}
                          className="text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Evento */}
      {modalEvento && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-black text-lg">
                Adicionar Evento
              </h2>
              <button
                onClick={() => setModalEvento(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                {(
                  Object.entries(TIPO_CONFIG) as [
                    TipoEvento,
                    (typeof TIPO_CONFIG)[keyof typeof TIPO_CONFIG],
                  ][]
                ).map(([tipo, cfg]) => (
                  <button
                    key={tipo}
                    onClick={() => {
                      setTipoSelecionado(tipo);
                      if (tipo !== "gol") {
                        setAdicionarAssistencia(false);
                        setAssistenteSelecionado("");
                      }
                    }}
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
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  {tipoSelecionado === "gol_contra"
                    ? "Time do jogador (que fez contra)"
                    : "Time"}
                </p>
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
                {tipoSelecionado === "gol_contra" && (
                  <p className="text-gray-500 text-xs mt-2 text-center">
                    O ponto será marcado para{" "}
                    <span className="text-orange-400 font-bold">
                      {timeSelecionado === "A"
                        ? partida?.time_b
                        : partida?.time_a}
                    </span>
                  </p>
                )}
              </div>

              {/* Jogador */}
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  {tipoSelecionado === "gol" ? "Quem marcou" : "Jogador"}
                </p>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
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

              {/* Assistência — só aparece quando tipo é gol */}
              {tipoSelecionado === "gol" && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setAdicionarAssistencia((v) => !v);
                      setAssistenteSelecionado("");
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                      adicionarAssistencia
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    <span className="text-sm font-medium flex items-center gap-2">
                      🎯 Teve assistência?
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${adicionarAssistencia ? "bg-blue-500 text-black" : "bg-gray-700 text-gray-500"}`}
                    >
                      {adicionarAssistencia ? "Sim" : "Não"}
                    </span>
                  </button>

                  {adicionarAssistencia && (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        Quem deu a assistência
                      </p>
                      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                        {jogadoresDoTime.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => setAssistenteSelecionado(j.id)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors border ${
                              assistenteSelecionado === j.id
                                ? "bg-blue-500/20 border-blue-500/40 text-white"
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
                            {assistenteSelecionado === j.id && (
                              <span className="text-blue-400">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-800 flex flex-col gap-3">
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
                    : `Registrar ${TIPO_CONFIG[tipoSelecionado as keyof typeof TIPO_CONFIG]?.emoji ?? "✅"}`}{" "}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
