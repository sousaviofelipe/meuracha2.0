"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import { listarJogadores } from "@/lib/services/jogadores.service";
import {
  getEventosPartida,
  adicionarEvento,
  removerEvento,
  atualizarPlacar,
} from "@/lib/services/partidas.service";
import { getSupabase } from "@/lib/db/supabase";
import { Partida, Jogador, EventoPartida, TipoEvento } from "@/types";

const TIPO_CONFIG = {
  gol: { label: "Gol", emoji: "⚽", cor: "text-green-400" },
  assistencia: { label: "Assistência", emoji: "🎯", cor: "text-blue-400" },
  cartao_amarelo: { label: "Amarelo", emoji: "🟨", cor: "text-yellow-400" },
  cartao_vermelho: { label: "Vermelho", emoji: "🟥", cor: "text-red-400" },
};

export default function FichaTecnicaPage() {
  const router = useRouter();
  const params = useParams();
  const partidaId = params.id as string;

  const [partida, setPartida] = useState<Partida | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [eventos, setEventos] = useState<EventoPartida[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal evento
  const [modalEvento, setModalEvento] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoEvento>("gol");
  const [jogadorSelecionado, setJogadorSelecionado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [timeSelecionado, setTimeSelecionado] = useState<"A" | "B">("A");

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

  async function handleAdicionarEvento() {
    if (!jogadorSelecionado) return setErro("Selecione um jogador");
    if (!partida) return;
    setSalvando(true);
    setErro("");
    try {
      await adicionarEvento(
        partidaId,
        jogadorSelecionado,
        tipoSelecionado,
        timeSelecionado,
      );
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

  async function handleRemoverEvento(id: string) {
    if (!confirm("Remover este evento?")) return;
    await removerEvento(id);
    setEventos((prev) => prev.filter((e) => e.id !== id));
  }

  async function handlePlacar(campo: "a" | "b", valor: number) {
    if (!partida) return;
    const golsA = campo === "a" ? valor : partida.gols_time_a;
    const golsB = campo === "b" ? valor : partida.gols_time_b;
    await atualizarPlacar(partida.id, golsA, golsB);
    setPartida((prev) =>
      prev ? { ...prev, gols_time_a: golsA, gols_time_b: golsB } : prev,
    );
  }

  const eventosPorTipo = (tipo: TipoEvento) =>
    eventos.filter((e) => e.tipo === tipo);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Ficha Técnica</h1>
          <p className="text-gray-400 text-sm">
            {partida &&
              new Date(partida.data + "T12:00:00").toLocaleDateString("pt-BR")}
            {partida?.local ? ` • ${partida.local}` : ""}
          </p>
        </div>
        {partida?.encerrada && (
          <span className="ml-auto text-xs bg-gray-800 text-gray-500 px-3 py-1 rounded-full">
            Encerrada
          </span>
        )}
      </div>

      {/* Placar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 text-right">
            <p className="text-white font-bold text-lg truncate">
              {partida?.time_a}
            </p>

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() =>
                  handlePlacar(
                    "a",
                    Math.max(0, (partida?.gols_time_a ?? 0) - 1),
                  )
                }
                className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
              >
                -
              </button>
              <button
                onClick={() =>
                  handlePlacar("a", (partida?.gols_time_a ?? 0) + 1)
                }
                className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-gray-800 px-6 py-3 rounded-2xl text-center">
            <span className="text-green-400 font-black text-3xl">
              {partida?.gols_time_a} x {partida?.gols_time_b}
            </span>
          </div>

          <div className="flex-1 text-left">
            <p className="text-white font-bold text-lg truncate">
              {partida?.time_b}
            </p>
            <div className="flex items-center justify-start gap-2 mt-2">
              <button
                onClick={() =>
                  handlePlacar(
                    "b",
                    Math.max(0, (partida?.gols_time_b ?? 0) - 1),
                  )
                }
                className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
              >
                -
              </button>
              <button
                onClick={() =>
                  handlePlacar("b", (partida?.gols_time_b ?? 0) + 1)
                }
                className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
              >
                +
              </button>
            </div>
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

      {/* Eventos por tipo */}
      {(
        [
          "gol",
          "assistencia",
          "cartao_amarelo",
          "cartao_vermelho",
        ] as TipoEvento[]
      ).map((tipo) => {
        const lista = eventosPorTipo(tipo);
        const cfg = TIPO_CONFIG[tipo];
        return (
          <div
            key={tipo}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <span>{cfg.emoji}</span>
              <span className={`font-bold ${cfg.cor}`}>{cfg.label}s</span>
              <span className="ml-auto text-gray-500 text-sm">
                {lista.length}
              </span>
            </div>
            {lista.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-2">
                Nenhum registro
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Time A */}
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-2">
                    {partida?.time_a}
                  </p>
                  <div className="flex flex-col gap-2">
                    {lista.filter((e) => e.time === "A").length === 0 ? (
                      <p className="text-gray-700 text-xs text-center">—</p>
                    ) : (
                      lista
                        .filter((e) => e.time === "A")
                        .map((e) => {
                          const j = (e as any).jogador;
                          return (
                            <div
                              key={e.id}
                              className="flex items-center gap-2 bg-gray-800 rounded-xl px-2 py-1.5"
                            >
                              <div
                                className="rounded-full bg-gray-700 overflow-hidden flex-shrink-0"
                                style={{ width: 24, height: 24, minWidth: 24 }}
                              >
                                {j?.foto_url ? (
                                  <img
                                    src={j.foto_url}
                                    alt={j.nome}
                                    style={{
                                      width: 24,
                                      height: 24,
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs">
                                    👤
                                  </div>
                                )}
                              </div>
                              <span className="text-white text-xs flex-1 truncate">
                                {j?.nome ?? "—"}
                              </span>
                              <button
                                onClick={() => handleRemoverEvento(e.id)}
                                className="text-gray-600 hover:text-red-400 transition-colors text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Time B */}
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-2">
                    {partida?.time_b}
                  </p>
                  <div className="flex flex-col gap-2">
                    {lista.filter((e) => e.time === "B").length === 0 ? (
                      <p className="text-gray-700 text-xs text-center">—</p>
                    ) : (
                      lista
                        .filter((e) => e.time === "B")
                        .map((e) => {
                          const j = (e as any).jogador;
                          return (
                            <div
                              key={e.id}
                              className="flex items-center gap-2 bg-gray-800 rounded-xl px-2 py-1.5"
                            >
                              <div
                                className="rounded-full bg-gray-700 overflow-hidden flex-shrink-0"
                                style={{ width: 24, height: 24, minWidth: 24 }}
                              >
                                {j?.foto_url ? (
                                  <img
                                    src={j.foto_url}
                                    alt={j.nome}
                                    style={{
                                      width: 24,
                                      height: 24,
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs">
                                    👤
                                  </div>
                                )}
                              </div>
                              <span className="text-white text-xs flex-1 truncate">
                                {j?.nome ?? "—"}
                              </span>
                              <button
                                onClick={() => handleRemoverEvento(e.id)}
                                className="text-gray-600 hover:text-red-400 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

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
            </div>

            {/* Jogador */}
            <select
              value={jogadorSelecionado}
              onChange={(e) => setJogadorSelecionado(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
            >
              <option value="">Selecione o jogador</option>
              {jogadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nome} — {j.posicao}
                </option>
              ))}
            </select>

            {erro && <p className="text-red-400 text-sm">{erro}</p>}

            <div className="flex gap-3 mt-2">
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
                {salvando ? "Salvando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
