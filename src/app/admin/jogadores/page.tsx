"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import {
  listarJogadores,
  criarJogador,
  editarJogador,
  toggleJogador,
  deletarJogador,
  toggleMensalista,
  toggleBloqueio,
  listarVinculosPendentes,
  aprovarVinculo,
  rejeitarVinculo,
} from "@/lib/services/jogadores.service";
import { Jogador, Posicao, Racha, VinculoPendente } from "@/types";

const POSICOES: Posicao[] = ["Goleiro", "Defensor", "Meio-campo", "Atacante"];

const POSICAO_COR: Record<Posicao, string> = {
  Goleiro: "bg-yellow-500/20 text-yellow-400",
  Defensor: "bg-blue-500/20 text-blue-400",
  "Meio-campo": "bg-green-500/20 text-green-400",
  Atacante: "bg-red-500/20 text-red-400",
};

type ModalState = { modo: "criar" } | { modo: "editar"; jogador: Jogador };
type ModalVinculo = { vinculo: VinculoPendente };

export default function JogadoresPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [vinculosPendentes, setVinculosPendentes] = useState<VinculoPendente[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalVinculo, setModalVinculo] = useState<ModalVinculo | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Posicao>("todos");

  // Form
  const [nome, setNome] = useState("");
  const [posicao, setPosicao] = useState<Posicao>("Atacante");
  const [email, setEmail] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const inputFotoRef = useRef<HTMLInputElement>(null);

  // Modal vínculo
  const [jogadorSelecionado, setJogadorSelecionado] = useState("");
  const [aprovando, setAprovando] = useState(false);
  const [erroVinculo, setErroVinculo] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);
      const [j, v] = await Promise.all([
        listarJogadores(r.id),
        listarVinculosPendentes(r.id),
      ]);
      setJogadores(j);
      setVinculosPendentes(v);
      setLoading(false);
    }
    carregar();
  }, []);

  function abrirCriar() {
    setNome("");
    setPosicao("Atacante");
    setEmail("");
    setFoto(null);
    setFotoPreview(null);
    setErro("");
    setModal({ modo: "criar" });
  }

  function abrirEditar(j: Jogador) {
    setNome(j.nome);
    setPosicao(j.posicao);
    setEmail(j.email ?? "");
    setFoto(null);
    setFotoPreview(j.foto_url ?? null);
    setErro("");
    setModal({ modo: "editar", jogador: j });
  }

  function abrirModalVinculo(v: VinculoPendente) {
    setJogadorSelecionado(v.jogador_id ?? "");
    setErroVinculo("");
    setModalVinculo({ vinculo: v });
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
          email.trim() || undefined,
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
          email.trim() || undefined,
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

  async function handleAprovarVinculo() {
    if (!modalVinculo) return;
    if (!jogadorSelecionado) {
      setErroVinculo("Selecione um jogador para vincular.");
      return;
    }
    setAprovando(true);
    setErroVinculo("");
    try {
      await aprovarVinculo(
        modalVinculo.vinculo.id,
        jogadorSelecionado,
        modalVinculo.vinculo.user_id,
      );
      setVinculosPendentes((prev) =>
        prev.filter((v) => v.id !== modalVinculo.vinculo.id),
      );
      setJogadores((prev) =>
        prev.map((j) =>
          j.id === jogadorSelecionado
            ? { ...j, user_id: modalVinculo.vinculo.user_id }
            : j,
        ),
      );
      setModalVinculo(null);
    } catch (err: any) {
      setErroVinculo(err.message);
    } finally {
      setAprovando(false);
    }
  }

  async function handleRejeitarVinculo(vinculoId: string) {
    if (!confirm("Rejeitar este pedido de vínculo?")) return;
    await rejeitarVinculo(vinculoId);
    setVinculosPendentes((prev) => prev.filter((v) => v.id !== vinculoId));
    setModalVinculo(null);
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

  async function handleToggleBloqueio(j: Jogador) {
    await toggleBloqueio(j.id, !j.bloqueado);
    setJogadores((prev) =>
      prev.map((x) => (x.id === j.id ? { ...x, bloqueado: !j.bloqueado } : x)),
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

  const jogadoresSemVinculo = jogadores.filter((j) => !j.user_id);

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

      {/* Vínculos pendentes */}
      {vinculosPendentes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-yellow-400 text-xs font-semibold px-1 flex items-center gap-1">
            🔔 Vínculos pendentes ({vinculosPendentes.length})
          </p>
          <div className="flex flex-col gap-2">
            {vinculosPendentes.map((v) => (
              <div
                key={v.id}
                className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {v.usuario_email}
                  </p>
                  <p className="text-gray-500 text-xs">Quer entrar no racha</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => abrirModalVinculo(v)}
                    className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleRejeitarVinculo(v.id)}
                    className="bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              } ${j.bloqueado ? "border-red-500/30" : ""}`}
            >
              {/* Foto */}
              <div className="w-14 h-14 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 relative">
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
                {j.bloqueado && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center rounded-full">
                    <span className="text-sm">🚫</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-white font-bold truncate">{j.nome}</p>
                  {j.user_id && (
                    <span
                      title="Conta vinculada"
                      className="text-green-400 text-xs"
                    >
                      ✓
                    </span>
                  )}
                  {j.bloqueado && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                      bloqueado
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${POSICAO_COR[j.posicao]}`}
                >
                  {j.posicao}
                </span>
                {j.email && (
                  <p className="text-gray-600 text-xs mt-0.5 truncate">
                    {j.email}
                  </p>
                )}
                {!j.mensalista && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-500 mt-1 inline-block">
                    Não mensalista
                  </span>
                )}
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => abrirEditar(j)}
                  title="Editar"
                  className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleToggle(j)}
                  title={j.ativo ? "Desativar" : "Ativar"}
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
                  onClick={() => handleToggleBloqueio(j)}
                  title={
                    j.bloqueado
                      ? "Desbloquear confirmação"
                      : "Bloquear confirmação"
                  }
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                    j.bloqueado
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-gray-800 text-gray-600 hover:bg-gray-700"
                  }`}
                >
                  🚫
                </button>
                <button
                  onClick={() => handleDeletar(j)}
                  title="Deletar"
                  className="text-xs text-gray-400 hover:text-red-400 bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-white font-black text-lg">
              {modal.modo === "criar" ? "Novo Jogador" : "Editar Jogador"}
            </h2>

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

            <input
              type="text"
              placeholder="Nome do jogador"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />

            <div className="flex flex-col gap-1">
              <input
                type="email"
                placeholder="Email do jogador (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
              <p className="text-gray-600 text-xs px-1">
                Se informado, o jogador será vinculado automaticamente ao criar
                conta.
              </p>
            </div>

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

      {/* Modal aprovação de vínculo */}
      {modalVinculo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-white font-black text-lg">Aprovar vínculo</h2>

            <div className="bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-gray-400 text-xs">Solicitante</p>
              <p className="text-white font-semibold text-sm mt-0.5">
                {modalVinculo.vinculo.usuario_email}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-gray-400 text-sm">
                Selecione qual jogador corresponde a este usuário:
              </p>
              <select
                value={jogadorSelecionado}
                onChange={(e) => setJogadorSelecionado(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
              >
                <option value="">Selecionar jogador...</option>
                {jogadoresSemVinculo.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nome} — {j.posicao}
                  </option>
                ))}
              </select>
            </div>

            {erroVinculo && (
              <p className="text-red-400 text-sm">{erroVinculo}</p>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => handleRejeitarVinculo(modalVinculo.vinculo.id)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-red-400 hover:bg-red-500/20 font-medium transition-colors"
              >
                Rejeitar
              </button>
              <button
                onClick={handleAprovarVinculo}
                disabled={aprovando}
                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
              >
                {aprovando ? "Aprovando..." : "Aprovar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
