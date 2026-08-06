"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/services/auth.service";
import { buscarJogadoresPorUserId } from "@/lib/services/jogadores.service";
import {
  listarJogadoresComNivel,
  salvarAvaliacao,
} from "@/lib/services/avaliacoes.service";
import { dbGetRachaPorCodigo } from "@/lib/db/publico.db";
import { JogadorComNivel, Racha } from "@/types";

export default function AvaliarPage() {
  const params = useParams();
  const router = useRouter();
  const codigo = params.codigo as string;

  const [racha, setRacha] = useState<Racha | null>(null);
  const [jogadorLogado, setJogadorLogado] = useState<JogadorComNivel | null>(
    null,
  );
  const [jogadores, setJogadores] = useState<JogadorComNivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [notasLocais, setNotasLocais] = useState<Record<string, string>>({});
  const [sucessos, setSucessos] = useState<Record<string, boolean>>({});
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    async function carregar() {
      try {
        const user = await getUser();
        if (!user) return router.push("/login");

        const r = await dbGetRachaPorCodigo(codigo);
        if (!r) return router.push("/login");
        setRacha(r);

        const jogadoresDoUsuario = await buscarJogadoresPorUserId(user.id);
        const jogadorDestePerfil = jogadoresDoUsuario.find(
          (j) => j.racha_id === r.id,
        );
        if (!jogadorDestePerfil) return router.push(`/racha/${codigo}`);

        const todos = await listarJogadoresComNivel(
          r.id,
          jogadorDestePerfil.id,
        );
        const semEuMesmo = todos.filter((j) => j.id !== jogadorDestePerfil.id);

        setJogadorLogado(jogadorDestePerfil as JogadorComNivel);
        setJogadores(semEuMesmo);

        // Pré-preenche notas já dadas
        const notas: Record<string, string> = {};
        semEuMesmo.forEach((j) => {
          if (
            j.avaliacao_do_usuario !== null &&
            j.avaliacao_do_usuario !== undefined
          ) {
            notas[j.id] = j.avaliacao_do_usuario.toString();
          }
        });
        setNotasLocais(notas);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [codigo]);

  async function handleSalvar(jogadorId: string) {
    if (!jogadorLogado || !racha) return;
    const notaStr = notasLocais[jogadorId];
    if (!notaStr)
      return setErros((prev) => ({
        ...prev,
        [jogadorId]: "Informe uma nota.",
      }));

    const nota = parseFloat(notaStr.replace(",", "."));
    if (isNaN(nota) || nota < 0 || nota > 10) {
      return setErros((prev) => ({
        ...prev,
        [jogadorId]: "Nota deve ser entre 0 e 10.",
      }));
    }

    setSalvando(jogadorId);
    setErros((prev) => ({ ...prev, [jogadorId]: "" }));
    try {
      await salvarAvaliacao(racha.id, jogadorLogado.id, jogadorId, nota);
      setSucessos((prev) => ({ ...prev, [jogadorId]: true }));
      setTimeout(
        () => setSucessos((prev) => ({ ...prev, [jogadorId]: false })),
        2000,
      );

      // Atualiza o nível médio localmente
      setJogadores((prev) =>
        prev.map((j) =>
          j.id === jogadorId ? { ...j, avaliacao_do_usuario: nota } : j,
        ),
      );
    } catch (err: any) {
      setErros((prev) => ({ ...prev, [jogadorId]: err.message }));
    } finally {
      setSalvando(null);
    }
  }

  function handleNota(jogadorId: string, valor: string) {
    // Permite apenas números e vírgula/ponto
    const limpo = valor.replace(/[^0-9.,]/g, "");
    setNotasLocais((prev) => ({ ...prev, [jogadorId]: limpo }));
    setSucessos((prev) => ({ ...prev, [jogadorId]: false }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/racha/${codigo}`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ←
            </Link>
            <div>
              <p className="text-white font-black">Avaliar jogadores</p>
              <p className="text-gray-500 text-xs">{racha?.nome}</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs">{jogadores.length} jogadores</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-3 pb-10">
        {/* Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-sm">
            Avalie seus colegas de racha de{" "}
            <span className="text-white font-bold">0 a 10</span>. As notas são
            anônimas e podem ser atualizadas a qualquer momento.
          </p>
        </div>

        {/* Lista de jogadores */}
        {jogadores.map((j) => {
          const jaAvaliou =
            j.avaliacao_do_usuario !== null &&
            j.avaliacao_do_usuario !== undefined;
          const isSalvando = salvando === j.id;
          const sucesso = sucessos[j.id];
          const erro = erros[j.id];

          return (
            <div
              key={j.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3"
            >
              {/* Foto */}
              <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                {j.foto_url ? (
                  <img
                    src={j.foto_url}
                    alt={j.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    👤
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{j.nome}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-gray-500 text-xs">{j.posicao}</span>
                  {j.nivel_medio !== null && j.nivel_medio !== undefined && (
                    <>
                      <span className="text-gray-700 text-xs">·</span>
                      <span className="text-yellow-400 text-xs font-bold">
                        ⭐ {j.nivel_medio}
                      </span>
                    </>
                  )}
                </div>
                {erro && <p className="text-red-400 text-xs mt-1">{erro}</p>}
                {sucesso && (
                  <p className="text-green-400 text-xs mt-1">
                    ✓ Avaliação salva!
                  </p>
                )}
              </div>

              {/* Input de nota + botão */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0-10"
                  value={notasLocais[j.id] ?? ""}
                  onChange={(e) => handleNota(j.id, e.target.value)}
                  className="w-16 bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-green-500 transition-colors"
                />
                <button
                  onClick={() => handleSalvar(j.id)}
                  disabled={isSalvando}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${
                    sucesso
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : jaAvaliou
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30"
                        : "bg-green-500 text-black hover:bg-green-400"
                  }`}
                >
                  {isSalvando
                    ? "..."
                    : sucesso
                      ? "✓"
                      : jaAvaliou
                        ? "Atualizar"
                        : "Avaliar"}
                </button>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
