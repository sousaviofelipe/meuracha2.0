"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import {
  listarJogadores,
  criarJogador,
  editarJogador,
  toggleJogador,
  deletarJogador,
  toggleMensalista,
} from "@/lib/services/jogadores.service";
import { Jogador, Posicao, Racha } from "@/types";

const POSICOES: Posicao[] = ["Goleiro", "Defensor", "Meio-campo", "Atacante"];

const POSICAO_COR: Record<Posicao, string> = {
  Goleiro: "bg-yellow-500/20 text-yellow-400",
  Defensor: "bg-blue-500/20 text-blue-400",
  "Meio-campo": "bg-green-500/20 text-green-400",
  Atacante: "bg-red-500/20 text-red-400",
};

type ModalState = { modo: "criar" } | { modo: "editar"; jogador: Jogador };

export default function JogadoresPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Posicao>("todos");

  // Form
  const [nome, setNome] = useState("");
  const [posicao, setPosicao] = useState<Posicao>("Atacante");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const inputFotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);
      const j = await listarJogadores(r.id);
      setJogadores(j);
      setLoading(false);
    }
    carregar();
  }, []);

  function abrirCriar() {
    setNome("");
    setPosicao("Atacante");
    setFoto(null);
    setFotoPreview(null);
    setErro("");
    setModal({ modo: "criar" });
  }

  function abrirEditar(j: Jogador) {
    setNome(j.nome);
    setPosicao(j.posicao);
    setFoto(null);
    setFotoPreview(j.foto_url ?? null);
    setErro("");
    setModal({ modo: "editar", jogador: j });
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function handleSalvar() {
    if (!nome.trim()) return setErro("Nome é obrigatório");
    if (!racha) return;
    setSalvando(true);
    setErro("");
    try {
      if (modal?.modo === "criar") {
        const j = await criarJogador(
          racha.id,
          nome.trim(),
          posicao,
          foto ?? undefined,
        );
        setJogadores((prev) =>
          [...prev, j].sort((a, b) => a.nome.localeCompare(b.nome)),
        );
      } else if (modal?.modo === "editar") {
        const j = await editarJogador(
          modal.jogador.id,
          nome.trim(),
          posicao,
          foto ?? undefined,
          modal.jogador.foto_url,
        );
        setJogadores((prev) => prev.map((x) => (x.id === j.id ? j : x)));
      }
      setModal(null);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleMensalista(j: Jogador) {
    await toggleMensalista(j.id, !j.mensalista);
    setJogadores((prev) =>
      prev.map((x) =>
        x.id === j.id ? { ...x, mensalista: !j.mensalista } : x,
      ),
    );
  }

  async function handleToggle(j: Jogador) {
    await toggleJogador(j.id, !j.ativo);
    setJogadores((prev) =>
      prev.map((x) => (x.id === j.id ? { ...x, ativo: !j.ativo } : x)),
    );
  }

  async function handleDeletar(j: Jogador) {
    if (!confirm(`Deletar ${j.nome}? Esta ação não pode ser desfeita.`)) return;
    await deletarJogador(j.id);
    setJogadores((prev) => prev.filter((x) => x.id !== j.id));
  }

  const jogadoresFiltrados = jogadores.filter((j) =>
    filtro === "todos" ? true : j.posicao === filtro,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Jogadores</h1>
          <p className="text-gray-400 text-sm">
            {jogadores.length} cadastrados
          </p>
        </div>
        <button
          onClick={abrirCriar}
          className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Novo Jogador
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(["todos", ...POSICOES] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFiltro(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtro === p
                ? "bg-green-500 text-black"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {p === "todos" ? "Todos" : p}
          </button>
        ))}
      </div>

      {/* Lista */}
      {jogadoresFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">👤</p>
          <p>Nenhum jogador encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {jogadoresFiltrados.map((j) => (
            <div
              key={j.id}
              className={`bg-gray-900 border rounded-2xl p-4 flex items-center gap-4 transition-opacity ${
                j.ativo ? "border-gray-800" : "border-gray-800 opacity-50"
              }`}
            >
              {/* Foto */}
              <div className="w-14 h-14 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                {j.foto_url ? (
                  <img
                    src={j.foto_url}
                    alt={j.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    👤
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{j.nome}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${POSICAO_COR[j.posicao]}`}
                >
                  {j.posicao}
                </span>

                {!j.mensalista && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-500 mt-1">
                    Não mensalista
                  </span>
                )}
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => abrirEditar(j)}
                  className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleToggle(j)}
                  className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors"
                >
                  {j.ativo ? "🔴" : "🟢"}
                </button>
                <button
                  onClick={() => handleToggleMensalista(j)}
                  title={
                    j.mensalista
                      ? "Desativar mensalidade"
                      : "Ativar mensalidade"
                  }
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                    j.mensalista
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-gray-800 text-gray-600 hover:bg-gray-700"
                  }`}
                >
                  💰
                </button>
                <button
                  onClick={() => handleDeletar(j)}
                  className="text-xs text-gray-400 hover:text-red-400 bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-white font-black text-lg">
              {modal.modo === "criar" ? "Novo Jogador" : "Editar Jogador"}
            </h2>

            {/* Preview foto */}
            <div
              className="w-24 h-24 rounded-full bg-gray-800 mx-auto overflow-hidden cursor-pointer border-2 border-dashed border-gray-700 hover:border-green-500 transition-colors flex items-center justify-center"
              onClick={() => inputFotoRef.current?.click()}
            >
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">📷</span>
              )}
            </div>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFoto}
            />
            <p className="text-gray-500 text-xs text-center -mt-2">
              Clique para adicionar foto
            </p>

            {/* Nome */}
            <input
              type="text"
              placeholder="Nome do jogador"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />

            {/* Posição */}
            <div className="grid grid-cols-2 gap-2">
              {POSICOES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPosicao(p)}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                    posicao === p
                      ? "bg-green-500 text-black"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

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
