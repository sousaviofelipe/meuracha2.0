"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  dbGetRachaPorCodigo,
  dbGetEstatisticasPublico,
} from "@/lib/db/publico.db";
import { Estatistica } from "@/types";

export default function AssistenciasPage() {
  const params = useParams();
  const codigo = params.codigo as string;
  const [stats, setStats] = useState<Estatistica[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomRacha, setNomRacha] = useState("");

  useEffect(() => {
    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo);
      if (!r) return;
      setNomRacha(r.nome);
      const s = await dbGetEstatisticasPublico(r.id);
      setStats(
        s
          .filter((x) => x.assistencias > 0)
          .sort((a, b) => b.assistencias - a.assistencias),
      );
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
            <h1 className="text-white font-black">🎯 Assistências</h1>
            <p className="text-gray-500 text-xs">{nomRacha}</p>
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
            Nenhuma assistência registrada
          </div>
        ) : (
          stats.map((s, i) => (
            <div
              key={s.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3"
            >
              <span
                className={`text-base font-black w-6 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-600"}`}
              >
                {i + 1}
              </span>
              <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                {(s.jogador as any)?.foto_url ? (
                  <img
                    src={(s.jogador as any).foto_url}
                    alt=""
                    style={{
                      width: 40,
                      height: 40,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    👤
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">
                  {(s.jogador as any)?.nome ?? "—"}
                </p>
                <p className="text-gray-500 text-xs">
                  {(s.jogador as any)?.posicao}
                </p>
              </div>
              <span className="text-blue-400 font-black text-xl">
                {s.assistencias} 🎯
              </span>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
