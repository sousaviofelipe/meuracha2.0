"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import {
  dbAtualizarRacha,
  dbVerificarCodigoDisponivel,
} from "@/lib/db/rachas.db";
import { Racha } from "@/types";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);
      setNome(r.nome);
      setDescricao(r.descricao ?? "");
      setCodigo(r.codigo);
      setLoading(false);
    }
    carregar();
  }, []);

  async function handleSalvar() {
    if (!nome.trim()) return setErro("Nome é obrigatório");
    if (!codigo.trim()) return setErro("Código é obrigatório");
    if (codigo.length < 4)
      return setErro("Código deve ter pelo menos 4 caracteres");
    if (!/^[A-Z0-9-]+$/.test(codigo.toUpperCase()))
      return setErro("Código só pode ter letras, números e hífen");
    if (!racha) return;

    setSalvando(true);
    setErro("");
    setSucesso(false);

    try {
      const codigoFormatado = codigo.toUpperCase().trim();

      // Verifica se código já está em uso por outro racha
      if (codigoFormatado !== racha.codigo) {
        const disponivel = await dbVerificarCodigoDisponivel(
          codigoFormatado,
          racha.id,
        );
        if (!disponivel)
          throw new Error("Este código já está em uso por outro racha.");
      }

      const atualizado = await dbAtualizarRacha(
        racha.id,
        nome.trim(),
        descricao.trim(),
        codigoFormatado,
      );
      setRacha(atualizado);
      setCodigo(atualizado.codigo);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function handleCodigo(valor: string) {
    setCodigo(valor.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-green-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  const linkAtual = `${typeof window !== "undefined" ? window.location.origin : ""}/racha/${racha?.codigo}`;
  const linkNovo = `${typeof window !== "undefined" ? window.location.origin : ""}/racha/${codigo}`;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-black text-white">Configurações</h1>
        <p className="text-gray-400 text-sm">
          Gerencie as informações do seu racha
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
        {/* Nome */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">
            Nome do racha
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            placeholder="Ex: Racha da Quinta"
          />
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">
            Descrição <span className="text-gray-600">(opcional)</span>
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors resize-none"
            placeholder="Ex: Racha toda quinta-feira às 19h"
          />
        </div>

        {/* Código */}
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">
            Código do racha
          </label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => handleCodigo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors font-mono"
            placeholder="Ex: RACHA-MEUTIME"
          />
          <p className="text-gray-600 text-xs">
            Somente letras maiúsculas, números e hífen
          </p>
        </div>

        {/* Preview do link */}
        <div className="bg-gray-800 rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs mb-1">Link de acesso</p>
          <p
            className={`text-xs font-mono break-all transition-colors ${
              codigo !== racha?.codigo ? "text-yellow-400" : "text-green-400"
            }`}
          >
            {linkNovo}
          </p>
          {codigo !== racha?.codigo && (
            <p className="text-yellow-500 text-xs mt-2">
              ⚠️ O link atual <span className="font-mono">{linkAtual}</span>{" "}
              deixará de funcionar após salvar.
            </p>
          )}
        </div>

        {erro && <p className="text-red-400 text-sm">{erro}</p>}
        {sucesso && (
          <p className="text-green-400 text-sm">
            ✅ Configurações salvas com sucesso!
          </p>
        )}

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
