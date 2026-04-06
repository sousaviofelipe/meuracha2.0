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
  gol: { emoji: "⚽", label: "Gols" },
  assistencia: { emoji: "🎯", label: "Assistências" },
  cartao_amarelo: { emoji: "🟨", label: "Amarelos" },
  cartao_vermelho: { emoji: "🟥", label: "Vermelhos" },
};

export default function PartidasPublicoPage() {
  const params = useParams();
  const codigo = params.codigo as string;
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomRacha, setNomRacha] = useState("");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Record<string, any[]>>({});

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
      const e = await dbGetEventosPartidaPublico(id);
      setEventos((prev) => ({ ...prev, [id]: e }));
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
            Nenhuma partida encerrada
          </div>
        ) : (
          partidas.map((p) => {
            const evs = eventos[p.id] ?? [];
            const aberta = expandida === p.id;
            return (
              <div
                key={p.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => togglePartida(p.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-500 text-xs">
                      {new Date(p.data + "T12:00:00").toLocaleDateString(
                        "pt-BR",
                      )}
                      {p.local ? ` • ${p.local}` : ""}
                    </span>
                    <span className="ml-auto text-gray-600 text-xs">
                      {aberta ? "▲" : "▼"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-white font-bold flex-1 text-right truncate">
                      {p.time_a}
                    </span>
                    <div className="bg-gray-800 px-4 py-2 rounded-xl">
                      <span className="text-green-400 font-black text-xl">
                        {p.gols_time_a} x {p.gols_time_b}
                      </span>
                    </div>
                    <span className="text-white font-bold flex-1 text-left truncate">
                      {p.time_b}
                    </span>
                  </div>
                </button>

                {aberta && (
                  <div className="border-t border-gray-800 p-4 flex flex-col gap-3">
                    {(
                      [
                        "gol",
                        "assistencia",
                        "cartao_amarelo",
                        "cartao_vermelho",
                      ] as const
                    ).map((tipo) => {
                      const lista = evs.filter((e: any) => e.tipo === tipo);
                      if (lista.length === 0) return null;
                      const cfg = TIPO_CONFIG[tipo];
                      const listaA = lista.filter((e: any) => e.time === "A");
                      const listaB = lista.filter((e: any) => e.time === "B");
                      return (
                        <div key={tipo}>
                          <p className="text-gray-500 text-xs font-semibold mb-2">
                            {cfg.emoji} {cfg.label}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              {listaA.map((e: any) => (
                                <div
                                  key={e.id}
                                  className="flex items-center gap-2"
                                >
                                  <div className="w-5 h-5 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                    {e.jogador?.foto_url ? (
                                      <img
                                        src={e.jogador.foto_url}
                                        alt=""
                                        style={{
                                          width: 20,
                                          height: 20,
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs">
                                        👤
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-gray-300 text-xs truncate">
                                    {e.jogador?.nome ?? "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-col gap-1">
                              {listaB.map((e: any) => (
                                <div
                                  key={e.id}
                                  className="flex items-center gap-2"
                                >
                                  <div className="w-5 h-5 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                    {e.jogador?.foto_url ? (
                                      <img
                                        src={e.jogador.foto_url}
                                        alt=""
                                        style={{
                                          width: 20,
                                          height: 20,
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs">
                                        👤
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-gray-300 text-xs truncate">
                                    {e.jogador?.nome ?? "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
