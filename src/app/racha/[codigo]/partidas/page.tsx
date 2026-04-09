"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  dbGetRachaPorCodigo,
  dbGetPartidasPublico,
  dbGetEventosPartidaPublico,
} from "@/lib/db/publico.db";
import { Partida } from "@/types";

const TIPO_CONFIG = {
  gol: {
    emoji: "⚽",
    label: "Gol",
    cor: "text-green-400",
    bg: "bg-green-500/20",
  },
  assistencia: {
    emoji: "🎯",
    label: "Assistência",
    cor: "text-blue-400",
    bg: "bg-blue-500/20",
  },
  cartao_amarelo: {
    emoji: "🟨",
    label: "Amarelo",
    cor: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  cartao_vermelho: {
    emoji: "🟥",
    label: "Vermelho",
    cor: "text-red-400",
    bg: "bg-red-500/20",
  },
};

export default function PartidasPublicoPage() {
  const params = useParams();
  const codigo = params.codigo as string;
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomRacha, setNomRacha] = useState("");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Record<string, any[]>>({});
  const [carregandoEvento, setCarregandoEvento] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo);
      if (!r) return;
      setNomRacha(r.nome);
      const p = await dbGetPartidasPublico(r.id);
      setPartidas(p);
      setLoading(false);
    }
    carregar();
  }, [codigo]);

  async function togglePartida(id: string) {
    if (expandida === id) return setExpandida(null);
    setExpandida(id);
    if (!eventos[id]) {
      setCarregandoEvento(id);
      const e = await dbGetEventosPartidaPublico(id);
      const ordenados = [...e].sort(
        (a, b) =>
          (a.minuto ?? 0) - (b.minuto ?? 0) ||
          new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
      );
      setEventos((prev) => ({ ...prev, [id]: ordenados }));
      setCarregandoEvento(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href={`/racha/${codigo}`}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-white font-black">⚽ Partidas</h1>
            <p className="text-gray-500 text-xs">{nomRacha}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-3 pb-10">
        {loading ? (
          <div className="text-center py-16 text-green-400 animate-pulse">
            Carregando...
          </div>
        ) : partidas.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">⚽</p>
            <p>Nenhuma partida encerrada</p>
          </div>
        ) : (
          partidas.map((p) => {
            const aberta = expandida === p.id;
            const evs = eventos[p.id] ?? [];
            const carregando = carregandoEvento === p.id;

            return (
              <div
                key={p.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
              >
                {/* Header da partida — clicável */}
                <button
                  onClick={() => togglePartida(p.id)}
                  className="w-full p-4 text-left"
                >
                  {/* Data e local */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-500 text-xs">
                      {new Date(p.data + "T12:00:00").toLocaleDateString(
                        "pt-BR",
                        {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        },
                      )}
                      {p.local ? ` • ${p.local}` : ""}
                    </span>
                    <span className="ml-auto text-gray-600 text-lg">
                      {aberta ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* Placar */}
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-white font-black text-base flex-1 text-right truncate">
                      {p.time_a}
                    </span>
                    <div className="bg-gray-800 px-4 py-2.5 rounded-xl min-w-[90px] text-center">
                      <span className="text-green-400 font-black text-2xl">
                        {p.gols_time_a} x {p.gols_time_b}
                      </span>
                    </div>
                    <span className="text-white font-black text-base flex-1 text-left truncate">
                      {p.time_b}
                    </span>
                  </div>
                </button>

                {/* Linha do tempo — expandida */}
                {aberta && (
                  <div className="border-t border-gray-800 p-4">
                    {carregando ? (
                      <div className="text-center py-6 text-green-400 animate-pulse text-sm">
                        Carregando...
                      </div>
                    ) : evs.length === 0 ? (
                      <div className="text-center py-6 text-gray-600 text-sm">
                        Nenhum evento registrado
                      </div>
                    ) : (
                      <div className="relative flex flex-col gap-0">
                        {/* Linha vertical */}
                        <div className="absolute left-[52px] top-4 bottom-4 w-px bg-gradient-to-b from-green-500/30 to-orange-500/30" />

                        {evs.map((e: any) => {
                          const cfg =
                            TIPO_CONFIG[e.tipo as keyof typeof TIPO_CONFIG];
                          const isTimeA = e.time === "A";
                          if (!cfg) return null;

                          return (
                            <div
                              key={e.id}
                              className="flex items-center gap-3 py-2"
                            >
                              {/* Minuto */}
                              <div className="w-6 flex items-center justify-end flex-shrink-0">
                                <span className="text-gray-400 text-xs font-mono">
                                  {e.minuto !== null && e.minuto !== undefined
                                    ? `${e.minuto}'`
                                    : "—"}
                                </span>
                              </div>

                              {/* Ícone */}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${cfg.bg}`}
                              >
                                <span className="text-sm">{cfg.emoji}</span>
                              </div>

                              {/* Card do evento */}
                              <div
                                className={`flex-1 border rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all
${
  isTimeA
    ? "bg-green-500/10 border-green-500/30"
    : "bg-orange-500/10 border-orange-500/30"
}
${!isTimeA ? "flex-row-reverse" : ""}`}
                              >
                                {/* Foto */}
                                <div
                                  className="rounded-full overflow-hidden flex-shrink-0"
                                  style={{ width: 30, height: 30 }}
                                >
                                  {e.jogador?.foto_url ? (
                                    <img
                                      src={e.jogador.foto_url}
                                      alt={e.jogador.nome}
                                      style={{
                                        width: 30,
                                        height: 30,
                                        objectFit: "cover",
                                        display: "block",
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                                      {e.jogador?.nome?.charAt(0) ?? "?"}
                                    </div>
                                  )}
                                </div>

                                {/* Info */}
                                <div
                                  className={`flex-1 min-w-0 ${!isTimeA ? "text-right" : ""}`}
                                >
                                  <p className="text-white text-sm font-semibold truncate">
                                    {e.jogador?.nome ?? "—"}
                                  </p>
                                  <div
                                    className={`flex items-center gap-2 ${!isTimeA ? "flex-row-reverse" : ""}`}
                                  >
                                    <span
                                      className={`text-xs font-medium ${cfg.cor}`}
                                    >
                                      {cfg.label}
                                    </span>
                                    <span className="text-gray-500 text-xs">
                                      •
                                    </span>
                                    <span
                                      className={`text-xs font-bold ${
                                        isTimeA
                                          ? "text-green-400"
                                          : "text-orange-400"
                                      }`}
                                    >
                                      {isTimeA ? p.time_a : p.time_b}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
