"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import {
  listarPartidas,
  criarPartida,
  encerrarPartida,
  deletarPartida,
} from "@/lib/services/partidas.service";
import { Partida, Racha } from "@/types";

export default function PartidasPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Form
  const [data, setData] = useState("");
  const [local, setLocal] = useState("");
  const [timeA, setTimeA] = useState("");
  const [timeB, setTimeB] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);
      const p = await listarPartidas(r.id);
      setPartidas(p);
      setLoading(false);
    }
    carregar();
  }, []);

  function abrirModal() {
    setData("");
    setLocal("");
    setTimeA("");
    setTimeB("");
    setErro("");
    setModal(true);
  }

  async function handleCriar() {
    if (!data) return setErro("Data é obrigatória");
    if (!timeA.trim()) return setErro("Nome do Time A é obrigatório");
    if (!timeB.trim()) return setErro("Nome do Time B é obrigatório");
    if (!racha) return;
    setSalvando(true);
    setErro("");
    try {
      const p = await criarPartida(
        racha.id,
        data,
        timeA.trim(),
        timeB.trim(),
        local.trim() || undefined,
      );
      setPartidas((prev) => [p, ...prev]);
      setModal(false);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleEncerrar(p: Partida) {
    if (
      !confirm(
        `Encerrar a partida ${p.time_a} x ${p.time_b}? Isso não poderá ser desfeito.`,
      )
    )
      return;
    await encerrarPartida(p.id);
    setPartidas((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, encerrada: true } : x)),
    );
  }

  async function handleDeletar(p: Partida) {
    if (
      !confirm(
        `Deletar esta partida? Todos os eventos e estatísticas serão perdidos.`,
      )
    )
      return;
    try {
      await deletarPartida(p.id);
      setPartidas((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err: any) {
      alert("Erro ao deletar: " + err.message);
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Partidas</h1>
          <p className="text-gray-400 text-sm">{partidas.length} registradas</p>
        </div>
        <button
          onClick={abrirModal}
          className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Nova Partida
        </button>
      </div>

      {/* Lista */}
      {partidas.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">⚽</p>
          <p>Nenhuma partida registrada ainda</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {partidas.map((p) => (
            <div
              key={p.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4"
            >
              {/* Placar */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-2 h-2 rounded-full ${p.encerrada ? "bg-gray-500" : "bg-green-400"}`}
                />
                <span className="text-gray-400 text-xs">
                  {new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}
                  {p.local ? ` • ${p.local}` : ""}
                </span>
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.encerrada
                      ? "bg-gray-800 text-gray-500"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {p.encerrada ? "Encerrada" : "Em aberto"}
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-white font-bold text-base flex-1 text-right truncate">
                  {p.time_a}
                </span>
                <div className="bg-gray-800 px-4 py-2 rounded-xl min-w-[80px] text-center">
                  <span className="text-green-400 font-black text-xl">
                    {p.gols_time_a} x {p.gols_time_b}
                  </span>
                </div>
                <span className="text-white font-bold text-base flex-1 text-left truncate">
                  {p.time_b}
                </span>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Link
                  href={`/admin/partidas/${p.id}`}
                  className="flex-1 text-center py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
                >
                  {p.encerrada ? "✏️ Editar Ficha" : "📋 Ficha Técnica"}
                </Link>
                {!p.encerrada && (
                  <button
                    onClick={() => handleEncerrar(p)}
                    className="flex-1 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium transition-colors"
                  >
                    ✅ Encerrar
                  </button>
                )}
                <button
                  onClick={() => handleDeletar(p)}
                  className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-sm transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Partida */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-white font-black text-lg">Nova Partida</h2>

            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Local (opcional)"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />

            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Time A"
                value={timeA}
                onChange={(e) => setTimeA(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
              <span className="text-gray-500 font-bold">x</span>
              <input
                type="text"
                placeholder="Time B"
                value={timeB}
                onChange={(e) => setTimeB(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            {erro && <p className="text-red-400 text-sm">{erro}</p>}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriar}
                disabled={salvando}
                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
              >
                {salvando ? "Criando..." : "Criar Partida"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
