"use client";

import { useEffect, useState } from "react";
import { dbGetEstatisticasJogador } from "@/lib/db/publico.db";
import { dbListarTotalPartidas } from "@/lib/db/avaliacoes.db";
import { Estatistica } from "@/types";

interface Props {
  jogadorId: string | null;
  rachaId: string;
  onClose: () => void;
}

export default function ModalJogador({ jogadorId, rachaId, onClose }: Props) {
  const [stat, setStat] = useState<Estatistica | null>(null);
  const [totalJogos, setTotalJogos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jogadorId) return;
    setLoading(true);
    setStat(null);

    async function carregar() {
      try {
        const [s, partidas] = await Promise.all([
          dbGetEstatisticasJogador(jogadorId!),
          dbListarTotalPartidas(rachaId),
        ]);
        setStat(s);
        const jogos =
          partidas.find((p) => p.jogador_id === jogadorId)?.total_partidas ?? 0;
        setTotalJogos(jogos);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [jogadorId, rachaId]);

  if (!jogadorId) return null;

  const jogador = (stat?.jogador as any) ?? null;
  const nivel = (jogador as any)?.nivel_medio ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-black">Perfil do jogador</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500 animate-pulse">
            Carregando...
          </div>
        ) : (
          <>
            {/* Foto + info */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gray-800 overflow-hidden border-2 border-green-500/30">
                  {jogador?.foto_url ? (
                    <img
                      src={jogador.foto_url}
                      alt={jogador.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      👤
                    </div>
                  )}
                </div>
                {nivel !== null && nivel !== undefined && (
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-xs font-black px-1.5 py-0.5 rounded-full leading-none">
                    {nivel}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-lg truncate">
                  {jogador?.nome ?? "—"}
                </p>
                <p className="text-gray-400 text-sm">
                  {jogador?.posicao ?? "—"}
                </p>
                {nivel !== null && nivel !== undefined && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-400 text-xs">⭐</span>
                    <span className="text-yellow-400 text-xs font-bold">
                      Nível {nivel}
                    </span>
                    <span className="text-gray-600 text-xs">/ 10</span>
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-green-400 font-black text-2xl">
                  {stat?.gols ?? 0}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">⚽ Gols</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-blue-400 font-black text-2xl">
                  {stat?.assistencias ?? 0}
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
                    {stat?.cartoes_amarelos ?? 0}
                  </span>
                  <span className="text-gray-600 text-sm">|</span>
                  <span className="text-red-400 font-black text-xl">
                    {stat?.cartoes_vermelhos ?? 0}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">🟨 🟥 Cartões</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
