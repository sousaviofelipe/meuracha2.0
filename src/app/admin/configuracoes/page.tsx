"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import {
  dbAtualizarRacha,
  dbVerificarCodigoDisponivel,
} from "@/lib/db/rachas.db";
import { dbAtualizarFinanceiro } from "@/lib/db/financeiro.db";
import { Racha } from "@/types";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoPix, setSalvandoPix] = useState(false);
  const [erro, setErro] = useState("");
  const [erroPix, setErroPix] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [sucessoPix, setSucessoPix] = useState(false);

  // Racha
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigo, setCodigo] = useState("");

  // Financeiro
  const [mensalidade, setMensalidade] = useState("");
  const [pixChave, setPixChave] = useState("");
  const [pixTitular, setPixTitular] = useState("");
  const [pixBanco, setPixBanco] = useState("");

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
      setMensalidade((r as any).mensalidade?.toString() ?? "");
      setPixChave((r as any).pix_chave ?? "");
      setPixTitular((r as any).pix_titular ?? "");
      setPixBanco((r as any).pix_banco ?? "");
      setLoading(false);
    }
    carregar();
  }, []);

  async function handleSalvarRacha() {
    if (!nome.trim()) return setErro("Nome é obrigatório");
    if (!codigo.trim()) return setErro("Código é obrigatório");
    if (!racha) return;
    setSalvando(true);
    setErro("");
    setSucesso(false);
    try {
      const codigoFormatado = codigo.toUpperCase().trim();
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

  async function handleSalvarFinanceiro() {
    if (!racha) return;
    setSalvandoPix(true);
    setErroPix("");
    setSucessoPix(false);
    try {
      await dbAtualizarFinanceiro(
        racha.id,
        parseFloat(mensalidade) || 0,
        pixChave.trim(),
        pixTitular.trim(),
        pixBanco.trim(),
      );
      setSucessoPix(true);
      setTimeout(() => setSucessoPix(false), 3000);
    } catch (err: any) {
      setErroPix(err.message);
    } finally {
      setSalvandoPix(false);
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

  const linkNovo = `${typeof window !== "undefined" ? window.location.origin : ""}/racha/${codigo}`;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-black text-white">Configurações</h1>
        <p className="text-gray-400 text-sm">
          Gerencie as informações do seu racha
        </p>
      </div>

      {/* Card Racha */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
        <h2 className="text-white font-bold">📋 Informações do Racha</h2>
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">
            Nome do racha
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">
            Descrição <span className="text-gray-600">(opcional)</span>
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors resize-none"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">
            Código do racha
          </label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => handleCodigo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-green-500 transition-colors"
          />
          <p className="text-gray-600 text-xs">
            Somente letras maiúsculas, números e hífen
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs mb-1">Link de acesso</p>
          <p className="text-green-400 text-xs font-mono break-all">
            {linkNovo}
          </p>
        </div>
        {erro && <p className="text-red-400 text-sm">{erro}</p>}
        {sucesso && (
          <p className="text-green-400 text-sm">✅ Salvo com sucesso!</p>
        )}
        <button
          onClick={handleSalvarRacha}
          disabled={salvando}
          className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      {/* Card Financeiro */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
        <h2 className="text-white font-bold">💰 Financeiro & PIX</h2>
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">
            Valor da mensalidade (R$)
          </label>
          <input
            type="number"
            value={mensalidade}
            onChange={(e) => setMensalidade(e.target.value)}
            placeholder="Ex: 50.00"
            step="0.01"
            min="0"
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">Chave PIX</label>
          <input
            type="text"
            value={pixChave}
            onChange={(e) => setPixChave(e.target.value)}
            placeholder="CPF, email, telefone ou chave aleatória"
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">
            Nome do titular
          </label>
          <input
            type="text"
            value={pixTitular}
            onChange={(e) => setPixTitular(e.target.value)}
            placeholder="Ex: João Silva"
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm font-medium">Banco</label>
          <input
            type="text"
            value={pixBanco}
            onChange={(e) => setPixBanco(e.target.value)}
            placeholder="Ex: Nubank, Bradesco, Inter..."
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        {erroPix && <p className="text-red-400 text-sm">{erroPix}</p>}
        {sucessoPix && (
          <p className="text-green-400 text-sm">✅ Dados financeiros salvos!</p>
        )}
        <button
          onClick={handleSalvarFinanceiro}
          disabled={salvandoPix}
          className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
        >
          {salvandoPix ? "Salvando..." : "Salvar PIX e mensalidade"}
        </button>
      </div>
    </div>
  );
}
