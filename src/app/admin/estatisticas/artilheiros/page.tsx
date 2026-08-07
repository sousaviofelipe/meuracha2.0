"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import { dbGetEstatisticas } from "@/lib/db/rachas.db";
import { dbListarTotalPartidas } from "@/lib/db/avaliacoes.db";
import { Estatistica, Racha } from "@/types";
import ModalJogador from "@/components/ModalJogador";

export default function AdminArtilheirosPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [stats, setStats] = useState<Estatistica[]>([]);
  const [totalPartidas, setTotalPartidas] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [jogadorModalId, setJogadorModalId] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);

      const [s, partidas] = await Promise.all([
        dbGetEstatisticas(r.id),
        dbListarTotalPartidas(r.id),
      ]);

      setStats(s.filter((x) => x.gols > 0).sort((a, b) => b.gols - a.gols));

      const map: Record<string, number> = {};
      partidas.forEach((p) => {
        map[p.jogador_id] = p.total_partidas;
      });
      setTotalPartidas(map);

      setLoading(false);
    }
    carregar();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-white font-black">🥇 Artilheiros</h1>
            <p className="text-gray-500 text-xs">{racha?.nome}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-3 pb-10">
        {loading ? (
          <div className="text-center py-16 text-green-400 animate-pulse">
            Carregando...
          </div>
        ) : stats.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            Nenhum gol registrado
          </div>
        ) : (
          stats.map((s, i) => {
            const jogador = s.jogador as any;
            const medalha =
              i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            const destaque =
              i === 0
                ? "bg-yellow-500/10 border-yellow-500/40"
                : i === 1
                  ? "bg-slate-300/10 border-slate-300/40"
                  : i === 2
                    ? "bg-orange-500/10 border-orange-500/40"
                    : "bg-gray-900 border-gray-800";
            const corPosicao =
              i === 0
                ? "text-yellow-400"
                : i === 1
                  ? "text-slate-300"
                  : i === 2
                    ? "text-orange-400"
                    : "text-gray-600";
            const jogos = totalPartidas[s.jogador_id] ?? 0;

            return (
              <button
                key={s.id}
                onClick={() => setJogadorModalId(s.jogador_id)}
                className={`border rounded-2xl px-4 py-3 flex items-center gap-3 transition-all hover:scale-[1.02] hover:shadow-lg w-full text-left ${destaque}`}
              >
                <div className="flex items-center gap-1 w-10">
                  <span className={`text-lg font-black ${corPosicao}`}>
                    {i + 1}
                  </span>
                  {medalha && <span className="text-sm">{medalha}</span>}
                </div>

                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                  {jogador?.foto_url ? (
                    <img
                      src={jogador.foto_url}
                      alt={jogador.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                      {jogador?.nome?.charAt(0) ?? "?"}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">
                    {jogador?.nome ?? "—"}
                    {i === 0 && (
                      <span className="ml-2 text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded-full font-black">
                        MVP
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-gray-500 text-xs">{jogador?.posicao}</p>
                    <span className="text-gray-700 text-xs">·</span>
                    <p className="text-gray-500 text-xs">
                      {jogos} {jogos === 1 ? "jogo" : "jogos"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-green-400 font-black text-2xl">
                    {s.gols}
                  </span>
                  <span className="text-green-400 text-sm">⚽</span>
                </div>
              </button>
            );
          })
        )}
      </main>

      <ModalJogador
        jogadorId={jogadorModalId}
        rachaId={racha?.id ?? ""}
        onClose={() => setJogadorModalId(null)}
      />
    </div>
  );
}
