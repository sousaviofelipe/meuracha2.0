"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { dbGetRachaPorCodigo } from "@/lib/db/publico.db";
import { dbListarTotalPartidas } from "@/lib/db/avaliacoes.db";
import { getSupabase } from "@/lib/db/supabase";
import { Jogador } from "@/types";

interface JogadorJogos extends Jogador {
  total_partidas: number;
}

export default function JogosPage() {
  const params = useParams();
  const codigo = params.codigo as string;

  const [jogadores, setJogadores] = useState<JogadorJogos[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomRacha, setNomRacha] = useState("");

  useEffect(() => {
    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo);
      if (!r) return;
      setNomRacha(r.nome);

      const [partidas, { data: jogs }] = await Promise.all([
        dbListarTotalPartidas(r.id),
        getSupabase()
          .from("jogadores")
          .select("*")
          .eq("racha_id", r.id)
          .eq("ativo", true),
      ]);

      const map: Record<string, number> = {};
      partidas.forEach((p) => {
        map[p.jogador_id] = p.total_partidas;
      });

      const lista: JogadorJogos[] = (jogs ?? [])
        .map((j: any) => ({ ...j, total_partidas: map[j.id] ?? 0 }))
        .filter((j: JogadorJogos) => j.total_partidas > 0)
        .sort((a: JogadorJogos, b: JogadorJogos) => {
          if (b.total_partidas !== a.total_partidas)
            return b.total_partidas - a.total_partidas;
          return a.nome.localeCompare(b.nome);
        });

      setJogadores(lista);
      setLoading(false);
    }
    carregar();
  }, [codigo]);

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
            <h1 className="text-white font-black">🏟️ Jogos disputados</h1>
            <p className="text-gray-500 text-xs">{nomRacha}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-3 pb-10">
        {loading ? (
          <div className="text-center py-16 text-green-400 animate-pulse">
            Carregando...
          </div>
        ) : jogadores.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            Nenhum jogo registrado
          </div>
        ) : (
          jogadores.map((j, i) => {
            const medalha =
              i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            const destaque =
              i === 0
                ? "bg-yellow-500/10 border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.25)]"
                : i === 1
                  ? "bg-slate-300/10 border-slate-300/40 shadow-[0_0_10px_rgba(203,213,225,0.25)]"
                  : i === 2
                    ? "bg-orange-500/10 border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.25)]"
                    : "bg-gray-900 border-gray-800";
            const corPosicao =
              i === 0
                ? "text-yellow-400"
                : i === 1
                  ? "text-slate-300"
                  : i === 2
                    ? "text-orange-400"
                    : "text-gray-600";

            return (
              <div
                key={j.id}
                className={`border rounded-2xl px-4 py-3 flex items-center gap-3 transition-all hover:scale-[1.02] hover:shadow-lg ${destaque}`}
              >
                <div className="flex items-center gap-1 w-10">
                  <span className={`text-lg font-black ${corPosicao}`}>
                    {i + 1}
                  </span>
                  {medalha && <span className="text-sm">{medalha}</span>}
                </div>

                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                  {j.foto_url ? (
                    <img
                      src={j.foto_url}
                      alt={j.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                      {j.nome.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">
                    {j.nome}
                    {i === 0 && (
                      <span className="ml-2 text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded-full font-black">
                        + PRESENÇA
                      </span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs">{j.posicao}</p>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-white font-black text-2xl">
                    {j.total_partidas}
                  </span>
                  <span className="text-gray-400 text-sm">🏟️</span>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
