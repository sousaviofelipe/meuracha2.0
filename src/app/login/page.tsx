"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, getSession } from "@/lib/services/auth.service";
import { criarRacha, getRachaPorAdmin } from "@/lib/services/racha.service";
import { dbValidarConvite, dbUsarConvite } from "@/lib/db/convites.db";
import { getSupabase } from "@/lib/db/supabase";
import { Racha } from "@/types";

const WHATSAPP_NUMERO = "5583999999999";
const WHATSAPP_MENSAGEM = encodeURIComponent(
  "Olá! Quero criar meu racha no RachaApp. Como faço para adquirir acesso?",
);

interface RachaFavorito {
  id: string;
  nome: string;
  codigo: string;
}

export default function LoginPage() {
  const router = useRouter();

  // Pesquisa
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Racha[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Favoritos
  const [favoritos, setFavoritos] = useState<RachaFavorito[]>([]);

  // Admin
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomeRacha, setNomeRacha] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigoConvite, setCodigoConvite] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // Carrega favoritos do localStorage
  useEffect(() => {
    const salvo = localStorage.getItem("rachas_favoritos");
    if (salvo) setFavoritos(JSON.parse(salvo));
  }, []);

  // Debounce da busca
  useEffect(() => {
    if (!busca.trim()) {
      setResultados([]);
      return;
    }
    const timer = setTimeout(() => buscarRachas(busca), 400);
    return () => clearTimeout(timer);
  }, [busca]);

  async function buscarRachas(termo: string) {
    setBuscando(true);
    try {
      const { data } = await getSupabase()
        .from("rachas")
        .select("id, nome, codigo, descricao")
        .ilike("nome", `%${termo}%`)
        .limit(5);
      setResultados(data ?? []);
    } finally {
      setBuscando(false);
    }
  }

  function favoritar(racha: Racha) {
    const jaFavorito = favoritos.find((f) => f.id === racha.id);
    let novos: RachaFavorito[];
    if (jaFavorito) {
      novos = favoritos.filter((f) => f.id !== racha.id);
    } else {
      novos = [
        ...favoritos,
        { id: racha.id, nome: racha.nome, codigo: racha.codigo },
      ];
    }
    setFavoritos(novos);
    localStorage.setItem("rachas_favoritos", JSON.stringify(novos));
  }

  function isFavorito(id: string) {
    return favoritos.some((f) => f.id === id);
  }

  function acessarRacha(codigo: string) {
    router.push(`/racha/${codigo}`);
  }

  async function handleAdmin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    try {
      if (modo === "cadastro") {
        if (!nomeRacha.trim()) throw new Error("Nome do racha é obrigatório");
        if (!codigoConvite.trim())
          throw new Error("Código de convite é obrigatório");
        const conviteValido = await dbValidarConvite(codigoConvite.trim());
        if (!conviteValido)
          throw new Error("Código de convite inválido ou já utilizado.");
        const { user } = await signUp(email, password);
        if (!user) throw new Error("Erro ao criar conta.");
        await signIn(email, password);
        const session = await getSession();
        if (!session) throw new Error("Sessão não encontrada.");
        await dbUsarConvite(codigoConvite.trim(), session.user.id);
        await criarRacha(session.user.id, nomeRacha.trim(), descricao);
      } else {
        await signIn(email, password);
        const session = await getSession();
        if (!session) throw new Error("Sessão não encontrada.");
        const racha = await getRachaPorAdmin(session.user.id);
        if (!racha) throw new Error("Nenhum racha vinculado a esta conta.");
      }
      router.push("/admin/dashboard");
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-start p-4 pt-10 gap-6">
      {/* Logo */}
      <div className="text-center">
        <img src="/logo.png" alt="RachaApp" className="h-16 w-auto mx-auto" />
        <p className="text-gray-400 mt-2 text-sm">
          Gerencie seu racha com facilidade
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Pesquisa */}
        <div className="relative">
          <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 focus-within:border-green-500 transition-colors">
            <span className="text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar racha pelo nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
            />
            {buscando && (
              <span className="text-gray-500 text-xs animate-pulse">
                buscando...
              </span>
            )}
            {busca && !buscando && (
              <button
                onClick={() => {
                  setBusca("");
                  setResultados([]);
                }}
                className="text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden z-20 shadow-xl">
              {resultados.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
                >
                  <button
                    onClick={() => acessarRacha(r.codigo)}
                    className="flex-1 text-left"
                  >
                    <p className="text-white font-bold text-sm">{r.nome}</p>
                    <p className="text-gray-500 text-xs font-mono">
                      {r.codigo}
                    </p>
                    {r.descricao && (
                      <p className="text-gray-600 text-xs mt-0.5 truncate">
                        {r.descricao}
                      </p>
                    )}
                  </button>
                  <button
                    onClick={() => favoritar(r)}
                    className="text-xl transition-transform hover:scale-110"
                  >
                    {isFavorito(r.id) ? "⭐" : "☆"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {busca && !buscando && resultados.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 z-20 text-center">
              <p className="text-gray-500 text-sm">Nenhum racha encontrado</p>
            </div>
          )}
        </div>

        {/* Favoritos */}
        {favoritos.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-gray-500 text-xs font-semibold px-1">
              ⭐ Acesso rápido
            </p>
            <div className="flex flex-col gap-2">
              {favoritos.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3"
                >
                  <button
                    onClick={() => acessarRacha(f.codigo)}
                    className="flex-1 text-left"
                  >
                    <p className="text-white font-bold text-sm">{f.nome}</p>
                    <p className="text-gray-500 text-xs font-mono">
                      {f.codigo}
                    </p>
                  </button>
                  <button
                    onClick={() => acessarRacha(f.codigo)}
                    className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                  >
                    Acessar →
                  </button>
                  <button
                    onClick={() => favoritar(f as any)}
                    className="text-yellow-400 hover:text-gray-400 transition-colors text-lg"
                  >
                    ⭐
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divisor */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs">área administrativa</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Card Admin */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setModo("login");
                setErro("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                modo === "login"
                  ? "bg-green-500 text-black"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Login Admin
            </button>
            <button
              onClick={() => {
                setModo("cadastro");
                setErro("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                modo === "cadastro"
                  ? "bg-green-500 text-black"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Criar Racha
            </button>
          </div>

          <form onSubmit={handleAdmin} className="flex flex-col gap-4">
            {modo === "cadastro" && (
              <>
                <input
                  type="text"
                  placeholder="Código de convite (ex: INVITE-X7K2F3)"
                  value={codigoConvite}
                  onChange={(e) => setCodigoConvite(e.target.value)}
                  required
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors uppercase"
                />
                <input
                  type="text"
                  placeholder="Nome do racha"
                  value={nomeRacha}
                  onChange={(e) => setNomeRacha(e.target.value)}
                  required
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                />
              </>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition-colors"
            >
              {loading
                ? "Aguarde..."
                : modo === "login"
                  ? "Entrar"
                  : "Criar Racha"}
            </button>
          </form>

          {modo === "cadastro" && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-gray-500 text-xs text-center mb-3">
                Ainda não tem um código de convite?
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMERO}?text=${WHATSAPP_MENSAGEM}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Falar no WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
