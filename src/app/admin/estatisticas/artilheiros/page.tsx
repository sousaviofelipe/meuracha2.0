"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import { dbGetEstatisticas } from "@/lib/db/rachas.db";
import { Estatistica } from "@/types";

export default function AdminArtilheirosPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Estatistica[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeRacha, setNomeRacha] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");

      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");

      setNomeRacha(r.nome);

      const s = await dbGetEstatisticas(r.id);

      setStats(s.filter((x) => x.gols > 0).sort((a, b) => b.gols - a.gols));

      setLoading(false);
    }

    carregar();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* HEADER */}
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
            <p className="text-gray-500 text-xs">{nomeRacha}</p>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
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

            // 🥇🥈🥉 Medalhas
            const medalha =
              i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

            // 🎨 Destaque com glow
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
                key={s.id}
                className={`border rounded-2xl px-4 py-3 flex items-center gap-3 transition-all hover:scale-[1.02] hover:shadow-lg ${destaque}`}
              >
                {/* POSIÇÃO + MEDALHA */}
                <div className="flex items-center gap-1 w-10">
                  <span className={`text-lg font-black ${corPosicao}`}>
                    {i + 1}
                  </span>
                  {medalha && <span className="text-sm">{medalha}</span>}
                </div>

                {/* FOTO */}
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

                {/* INFO */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">
                    {jogador?.nome ?? "—"}

                    {/* 🏆 BADGE 1º LUGAR */}
                    {i === 0 && (
                      <span className="ml-2 text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded-full font-black">
                        MVP
                      </span>
                    )}
                  </p>

                  <p className="text-gray-500 text-xs">{jogador?.posicao}</p>
                </div>

                {/* GOLS */}
                <div className="flex items-center gap-1">
                  <span className="text-green-400 font-black text-2xl">
                    {s.gols}
                  </span>
                  <span className="text-green-400 text-sm">⚽</span>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
