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

const CORES_PRESET = [
  "#22c55e", "#f97316", "#3b82f6", "#ef4444",
  "#a855f7", "#eab308", "#ec4899", "#ffffff",
  "#6b7280", "#000000",
];

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (c: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {CORES_PRESET.map((cor) => (
          <button
            key={cor}
            onClick={() => onChange(cor)}
            className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
            style={{
              background: cor,
              borderColor: value === cor ? "#fff" : "transparent",
              boxShadow: value === cor ? `0 0 0 1px ${cor}` : "none",
            }}
          />
        ))}
        <label className="w-7 h-7 rounded-full border-2 border-gray-600 overflow-hidden cursor-pointer hover:scale-110 transition-transform flex-shrink-0">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>
      <div className="h-1 rounded-full mt-0.5" style={{ background: value }} />
    </div>
  );
}

export default function EscalacaoPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [escalacao, setEscalacao] = useState<Escalacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [nomeTimeA, setNomeTimeA] = useState("Time A");
  const [nomeTimeB, setNomeTimeB] = useState("Time B");
  const [corTimeA, setCorTimeA] = useState("#22c55e");
  const [corTimeB, setCorTimeB] = useState("#f97316");
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
      if (timeA.includes(id)) setTimeA((prev) => prev.filter((x) => x !== id));
      else { setTimeB((prev) => prev.filter((x) => x !== id)); setTimeA((prev) => [...prev, id]); }
    } else {
      if (timeB.includes(id)) setTimeB((prev) => prev.filter((x) => x !== id));
      else { setTimeA((prev) => prev.filter((x) => x !== id)); setTimeB((prev) => [...prev, id]); }
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
        corTimeA,
        corTimeB,
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
    setCorTimeA(escalacao?.cor_time_a ?? "#22c55e");
    setCorTimeB(escalacao?.cor_time_b ?? "#f97316");
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
          <p className="text-gray-400 text-sm">Monte os times do próximo racha</p>
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

      {escalacao ? (
        <CampoEscalacao escalacao={escalacao} jogadores={jogadores} />
      ) : (
        <div className="text-center py-16 text-gray-600 bg-gray-900 border border-dashed border-gray-700 rounded-2xl">
          <p className="text-4xl mb-3">🏟️</p>
          <p>Nenhuma escalação ativa</p>
          <p className="text-sm mt-1">Clique em "Nova Escalação" para montar os times</p>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-950 border border-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-black text-lg tracking-tight">Montar Times</h2>
              <button
                onClick={() => setModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

              {/* Nomes + cores */}
              <div className="grid grid-cols-2 gap-4">
                {/* Time A */}
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={nomeTimeA}
                    onChange={(e) => setNomeTimeA(e.target.value)}
                    className="bg-gray-900 border rounded-xl px-3 py-2.5 text-white text-sm font-bold focus:outline-none transition-colors text-center"
                    style={{ borderColor: corTimeA + "80" }}
                    placeholder="Time A"
                  />
                  <ColorPicker label="Cor" value={corTimeA} onChange={setCorTimeA} />
                  <div className="flex items-center justify-center gap-1.5">
                    <span