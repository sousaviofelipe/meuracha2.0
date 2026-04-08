"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  dbGetRachaPorCodigo,
  dbVotarPublico,
  dbDesvotarPublico,
} from "@/lib/db/publico.db";
import { getSupabase } from "@/lib/db/supabase";
import { Enquete } from "@/types";

const VOTO_KEY = (enqueteId: string) => `voto_enquete_${enqueteId}`;
const TROCOU_KEY = (enqueteId: string) => `trocou_voto_${enqueteId}`;

export default function EnquetesPublicoPage() {
  const params = useParams();
  const codigo = params.codigo as string;
  const [enquetes, setEnquetes] = useState<Enquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomRacha, setNomRacha] = useState("");
  const [votos, setVotos] = useState<Record<string, string>>({});
  const [trocou, setTrocou] = useState<Record<string, boolean>>({});
  const [votando, setVotando] = useState<string | null>(null);

  useEffect(() => {
    const votosSalvos: Record<string, string> = {};
    const trocouSalvo: Record<string, boolean> = {};
    Object.keys(localStorage)
      .filter((k) => k.startsWith("voto_enquete_"))
      .forEach((k) => {
        const id = k.replace("voto_enquete_", "");
        votosSalvos[id] = localStorage.getItem(k) ?? "";
      });
    Object.keys(localStorage)
      .filter((k) => k.startsWith("trocou_voto_"))
      .forEach((k) => {
        const id = k.replace("trocou_voto_", "");
        trocouSalvo[id] = true;
      });
    setVotos(votosSalvos);
    setTrocou(trocouSalvo);

    async function carregar() {
      const r = await dbGetRachaPorCodigo(codigo);
      if (!r) return;
      setNomRacha(r.nome);
      const { data } = await getSupabase()
        .from("enquetes")
        .select(
          "*, opcoes:enquete_opcoes(*, jogador:jogadores(id, nome, foto_url))",
        )
        .eq("racha_id", r.id)
        .eq("ativa", true)
        .order("criado_em", { ascending: false });
      setEnquetes(data ?? []);
      setLoading(false);
    }
    carregar();
  }, [codigo]);

  async function handleVotar(enqueteId: string, opcaoId: string) {
    if (votando) return;
    const votoAtual = votos[enqueteId];
    const jaVotouEJaTrocou = votoAtual && trocou[enqueteId];
    if (jaVotouEJaTrocou) return; // já trocou uma vez, não pode mais
    if (votoAtual === opcaoId) return; // clicou na mesma opção

    setVotando(enqueteId);
    try {
      // Remove voto anterior se existir
      if (votoAtual) {
        await dbDesvotarPublico(votoAtual);
        localStorage.setItem(TROCOU_KEY(enqueteId), "1");
        setTrocou((prev) => ({ ...prev, [enqueteId]: true }));
      }

      // Registra novo voto
      await dbVotarPublico(opcaoId);
      setVotos((prev) => ({ ...prev, [enqueteId]: opcaoId }));
      localStorage.setItem(VOTO_KEY(enqueteId), opcaoId);

      // Recarrega enquete
      const { data } = await getSupabase()
        .from("enquetes")
        .select(
          "*, opcoes:enquete_opcoes(*, jogador:jogadores(id, nome, foto_url))",
        )
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
            const jaVotouETrocou = votouNessa && trocou[e.id];
            const podeVotar = !jaVotouETrocou && votando !== e.id;
            const isJogador = e.tipo === "jogador";

            return (
              <div
                key={e.id}
                className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span>{isJogador ? "👤" : "📋"}</span>
                  <span className="text-blue-400 font-bold text-sm flex-1">
                    {e.pergunta}
                  </span>
                  <span className="text-gray-500 text-xs">{total} votos</span>
                </div>

                <div className={`flex flex-col gap-2 ${isJogador ? "" : ""}`}>
                  {isJogador ? (
                    // Layout especial para jogadores — grid com foto
                    <div className="grid grid-cols-2 gap-2">
                      {e.opcoes?.map((op) => {
                        const pct =
                          total > 0 ? Math.round((op.votos / total) * 100) : 0;
                        const selecionada = votouNessa === op.id;
                        const jogador = (op as any).jogador;

                        return (
                          <button
                            key={op.id}
                            onClick={() =>
                              podeVotar ? handleVotar(e.id, op.id) : null
                            }
                            disabled={!podeVotar && !selecionada}
                            className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                              selecionada
                                ? "border-blue-400 bg-blue-500/20"
                                : podeVotar
                                  ? "border-gray-700 bg-gray-800 hover:border-blue-500/50 cursor-pointer"
                                  : "border-gray-700 bg-gray-800 opacity-70 cursor-default"
                            }`}
                          >
                            {/* Foto */}
                            <div
                              className="rounded-full overflow-hidden border-2 flex-shrink-0"
                              style={{
                                width: 56,
                                height: 56,
                                borderColor: selecionada
                                  ? "#60a5fa"
                                  : "#374151",
                              }}
                            >
                              {jogador?.foto_url ? (
                                <img
                                  src={jogador.foto_url}
                                  alt={jogador.nome}
                                  style={{
                                    width: 56,
                                    height: 56,
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
                                  {op.opcao.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="text-white text-sm font-medium text-center">
                              {op.opcao}
                            </span>
                            {votouNessa && (
                              <div className="w-full">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-400">
                                    {op.votos} votos
                                  </span>
                                  <span className="text-blue-400 font-bold">
                                    {pct}%
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {selecionada && (
                              <span className="absolute top-2 right-2 text-blue-400 text-sm">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    // Layout normal para texto
                    e.opcoes?.map((op) => {
                      const pct =
                        total > 0 ? Math.round((op.votos / total) * 100) : 0;
                      const selecionada = votouNessa === op.id;
                      return (
                        <button
                          key={op.id}
                          onClick={() =>
                            podeVotar ? handleVotar(e.id, op.id) : null
                          }
                          disabled={!podeVotar && !selecionada}
                          className={`w-full text-left rounded-xl overflow-hidden transition-all ${
                            selecionada
                              ? "ring-2 ring-blue-400"
                              : podeVotar
                                ? "hover:ring-2 hover:ring-blue-500/50 cursor-pointer"
                                : "cursor-default"
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
                    })
                  )}
                </div>

                <div className="mt-3 text-center">
                  {!votouNessa && (
                    <p className="text-gray-500 text-xs">Toque para votar</p>
                  )}
                  {votouNessa && !jaVotouETrocou && (
                    <p className="text-blue-400 text-xs">
                      ✓ Votado — você pode trocar uma vez
                    </p>
                  )}
                  {jaVotouETrocou && (
                    <p className="text-gray-500 text-xs">✓ Voto registrado</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
