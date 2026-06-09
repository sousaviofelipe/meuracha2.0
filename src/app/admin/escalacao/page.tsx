"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import { listarJogadores } from "@/lib/services/jogadores.service";
import {
  dbGetEscalacaoAtiva,
  dbCriarEscalacao,
  dbRemoverEscalacao,
} from "@/lib/db/escalacoes.db";
import CampoEscalacao from "@/components/CampoEscalacao";
import { Jogador, Racha, Escalacao } from "@/types";

export default function EscalacaoPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [escalacao, setEscalacao] = useState<Escalacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Form
  const [nomeTimeA, setNomeTimeA] = useState("Time A");
  const [nomeTimeB, setNomeTimeB] = useState("Time B");
  const [timeA, setTimeA] = useState<string[]>([]);
  const [timeB, setTimeB] = useState<string[]>([]);

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);
      const [j, e] = await Promise.all([
        listarJogadores(r.id),
        dbGetEscalacaoAtiva(r.id),
      ]);
      setJogadores(j.filter((x) => x.ativo));
      setEscalacao(e);
      setLoading(false);
    }
    carregar();
  }, []);

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
              <h2 className="text-white font-black text-lg">Montar Times</h2>
              <button
                onClick={() => setModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Nomes dos times */}
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

            {/* Contador */}
            <div className="grid grid-cols-2 gap-3 px-6 pt-2">
              <p className="text-green-400 text-xs text-center">
                {timeA.length} jogadores
              </p>
              <p className="text-orange-400 text-xs text-center">
                {timeB.length} jogadores
              </p>
            </div>

            {/* Lista de jogadores */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
              {jogadores.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  Nenhum jogador ativo cadastrado
                </p>
              ) : (
                jogadores.map((j) => {
                  const time = getTimeDoJogador(j.id);
                  return (
                    <div
                      key={j.id}
                      className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5"
                    >
                      {/* Foto */}
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

                      {/* Nome */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {j.nome}
                        </p>
                        <p className="text-gray-500 text-xs">{j.posicao}</p>
                      </div>

                      {/* Botões de time */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => toggleJogador(j.id, "A")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            time === "A"
                              ? "bg-green-500 text-black"
                              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                          }`}
                        >
                          {nomeTimeA.split(" ")[0]}
                        </button>
                        <button
                          onClick={() => toggleJogador(j.id, "B")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            time === "B"
                              ? "bg-orange-500 text-black"
                              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                          }`}
                        >
                          {nomeTimeB.split(" ")[0]}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
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
          </div>
        </div>
      )}
    </div>
  );
}
