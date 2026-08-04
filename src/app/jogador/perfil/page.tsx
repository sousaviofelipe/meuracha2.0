"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getUser,
  signOut,
  solicitarVinculo,
  verificarVinculoPendente,
} from "@/lib/services/auth.service";
import { buscarJogadoresPorUserId } from "@/lib/services/jogadores.service";
import { Jogador } from "@/types";

export default function JogadorPerfilPage() {
  const router = useRouter();

  const [jogadores, setJogadores] = useState<(Jogador & { racha?: any })[]>([]);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Vínculo
  const [codigoRacha, setCodigoRacha] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const [erroVinculo, setErroVinculo] = useState("");
  const [sucessoVinculo, setSucessoVinculo] = useState("");

  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    carregarPerfil();
  }, []);

  async function carregarPerfil() {
    setLoading(true);
    try {
      const user = await getUser();
      if (!user) {
        router.push("/jogador/login");
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? "");
      const data = await buscarJogadoresPorUserId(user.id);
      setJogadores(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSolicitarVinculo(e: React.FormEvent) {
    e.preventDefault();
    setVinculando(true);
    setErroVinculo("");
    setSucessoVinculo("");

    try {
      if (!codigoRacha.trim()) throw new Error("Informe o código do racha.");

      // Busca o racha pelo código
      const { getSupabase } = await import("@/lib/db/supabase");
      const { data: racha } = await getSupabase()
        .from("rachas")
        .select("id, nome")
        .eq("codigo", codigoRacha.trim().toUpperCase())
        .maybeSingle();

      if (!racha) throw new Error("Racha não encontrado. Verifique o código.");

      // Verifica se já está vinculado a esse racha
      const jaVinculado = jogadores.some((j) => j.racha_id === racha.id);
      if (jaVinculado) throw new Error("Você já está vinculado a este racha.");

      // Verifica se já tem pedido pendente
      const pendente = await verificarVinculoPendente(racha.id, userId);
      if (pendente)
        throw new Error(
          "Você já tem um pedido pendente neste racha. Aguarde a aprovação do admin.",
        );

      await solicitarVinculo(racha.id, userId, userEmail);
      setSucessoVinculo(
        `Pedido enviado para o racha "${racha.nome}"! O admin irá aprovar em breve.`,
      );
      setCodigoRacha("");
    } catch (err: any) {
      setErroVinculo(err.message);
    } finally {
      setVinculando(false);
    }
  }

  async function handleSairDaConta() {
    setSaindo(true);
    await signOut();
    router.push("/login");
  }

  function acessarRacha(codigo: string) {
    router.push(`/racha/${codigo}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Carregando perfil...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-start p-4 pt-10 gap-6">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="RachaApp" className="h-10 w-auto" />
          <div>
            <p className="text-white font-bold text-sm">Meu Perfil</p>
            <p className="text-gray-500 text-xs truncate max-w-[180px]">
              {userEmail}
            </p>
          </div>
        </div>
        <button
          onClick={handleSairDaConta}
          disabled={saindo}
          className="text-gray-500 hover:text-red-400 text-xs transition-colors disabled:opacity-50"
        >
          {saindo ? "Saindo..." : "Sair →"}
        </button>
      </div>

      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Meus Rachas */}
        <div className="flex flex-col gap-2">
          <p className="text-gray-500 text-xs font-semibold px-1">
            ⚽ Meus rachas
          </p>

          {jogadores.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-6 text-center">
              <p className="text-gray-400 text-sm font-semibold">
                Nenhum racha vinculado
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Solicite vínculo abaixo ou peça ao admin do seu racha para
                cadastrar seu email.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {jogadores.map((j) => (
                <div
                  key={j.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 flex items-center gap-3"
                >
                  {/* Foto */}
                  <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {j.foto_url ? (
                      <img
                        src={j.foto_url}
                        alt={j.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 text-xl">👤</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{j.nome}</p>
                    <p className="text-gray-500 text-xs">{j.posicao}</p>
                    {j.racha && (
                      <p className="text-green-500 text-xs font-mono mt-0.5">
                        {j.racha.nome}
                      </p>
                    )}
                  </div>

                  {/* Botão */}
                  <button
                    onClick={() => acessarRacha(j.racha?.codigo ?? "")}
                    className="bg-green-500 hover:bg-green-400 text-black font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex-shrink-0"
                  >
                    Acessar →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Solicitar vínculo */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-white font-bold text-sm">Entrar em um racha</p>
            <p className="text-gray-500 text-xs mt-1">
              Informe o código do racha para solicitar vínculo. O admin
              precisará aprovar.
            </p>
          </div>

          <form
            onSubmit={handleSolicitarVinculo}
            className="flex flex-col gap-3"
          >
            <input
              type="text"
              placeholder="Código do racha (ex: RACHA01)"
              value={codigoRacha}
              onChange={(e) => setCodigoRacha(e.target.value.toUpperCase())}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors uppercase font-mono tracking-widest"
            />
            {erroVinculo && (
              <p className="text-red-400 text-xs">{erroVinculo}</p>
            )}
            {sucessoVinculo && (
              <p className="text-green-400 text-xs">{sucessoVinculo}</p>
            )}
            <button
              type="submit"
              disabled={vinculando}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition-colors text-sm"
            >
              {vinculando ? "Enviando pedido..." : "Solicitar vínculo"}
            </button>
          </form>

          <div className="pt-2 border-t border-gray-800">
            <p className="text-gray-600 text-xs text-center">
              Não sabe o código? Peça ao administrador do seu racha.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
