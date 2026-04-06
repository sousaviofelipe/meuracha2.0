"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import { dbGetEstatisticas } from "@/lib/db/rachas.db";
import { Estatistica } from "@/types";

export default function AdminCartoesPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Estatistica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      const s = await dbGetEstatisticas(r.id);
      setStats(
        s
          .filter((x) => x.cartoes_amarelos + x.cartoes_vermelhos > 0)
          .sort(
            (a, b) =>
              b.cartoes_amarelos +
              b.cartoes_vermelhos -
              (a.cartoes_amarelos + a.cartoes_vermelhos),
          ),
      );
      setLoading(false);
    }
    carregar();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/dashboard"
          className="text-gray-400 hover:text-white transition-colors"
        >
          ←
        </Link>
        <h1 className="text-2xl font-black text-white">🟨 Cartões</h1>
      </div>
      {loading ? (
        <div className="text-center py-16 text-green-400 animate-pulse">
          Carregando...
        </div>
      ) : stats.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          Nenhum cartão registrado
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {stats.map((s, i) => (
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
              <div className="flex gap-3">
                <span className="text-yellow-400 font-black">
                  🟨 {s.cartoes_amarelos}
                </span>
                <span className="text-red-400 font-black">
                  🟥 {s.cartoes_vermelhos}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
