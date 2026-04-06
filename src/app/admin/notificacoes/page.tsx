"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import {
  listarNotificacoes,
  criarNotificacao,
  editarNotificacao,
  toggleNotificacao,
  deletarNotificacao,
} from "@/lib/services/notificacoes.service";
import { Notificacao, Racha } from "@/types";

type ModalState =
  | { modo: "criar" }
  | { modo: "editar"; notificacao: Notificacao };

export default function NotificacoesPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);
      const n = await listarNotificacoes(r.id);
      setNotificacoes(n);
      setLoading(false);
    }
    carregar();
  }, []);

  function abrirCriar() {
    setTitulo("");
    setMensagem("");
    setErro("");
    setModal({ modo: "criar" });
  }

  function abrirEditar(n: Notificacao) {
    setTitulo(n.titulo);
    setMensagem(n.mensagem);
    setErro("");
    setModal({ modo: "editar", notificacao: n });
  }

  async function handleSalvar() {
    if (!titulo.trim()) return setErro("Título é obrigatório");
    if (!mensagem.trim()) return setErro("Mensagem é obrigatória");
    if (!racha) return;
    setSalvando(true);
    setErro("");
    try {
      if (modal?.modo === "criar") {
        const n = await criarNotificacao(
          racha.id,
          titulo.trim(),
          mensagem.trim(),
        );
        setNotificacoes((prev) => [n, ...prev]);
      } else if (modal?.modo === "editar") {
        const n = await editarNotificacao(
          modal.notificacao.id,
          titulo.trim(),
          mensagem.trim(),
        );
        setNotificacoes((prev) => prev.map((x) => (x.id === n.id ? n : x)));
      }
      setModal(null);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggle(n: Notificacao) {
    await toggleNotificacao(n.id, !n.ativa);
    setNotificacoes((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, ativa: !n.ativa } : x)),
    );
  }

  async function handleDeletar(n: Notificacao) {
    if (!confirm(`Deletar "${n.titulo}"?`)) return;
    await deletarNotificacao(n.id);
    setNotificacoes((prev) => prev.filter((x) => x.id !== n.id));
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
          <h1 className="text-2xl font-black text-white">Notificações</h1>
          <p className="text-gray-400 text-sm">
            {notificacoes.length} cadastradas
          </p>
        </div>
        <button
          onClick={abrirCriar}
          className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Nova
        </button>
      </div>

      {notificacoes.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">🔔</p>
          <p>Nenhuma notificação criada</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notificacoes.map((n) => (
            <div
              key={n.id}
              className={`bg-gray-900 border rounded-2xl p-4 transition-opacity ${
                n.ativa ? "border-yellow-500/30" : "border-gray-800 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-2 h-2 rounded-full ${n.ativa ? "bg-yellow-400" : "bg-gray-600"}`}
                    />
                    <span className="text-white font-bold">{n.titulo}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{n.mensagem}</p>
                  <p className="text-gray-600 text-xs mt-2">
                    {new Date(n.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleToggle(n)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    n.ativa
                      ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {n.ativa ? "🔕 Desativar" : "🔔 Ativar"}
                </button>
                <button
                  onClick={() => abrirEditar(n)}
                  className="py-2 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeletar(n)}
                  className="py-2 px-4 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-sm transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-white font-black text-lg">
              {modal.modo === "criar"
                ? "Nova Notificação"
                : "Editar Notificação"}
            </h2>
            <input
              type="text"
              placeholder="Título"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            <textarea
              placeholder="Mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={4}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors resize-none"
            />
            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
