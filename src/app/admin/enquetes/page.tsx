"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import {
  listarEnquetes,
  criarEnquete,
  toggleEnquete,
  deletarEnquete,
} from "@/lib/services/enquetes.service";
import { Enquete, Racha } from "@/types";

export default function EnquetesPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [enquetes, setEnquetes] = useState<Enquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [opcoes, setOpcoes] = useState(["", ""]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);
      const e = await listarEnquetes(r.id);
      setEnquetes(e);
      setLoading(false);
    }
    carregar();
  }, []);

  function abrirModal() {
    setPergunta("");
    setOpcoes(["", ""]);
    setErro("");
    setModal(true);
  }

  function adicionarOpcao() {
    if (opcoes.length >= 5) return;
    setOpcoes((prev) => [...prev, ""]);
  }

  function removerOpcao(i: number) {
    if (opcoes.length <= 2) return;
    setOpcoes((prev) => prev.filter((_, idx) => idx !== i));
  }

  function atualizarOpcao(i: number, valor: string) {
    setOpcoes((prev) => prev.map((o, idx) => (idx === i ? valor : o)));
  }

  async function handleSalvar() {
    if (!pergunta.trim()) return setErro("Pergunta é obrigatória");
    const opcoesValidas = opcoes.filter((o) => o.trim());
    if (opcoesValidas.length < 2)
      return setErro("Adicione pelo menos 2 opções");
    if (!racha) return;
    setSalvando(true);
    setErro("");
    try {
      await criarEnquete(racha.id, pergunta.trim(), opcoesValidas);
      const e = await listarEnquetes(racha.id);
      setEnquetes(e);
      setModal(false);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggle(e: Enquete) {
    await toggleEnquete(e.id, !e.ativa);
    setEnquetes((prev) =>
      prev.map((x) => (x.id === e.id ? { ...x, ativa: !e.ativa } : x)),
    );
  }

  async function handleDeletar(e: Enquete) {
    if (!confirm(`Deletar esta enquete?`)) return;
    await deletarEnquete(e.id);
    setEnquetes((prev) => prev.filter((x) => x.id !== e.id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Enquetes</h1>
          <p className="text-gray-400 text-sm">{enquetes.length} criadas</p>
        </div>
        <button
          onClick={abrirModal}
          className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Nova
        </button>
      </div>

      {enquetes.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">📋</p>
          <p>Nenhuma enquete criada</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {enquetes.map((e) => {
            const total = e.opcoes?.reduce((acc, o) => acc + o.votos, 0) ?? 0;
            return (
              <div
                key={e.id}
                className={`bg-gray-900 border rounded-2xl p-4 transition-opacity ${
                  e.ativa ? "border-blue-500/30" : "border-gray-800 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-2 h-2 rounded-full ${e.ativa ? "bg-blue-400" : "bg-gray-600"}`}
                  />
                  <span className="text-white font-bold flex-1">
                    {e.pergunta}
                  </span>
                  <span className="text-gray-500 text-xs">{total} votos</span>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  {e.opcoes?.map((op) => {
                    const pct =
                      total > 0 ? Math.round((op.votos / total) * 100) : 0;
                    return (
                      <div key={op.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{op.opcao}</span>
                          <span className="text-blue-400 font-bold">
                            {op.votos} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(e)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                      e.ativa
                        ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {e.ativa ? "⏸ Encerrar" : "▶ Ativar"}
                  </button>
                  <button
                    onClick={() => handleDeletar(e)}
                    className="py-2 px-4 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-sm transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-white font-black text-lg">Nova Enquete</h2>

            <input
              type="text"
              placeholder="Pergunta da enquete"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />

            <div className="flex flex-col gap-2">
              <p className="text-gray-400 text-sm">Opções</p>
              {opcoes.map((op, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Opção ${i + 1}`}
                    value={op}
                    onChange={(e) => atualizarOpcao(i, e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors text-sm"
                  />
                  {opcoes.length > 2 && (
                    <button
                      onClick={() => removerOpcao(i)}
                      className="px-3 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {opcoes.length < 5 && (
                <button
                  onClick={adicionarOpcao}
                  className="py-2 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400 text-sm transition-colors"
                >
                  + Adicionar opção
                </button>
              )}
            </div>

            {erro && <p className="text-red-400 text-sm">{erro}</p>}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
              >
                {salvando ? "Salvando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
