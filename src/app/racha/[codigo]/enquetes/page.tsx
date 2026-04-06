"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { dbGetRachaPorCodigo, dbVotarPublico } from "@/lib/db/publico.db";
import { getSupabase } from "@/lib/db/supabase";
import { Enquete } from "@/types";

export default function EnquetesPublicoPage() {
  const params = useParams();
  const codigo = params.codigo as string;
  const [enquetes, setEnquetes] = useState<Enquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomRacha, setNomRacha] = useState("");
  const [votos, setVotos] = useState<Record<string, string>>({});
  const [votando, setVotando] = useState<string | null>(null);

  useEffect(() => {
    // Carrega votos salvos no localStorage
    const votosSalvos: Record<string, string> = {};
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(`voto_enquete_`),
    );
    keys.forEach((k) => {
      votosSalvos[k.replace("voto_enquete_", "")] =
        localStorage.getItem(k) ?? "";
    });
    setVotos(votosSalvos);

    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo);
      if (!r) return;
      setNomRacha(r.nome);

      const { data } = await getSupabase()
        .from("enquetes")
        .select("*, opcoes:enquete_opcoes(*)")
        .eq("racha_id", r.id)
        .eq("ativa", true)
        .order("criado_em", { ascending: false });

      setEnquetes(data ?? []);
      setLoading(false);
    }
    carregar();
  }, [codigo]);

  async function handleVotar(enqueteId: string, opcaoId: string) {
    if (votos[enqueteId] || votando) return;
    setVotando(enqueteId);
    try {
      await dbVotarPublico(opcaoId);
      const novosVotos = { ...votos, [enqueteId]: opcaoId };
      setVotos(novosVotos);
      localStorage.setItem(`voto_enquete_${enqueteId}`, opcaoId);

      // Recarrega enquete atualizada
      const { data } = await getSupabase()
        .from("enquetes")
        .select("*, opcoes:enquete_opcoes(*)")
        .eq("id", enqueteId)
        .single();
      if (data)
        setEnquetes((prev) => prev.map((e) => (e.id === enqueteId ? data : e)));
    } finally {
      setVotando(null);
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
            <h1 className="text-white font-black">📋 Enquetes</h1>
            <p className="text-gray-500 text-xs">{nomRacha}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-4 pb-10">
        {loading ? (
          <div className="text-center py-16 text-green-400 animate-pulse">
            Carregando...
          </div>
        ) : enquetes.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">📋</p>
            <p>Nenhuma enquete ativa</p>
          </div>
        ) : (
          enquetes.map((e) => {
            const total = e.opcoes?.reduce((acc, o) => acc + o.votos, 0) ?? 0;
            const votouNessa = votos[e.id];
            return (
              <div
                key={e.id}
                className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span>📋</span>
                  <span className="text-blue-400 font-bold text-sm">
                    Enquete
                  </span>
                  <span className="ml-auto text-gray-500 text-xs">
                    {total} votos
                  </span>
                </div>
                <p className="text-white font-semibold mb-4">{e.pergunta}</p>
                <div className="flex flex-col gap-2">
                  {e.opcoes?.map((op) => {
                    const pct =
                      total > 0 ? Math.round((op.votos / total) * 100) : 0;
                    const selecionada = votouNessa === op.id;
                    return (
                      <button
                        key={op.id}
                        onClick={() => handleVotar(e.id, op.id)}
                        disabled={!!votouNessa || votando === e.id}
                        className={`w-full text-left rounded-xl overflow-hidden transition-all ${
                          votouNessa
                            ? selecionada
                              ? "ring-2 ring-blue-400"
                              : "opacity-70"
                            : "hover:ring-2 hover:ring-blue-500/50 cursor-pointer"
                        }`}
                      >
                        <div className="relative bg-gray-800 px-4 py-3">
                          {votouNessa && (
                            <div
                              className="absolute inset-0 bg-blue-500/20 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          )}
                          <div className="relative flex justify-between items-center">
                            <span className="text-gray-200 text-sm">
                              {op.opcao}
                            </span>
                            {votouNessa && (
                              <span className="text-blue-400 font-bold text-sm">
                                {pct}%
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!votouNessa && (
                  <p className="text-gray-500 text-xs mt-3 text-center">
                    Toque para votar
                  </p>
                )}
                {votouNessa && (
                  <p className="text-green-400 text-xs mt-3 text-center">
                    ✓ Voto registrado
                  </p>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
