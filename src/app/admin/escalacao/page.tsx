"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import { listarJogadores } from "@/lib/services/jogadores.service";
import {
  listarJogadoresComNivel,
  sortearTimes,
} from "@/lib/services/avaliacoes.service";
import { listarPresencas } from "@/lib/services/presencas.service";
import {
  dbGetEscalacaoAtiva,
  dbCriarEscalacao,
  dbRemoverEscalacao,
} from "@/lib/db/escalacoes.db";
import { getSupabase } from "@/lib/db/supabase";
import CampoEscalacao from "@/components/CampoEscalacao";
import {
  Jogador,
  Racha,
  Escalacao,
  Partida,
  JogadorComNivel,
  EscalacaoGerada,
} from "@/types";

const POSICAO_COR: Record<string, string> = {
  Goleiro: "bg-yellow-500/20 text-yellow-400",
  Defensor: "bg-blue-500/20 text-blue-400",
  "Meio-campo": "bg-green-500/20 text-green-400",
  Atacante: "bg-red-500/20 text-red-400",
};

export default function EscalacaoPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [jogadoresComNivel, setJogadoresComNivel] = useState<JogadorComNivel[]>(
    [],
  );
  const [escalacao, setEscalacao] = useState<Escalacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Aba do modal
  const [aba, setAba] = useState<"manual" | "sortear">("manual");

  // Form manual
  const [nomeTimeA, setNomeTimeA] = useState("Time A");
  const [nomeTimeB, setNomeTimeB] = useState("Time B");
  const [timeA, setTimeA] = useState<string[]>([]);
  const [timeB, setTimeB] = useState<string[]>([]);

  // Sorteio automático
  const [partidasFuturas, setPartidasFuturas] = useState<Partida[]>([]);
  const [partidaSelecionada, setPartidaSelecionada] = useState<Partida | null>(
    null,
  );
  const [jogadoresSorteio, setJogadoresSorteio] = useState<JogadorComNivel[]>(
    [],
  );
  const [resultadoSorteio, setResultadoSorteio] =
    useState<EscalacaoGerada | null>(null);
  const [nomeTimeASorteio, setNomeTimeASorteio] = useState("Time A");
  const [nomeTimeBSorteio, setNomeTimeBSorteio] = useState("Time B");
  const [carregandoSorteio, setCarregandoSorteio] = useState(false);
  const [sorteioFeito, setSorteioFeito] = useState(false);

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);

      const hoje = new Date().toISOString().split("T")[0];
      const [j, e, jNivel, futuras] = await Promise.all([
        listarJogadores(r.id),
        dbGetEscalacaoAtiva(r.id),
        listarJogadoresComNivel(r.id),
        getSupabase()
          .from("partidas")
          .select("*")
          .eq("racha_id", r.id)
          .eq("encerrada", false)
          .gte("data", hoje)
          .order("data", { ascending: true }),
      ]);

      setJogadores(j.filter((x) => x.ativo));
      setJogadoresComNivel(jNivel);
      setEscalacao(e);
      setPartidasFuturas(futuras.data ?? []);
      setLoading(false);
    }
    carregar();
  }, []);

  // Ao selecionar partida, carrega confirmados
  async function handleSelecionarPartida(partida: Partida) {
    setPartidaSelecionada(partida);
    setNomeTimeASorteio(partida.time_a);
    setNomeTimeBSorteio(partida.time_b);
    setCarregandoSorteio(true);
    setResultadoSorteio(null);
    setSorteioFeito(false);
    try {
      const presencas = await listarPresencas(partida.id);
      const confirmados = presencas
        .filter((p) => p.confirmado)
        .map((p) => p.jogador_id);
      const jogadoresConfirmados = jogadoresComNivel.filter((j) =>
        confirmados.includes(j.id),
      );
      setJogadoresSorteio(jogadoresConfirmados);
    } finally {
      setCarregandoSorteio(false);
    }
  }

  function toggleJogadorSorteio(jogador: JogadorComNivel) {
    setJogadoresSorteio((prev) => {
      const existe = prev.find((j) => j.id === jogador.id);
      if (existe) return prev.filter((j) => j.id !== jogador.id);
      return [...prev, jogador];
    });
    setResultadoSorteio(null);
    setSorteioFeito(false);
  }

  function handleSortear() {
    if (jogadoresSorteio.length < 2) return;
    const resultado = sortearTimes(
      jogadoresSorteio,
      nomeTimeASorteio,
      nomeTimeBSorteio,
    );
    setResultadoSorteio(resultado);
    setSorteioFeito(true);
  }

  function moverJogador(jogadorId: string, para: "A" | "B") {
    if (!resultadoSorteio) return;
    const jogadorA = resultadoSorteio.time_a.find((j) => j.id === jogadorId);
    const jogadorB = resultadoSorteio.time_b.find((j) => j.id === jogadorId);
    const jogador = jogadorA ?? jogadorB;
    if (!jogador) return;

    setResultadoSorteio((prev) => {
      if (!prev) return prev;
      if (para === "A") {
        return {
          ...prev,
          time_a: [
            ...prev.time_a.filter((j) => j.id !== jogadorId),
            ...(jogadorB ? [jogador] : []),
          ],
          time_b: prev.time_b.filter((j) => j.id !== jogadorId),
        };
      } else {
        return {
          ...prev,
          time_a: prev.time_a.filter((j) => j.id !== jogadorId),
          time_b: [
            ...prev.time_b.filter((j) => j.id !== jogadorId),
            ...(jogadorA ? [jogador] : []),
          ],
        };
      }
    });
  }

  async function handleSalvarSorteio() {
    if (!resultadoSorteio || !racha) return;
    setSalvando(true);
    setErro("");
    try {
      const e = await dbCriarEscalacao(
        racha.id,
        resultadoSorteio.nome_time_a,
        resultadoSorteio.nome_time_b,
        resultadoSorteio.time_a.map((j) => j.id),
        resultadoSorteio.time_b.map((j) => j.id),
      );
      setEscalacao(e);
      setModal(false);
      setResultadoSorteio(null);
      setSorteioFeito(false);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  // Manual
  function toggleJogador(id: string, time: "A" | "B") {
    if (time === "A") {
      if (timeA.includes(id)) {
        setTimeA((prev) => prev.filter((x) => x !== id));
      } else {
        setTimeB((prev) => prev.filter((x) => x !== id));
        setTimeA((prev) => [...prev, id]);
      }
    } else {
      if (timeB.includes(id)) {
        setTimeB((prev) => prev.filter((x) => x !== id));
      } else {
        setTimeA((prev) => prev.filter((x) => x !== id));
        setTimeB((prev) => [...prev, id]);
      }
    }
  }

  function getTimeDoJogador(id: string): "A" | "B" | null {
    if (timeA.includes(id)) return "A";
    if (timeB.includes(id)) return "B";
    return null;
  }

  async function handleSalvar() {
    if (timeA.length === 0 && timeB.length === 0)
      return setErro("Adicione jogadores em pelo menos um time");
    if (!racha) return;
    setSalvando(true);
    setErro("");
    try {
      const e = await dbCriarEscalacao(
        racha.id,
        nomeTimeA,
        nomeTimeB,
        timeA,
        timeB,
      );
      setEscalacao(e);
      setModal(false);
      setTimeA([]);
      setTimeB([]);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover() {
    if (!escalacao) return;
    if (!confirm("Remover a escalação atual?")) return;
    await dbRemoverEscalacao(escalacao.id);
    setEscalacao(null);
  }

  function abrirModal() {
    setNomeTimeA(escalacao?.nome_time_a ?? "Time A");
    setNomeTimeB(escalacao?.nome_time_b ?? "Time B");
    setTimeA(escalacao?.jogadores_time_a ?? []);
    setTimeB(escalacao?.jogadores_time_b ?? []);
    setErro("");
    setAba("manual");
    setResultadoSorteio(null);
    setSorteioFeito(false);
    setPartidaSelecionada(null);
    setJogadoresSorteio([]);
    setModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Escalação</h1>
          <p className="text-gray-400 text-sm">
            Monte os times do próximo racha
          </p>
        </div>
        <div className="flex gap-2">
          {escalacao && (
            <button
              onClick={handleRemover}
              className="py-2 px-4 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-sm transition-colors"
            >
              🗑️ Remover
            </button>
          )}
          <button
            onClick={abrirModal}
            className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            {escalacao ? "✏️ Editar" : "+ Nova Escalação"}
          </button>
        </div>
      </div>

      {/* Campo */}
      {escalacao ? (
        <CampoEscalacao escalacao={escalacao} jogadores={jogadores} />
      ) : (
        <div className="text-center py-16 text-gray-600 bg-gray-900 border border-dashed border-gray-700 rounded-2xl">
          <p className="text-4xl mb-3">🏟️</p>
          <p>Nenhuma escalação ativa</p>
          <p className="text-sm mt-1">
            Clique em "Nova Escalação" para montar os times
          </p>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-white font-black text-lg">Nova Escalação</h2>
              <button
                onClick={() => setModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Abas */}
            <div className="flex gap-2 px-6 pt-4">
              <button
                onClick={() => setAba("manual")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${aba === "manual" ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                ✏️ Manual
              </button>
              <button
                onClick={() => setAba("sortear")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${aba === "sortear" ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                🎲 Sortear times
              </button>
            </div>

            {/* Conteúdo Manual */}
            {aba === "manual" && (
              <>
                <div className="grid grid-cols-2 gap-3 px-6 pt-4">
                  <input
                    type="text"
                    value={nomeTimeA}
                    onChange={(e) => setNomeTimeA(e.target.value)}
                    className="bg-gray-800 border border-green-500/50 rounded-xl px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-green-500 transition-colors text-center"
                    placeholder="Time A"
                  />
                  <input
                    type="text"
                    value={nomeTimeB}
                    onChange={(e) => setNomeTimeB(e.target.value)}
                    className="bg-gray-800 border border-orange-500/50 rounded-xl px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors text-center"
                    placeholder="Time B"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 px-6 pt-2">
                  <p className="text-green-400 text-xs text-center">
                    {timeA.length} jogadores
                  </p>
                  <p className="text-orange-400 text-xs text-center">
                    {timeB.length} jogadores
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
                  {jogadores.map((j) => {
                    const time = getTimeDoJogador(j.id);
                    const jNivel = jogadoresComNivel.find((x) => x.id === j.id);
                    return (
                      <div
                        key={j.id}
                        className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5"
                      >
                        <div
                          className="rounded-full overflow-hidden flex-shrink-0"
                          style={{ width: 36, height: 36 }}
                        >
                          {j.foto_url ? (
                            <img
                              src={j.foto_url}
                              alt={j.nome}
                              style={{
                                width: 36,
                                height: 36,
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold">
                              {j.nome.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {j.nome}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-500 text-xs">{j.posicao}</p>
                            {jNivel?.nivel_medio !== null &&
                              jNivel?.nivel_medio !== undefined && (
                                <span className="text-yellow-400 text-xs">
                                  ⭐ {jNivel.nivel_medio}
                                </span>
                              )}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => toggleJogador(j.id, "A")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${time === "A" ? "bg-green-500 text-black" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                          >
                            {nomeTimeA.split(" ")[0]}
                          </button>
                          <button
                            onClick={() => toggleJogador(j.id, "B")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${time === "B" ? "bg-orange-500 text-black" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                          >
                            {nomeTimeB.split(" ")[0]}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-6 border-t border-gray-800 flex flex-col gap-3">
                  {erro && <p className="text-red-400 text-sm">{erro}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setModal(false)}
                      className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSalvar}
                      disabled={salvando}
                      className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
                    >
                      {salvando ? "Salvando..." : "Publicar Escalação"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Conteúdo Sortear */}
            {aba === "sortear" && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                  {/* Selecionar partida */}
                  <div>
                    <p className="text-gray-400 text-xs font-semibold mb-2">
                      1. Selecione a partida
                    </p>
                    {partidasFuturas.length === 0 ? (
                      <p className="text-gray-600 text-sm">
                        Nenhuma partida futura encontrada.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {partidasFuturas.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSelecionarPartida(p)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${partidaSelecionada?.id === p.id ? "border-green-500/50 bg-green-500/10" : "border-gray-700 bg-gray-800 hover:bg-gray-700"}`}
                          >
                            <div className="flex-1">
                              <p className="text-white text-sm font-semibold">
                                {p.time_a} vs {p.time_b}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {new Date(
                                  p.data + "T12:00:00",
                                ).toLocaleDateString("pt-BR", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </p>
                            </div>
                            {partidaSelecionada?.id === p.id && (
                              <span className="text-green-400">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Jogadores confirmados + adição manual */}
                  {partidaSelecionada && (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold mb-2">
                        2. Jogadores ({jogadoresSorteio.length}) —{" "}
                        {carregandoSorteio
                          ? "carregando..."
                          : "toque para remover/adicionar"}
                      </p>
                      {carregandoSorteio ? (
                        <p className="text-gray-500 text-sm animate-pulse">
                          Carregando confirmados...
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {/* Confirmados */}
                          {jogadoresSorteio.map((j) => (
                            <div
                              key={j.id}
                              className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2"
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
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">
                                  {j.nome}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 text-xs">
                                    {j.posicao}
                                  </span>
                                  {j.nivel_medio !== null &&
                                    j.nivel_medio !== undefined && (
                                      <span className="text-yellow-400 text-xs">
                                        ⭐ {j.nivel_medio}
                                      </span>
                                    )}
                                </div>
                              </div>
                              <button
                                onClick={() => toggleJogadorSorteio(j)}
                                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-gray-800 rounded-lg transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ))}

                          {/* Adicionar convidados */}
                          <p className="text-gray-600 text-xs mt-1">
                            + Adicionar convidado ou jogador sem confirmação:
                          </p>
                          {jogadoresComNivel
                            .filter(
                              (j) =>
                                !jogadoresSorteio.find((x) => x.id === j.id),
                            )
                            .map((j) => (
                              <button
                                key={j.id}
                                onClick={() => toggleJogadorSorteio(j)}
                                className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 hover:bg-gray-700 transition-colors text-left"
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
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-400 text-sm truncate">
                                    {j.nome}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600 text-xs">
                                      {j.posicao}
                                    </span>
                                    {j.nivel_medio !== null &&
                                      j.nivel_medio !== undefined && (
                                        <span className="text-yellow-400 text-xs">
                                          ⭐ {j.nivel_medio}
                                        </span>
                                      )}
                                  </div>
                                </div>
                                <span className="text-green-400 text-xs">
                                  + Add
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resultado do sorteio */}
                  {sorteioFeito && resultadoSorteio && (
                    <div>
                      <p className="text-gray-400 text-xs font-semibold mb-2">
                        3. Resultado — ajuste se necessário
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Time A */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={resultadoSorteio.nome_time_a}
                              onChange={(e) =>
                                setResultadoSorteio((prev) =>
                                  prev
                                    ? { ...prev, nome_time_a: e.target.value }
                                    : prev,
                                )
                              }
                              className="flex-1 bg-gray-800 border border-green-500/50 rounded-lg px-2 py-1 text-white text-xs font-bold focus:outline-none text-center"
                            />
                          </div>
                          {resultadoSorteio.time_a.map((j) => (
                            <div
                              key={j.id}
                              className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-2 py-1.5 mb-1"
                            >
                              <div
                                className="rounded-full overflow-hidden flex-shrink-0"
                                style={{ width: 24, height: 24 }}
                              >
                                {j.foto_url ? (
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
                                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[9px] text-white">
                                    {j.nome.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs truncate">
                                  {j.nome}
                                </p>
                                <p className="text-gray-500 text-[10px]">
                                  {j.posicao}
                                </p>
                              </div>
                              <button
                                onClick={() => moverJogador(j.id, "B")}
                                className="text-gray-500 hover:text-orange-400 text-xs transition-colors"
                              >
                                →
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Time B */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={resultadoSorteio.nome_time_b}
                              onChange={(e) =>
                                setResultadoSorteio((prev) =>
                                  prev
                                    ? { ...prev, nome_time_b: e.target.value }
                                    : prev,
                                )
                              }
                              className="flex-1 bg-gray-800 border border-orange-500/50 rounded-lg px-2 py-1 text-white text-xs font-bold focus:outline-none text-center"
                            />
                          </div>
                          {resultadoSorteio.time_b.map((j) => (
                            <div
                              key={j.id}
                              className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-2 py-1.5 mb-1"
                            >
                              <button
                                onClick={() => moverJogador(j.id, "A")}
                                className="text-gray-500 hover:text-green-400 text-xs transition-colors"
                              >
                                ←
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs truncate">
                                  {j.nome}
                                </p>
                                <p className="text-gray-500 text-[10px]">
                                  {j.posicao}
                                </p>
                              </div>
                              <div
                                className="rounded-full overflow-hidden flex-shrink-0"
                                style={{ width: 24, height: 24 }}
                              >
                                {j.foto_url ? (
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
                                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[9px] text-white">
                                    {j.nome.charAt(0)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer sorteio */}
                <div className="p-6 border-t border-gray-800 flex flex-col gap-3">
                  {erro && <p className="text-red-400 text-sm">{erro}</p>}
                  {!sorteioFeito ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setModal(false)}
                        className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSortear}
                        disabled={jogadoresSorteio.length < 2}
                        className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
                      >
                        🎲 Sortear
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setResultadoSorteio(null);
                          setSorteioFeito(false);
                        }}
                        className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-medium transition-colors"
                      >
                        🔄 Novo sorteio
                      </button>
                      <button
                        onClick={handleSalvarSorteio}
                        disabled={salvando}
                        className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
                      >
                        {salvando ? "Salvando..." : "✅ Publicar"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
