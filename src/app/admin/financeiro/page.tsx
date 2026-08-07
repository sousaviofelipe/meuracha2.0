"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/auth.service";
import { getRachaPorAdmin } from "@/lib/services/racha.service";
import {
  dbGetTodosPagamentos,
  dbConfirmarPagamento,
  dbRejeitarPagamento,
  dbTogglePagamento,
  dbGetPagamentosAguardando,
  getMesesDisponiveis,
  nomeMes,
} from "@/lib/db/financeiro.db";
import {
  dbListarGastos,
  dbCriarGasto,
  dbDeletarGasto,
  dbGetBalanco,
  CATEGORIAS_GASTO,
} from "@/lib/db/gastos.db";
import { getSupabase } from "@/lib/db/supabase";
import { Racha, Jogador, Pagamento, Gasto, CategoriaGasto } from "@/types";

type Vista = "balanco" | "mes" | "jogador" | "gastos";

export default function FinanceiroAdminPage() {
  const [gastoDia, setGastoDia] = useState(() => new Date().getDate());
  const router = useRouter();
  const [racha, setRacha] = useState<Racha | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [aguardando, setAguardando] = useState<Pagamento[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [balanco, setBalanco] = useState({
    totalArrecadado: 0,
    totalGastos: 0,
    saldo: 0,
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("balanco");

  const mesesDisponiveis = getMesesDisponiveis();
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const agora = new Date();
    return { mes: agora.getMonth() + 1, ano: agora.getFullYear() };
  });
  const [jogadorSelecionado, setJogadorSelecionado] = useState<Jogador | null>(
    null,
  );

  // Form novo gasto
  const [modalGasto, setModalGasto] = useState(false);
  const [gastoCategoria, setGastoCategoria] = useState<CategoriaGasto>("campo");
  const [gastoValor, setGastoValor] = useState("");
  const [gastoDescricao, setGastoDescricao] = useState("");
  const [gastoMes, setGastoMes] = useState(() => new Date().getMonth() + 1);
  const [gastoAno, setGastoAno] = useState(() => new Date().getFullYear());
  const [salvandoGasto, setSalvandoGasto] = useState(false);
  const [erroGasto, setErroGasto] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = await getUser();
      if (!user) return router.push("/login");
      const r = await getRachaPorAdmin(user.id);
      if (!r) return router.push("/login");
      setRacha(r);

      const [{ data: jogs }, pags, aguard, gst, bal] = await Promise.all([
        getSupabase()
          .from("jogadores")
          .select("*")
          .eq("racha_id", r.id)
          .eq("ativo", true)
          .eq("mensalista", true)
          .order("nome"),
        dbGetTodosPagamentos(r.id),
        dbGetPagamentosAguardando(r.id),
        dbListarGastos(r.id),
        dbGetBalanco(r.id),
      ]);

      setJogadores(jogs ?? []);
      setPagamentos(pags);
      setAguardando(aguard);
      setGastos(gst);
      setBalanco(bal);
      setLoading(false);
    }
    carregar();
  }, []);

  function getPagamento(
    jogadorId: string,
    mes: number,
    ano: number,
  ): Pagamento | undefined {
    return pagamentos.find(
      (p) => p.jogador_id === jogadorId && p.mes === mes && p.ano === ano,
    );
  }

  async function handleToggle(jogadorId: string, mes: number, ano: number) {
    if (!racha) return;
    const key = `${jogadorId}-${mes}-${ano}`;
    setSalvando(key);
    try {
      const atual = getPagamento(jogadorId, mes, ano);
      const novoPago = atual?.status !== "confirmado";
      await dbTogglePagamento(racha.id, jogadorId, mes, ano, novoPago);
      const mensalidade = (racha as any).mensalidade ?? 0;
      setPagamentos((prev) => {
        const existe = prev.find(
          (p) => p.jogador_id === jogadorId && p.mes === mes && p.ano === ano,
        );
        const novo: Pagamento = {
          id: existe?.id ?? crypto.randomUUID(),
          racha_id: racha.id,
          jogador_id: jogadorId,
          mes,
          ano,
          pago: novoPago,
          status: novoPago ? "confirmado" : "pendente",
          pago_em: novoPago ? new Date().toISOString() : undefined,
          criado_em: existe?.criado_em ?? new Date().toISOString(),
        };
        if (existe)
          return prev.map((p) =>
            p.jogador_id === jogadorId && p.mes === mes && p.ano === ano
              ? novo
              : p,
          );
        return [...prev, novo];
      });
      setAguardando((prev) =>
        prev.filter(
          (p) =>
            !(p.jogador_id === jogadorId && p.mes === mes && p.ano === ano),
        ),
      );
      // Atualiza balanço
      const bal = await dbGetBalanco(racha.id);
      setBalanco(bal);
    } finally {
      setSalvando(null);
    }
  }

  async function handleConfirmar(jogadorId: string, mes: number, ano: number) {
    if (!racha) return;
    const key = `${jogadorId}-${mes}-${ano}`;
    setSalvando(key);
    try {
      await dbConfirmarPagamento(racha.id, jogadorId, mes, ano);
      setPagamentos((prev) => {
        const existe = prev.find(
          (p) => p.jogador_id === jogadorId && p.mes === mes && p.ano === ano,
        );
        const novo: Pagamento = {
          id: existe?.id ?? crypto.randomUUID(),
          racha_id: racha.id,
          jogador_id: jogadorId,
          mes,
          ano,
          pago: true,
          status: "confirmado",
          pago_em: new Date().toISOString(),
          criado_em: existe?.criado_em ?? new Date().toISOString(),
        };
        if (existe)
          return prev.map((p) =>
            p.jogador_id === jogadorId && p.mes === mes && p.ano === ano
              ? novo
              : p,
          );
        return [...prev, novo];
      });
      setAguardando((prev) =>
        prev.filter(
          (p) =>
            !(p.jogador_id === jogadorId && p.mes === mes && p.ano === ano),
        ),
      );
      const bal = await dbGetBalanco(racha.id);
      setBalanco(bal);
    } finally {
      setSalvando(null);
    }
  }

  async function handleRejeitar(jogadorId: string, mes: number, ano: number) {
    if (!racha) return;
    const key = `${jogadorId}-${mes}-${ano}`;
    setSalvando(key);
    try {
      await dbRejeitarPagamento(racha.id, jogadorId, mes, ano);
      setPagamentos((prev) =>
        prev.map((p) =>
          p.jogador_id === jogadorId && p.mes === mes && p.ano === ano
            ? {
                ...p,
                pago: false,
                status: "pendente" as const,
                pago_em: undefined,
              }
            : p,
        ),
      );
      setAguardando((prev) =>
        prev.filter(
          (p) =>
            !(p.jogador_id === jogadorId && p.mes === mes && p.ano === ano),
        ),
      );
    } finally {
      setSalvando(null);
    }
  }

  async function handleCriarGasto() {
    if (!racha) return;
    const valor = parseFloat(gastoValor.replace(",", "."));
    if (isNaN(valor) || valor <= 0)
      return setErroGasto("Informe um valor válido.");
    setSalvandoGasto(true);
    setErroGasto("");
    try {
      const novo = await dbCriarGasto(
        racha.id,
        gastoCategoria,
        valor,
        gastoMes,
        gastoAno,
        gastoDescricao,
        gastoDia,
      );
      setGastos((prev) => [novo, ...prev]);
      const bal = await dbGetBalanco(racha.id);
      setBalanco(bal);
      setModalGasto(false);
      setGastoValor("");
      setGastoDescricao("");
    } catch (err: any) {
      setErroGasto(err.message);
    } finally {
      setSalvandoGasto(false);
    }
  }

  async function handleDeletarGasto(id: string) {
    if (!racha || !confirm("Excluir este gasto?")) return;
    await dbDeletarGasto(id);
    setGastos((prev) => prev.filter((g) => g.id !== id));
    const bal = await dbGetBalanco(racha.id);
    setBalanco(bal);
  }

  function getStatusBadge(status: string | undefined) {
    if (status === "confirmado")
      return {
        cor: "bg-green-500/20 text-green-400 border-green-500/30",
        label: "✓ Pago",
      };
    if (status === "aguardando")
      return {
        cor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        label: "⏳ Aguardando",
      };
    return {
      cor: "bg-gray-800 text-gray-500 border-gray-700",
      label: "Pendente",
    };
  }

  function formatReal(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const pagamentosMes = jogadores.map((j) => ({
    jogador: j,
    pagamento: getPagamento(j.id, mesSelecionado.mes, mesSelecionado.ano),
  }));
  const totalConfirmados = pagamentosMes.filter(
    (p) => p.pagamento?.status === "confirmado",
  ).length;
  const totalAguardando = pagamentosMes.filter(
    (p) => p.pagamento?.status === "aguardando",
  ).length;
  const totalPendente = pagamentosMes.filter(
    (p) => !p.pagamento || p.pagamento.status === "pendente",
  ).length;

  const pagamentosJogador = jogadorSelecionado
    ? mesesDisponiveis.map((m) => ({
        ...m,
        pagamento: getPagamento(jogadorSelecionado.id, m.mes, m.ano),
      }))
    : [];

  const gastosPorMes = gastos.reduce((acc: Record<string, Gasto[]>, g) => {
    const key = `${g.mes}-${g.ano}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

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
          <h1 className="text-2xl font-black text-white">Financeiro</h1>
          <p className="text-gray-400 text-sm">
            {jogadores.length} mensalistas
          </p>
        </div>
        {vista === "gastos" && (
          <button
            onClick={() => setModalGasto(true)}
            className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Novo gasto
          </button>
        )}
      </div>

      {/* Aguardando confirmação */}
      {aguardando.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span>⏳</span>
            <p className="text-yellow-400 font-bold text-sm">
              Aguardando confirmação ({aguardando.length})
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {aguardando.map((pg) => {
              const jogador = jogadores.find((j) => j.id === pg.jogador_id);
              const key = `${pg.jogador_id}-${pg.mes}-${pg.ano}`;
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                    {jogador?.foto_url ? (
                      <img
                        src={jogador.foto_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                        {jogador?.nome?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {jogador?.nome ?? "—"}
                    </p>
                    <p className="text-gray-500 text-xs capitalize">
                      {nomeMes(pg.mes, pg.ano)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        handleConfirmar(pg.jogador_id, pg.mes, pg.ano)
                      }
                      disabled={salvando === key}
                      className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                    >
                      {salvando === key ? "..." : "✓ Confirmar"}
                    </button>
                    <button
                      onClick={() =>
                        handleRejeitar(pg.jogador_id, pg.mes, pg.ano)
                      }
                      disabled={salvando === key}
                      className="bg-gray-700 hover:bg-red-500/20 text-gray-400 hover:text-red-400 disabled:opacity-50 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { id: "balanco", label: "📊 Balanço" },
          { id: "mes", label: "📅 Por mês" },
          { id: "jogador", label: "👤 Jogador" },
          { id: "gastos", label: "💸 Gastos" },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setVista(a.id as Vista);
              setJogadorSelecionado(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-colors ${vista === a.id ? "bg-green-500 text-black" : "bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800"}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Vista Balanço */}
      {vista === "balanco" && (
        <div className="flex flex-col gap-4">
          {/* Cards principais */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center">
              <p className="text-gray-400 text-xs font-semibold mb-1">
                Total arrecadado
              </p>
              <p className="text-green-400 font-black text-3xl">
                {formatReal(balanco.totalArrecadado)}
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-center">
              <p className="text-gray-400 text-xs font-semibold mb-1">
                Total de gastos
              </p>
              <p className="text-red-400 font-black text-3xl">
                {formatReal(balanco.totalGastos)}
              </p>
            </div>
            <div
              className={`rounded-2xl p-5 text-center border ${balanco.saldo >= 0 ? "bg-blue-500/10 border-blue-500/30" : "bg-orange-500/10 border-orange-500/30"}`}
            >
              <p className="text-gray-400 text-xs font-semibold mb-1">
                Saldo do caixa
              </p>
              <p
                className={`font-black text-3xl ${balanco.saldo >= 0 ? "text-blue-400" : "text-orange-400"}`}
              >
                {formatReal(balanco.saldo)}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {balanco.saldo >= 0 ? "✅ Caixa positivo" : "⚠️ Caixa negativo"}
              </p>
            </div>
          </div>

          {/* Resumo por mês */}
          <div>
            <p className="text-gray-500 text-xs font-semibold px-1 mb-2">
              Resumo por mês
            </p>
            <div className="flex flex-col gap-2">
              {[...mesesDisponiveis].reverse().map((m) => {
                const pagsDoMes = pagamentos.filter(
                  (p) =>
                    p.mes === m.mes &&
                    p.ano === m.ano &&
                    p.status === "confirmado",
                );
                const mensalidade = (racha as any)?.mensalidade ?? 0;
                const arrecadado = pagsDoMes.length * mensalidade;
                const gastosDoMes = gastos
                  .filter((g) => g.mes === m.mes && g.ano === m.ano)
                  .reduce((acc, g) => acc + g.valor, 0);
                const saldoMes = arrecadado - gastosDoMes;

                return (
                  <div
                    key={`${m.mes}-${m.ano}`}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold capitalize">
                        {nomeMes(m.mes, m.ano)}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {pagsDoMes.length} pagamentos ·{" "}
                        {formatReal(gastosDoMes)} em gastos
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`font-black text-sm ${saldoMes >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {formatReal(saldoMes)}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {formatReal(arrecadado)} arrecadado
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vista por mês */}
      {vista === "mes" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mesesDisponiveis.map((m) => (
              <button
                key={`${m.mes}-${m.ano}`}
                onClick={() => setMesSelecionado(m)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors capitalize ${mesSelecionado.mes === m.mes && mesSelecionado.ano === m.ano ? "bg-green-500 text-black" : "bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800"}`}
              >
                {new Date(m.ano, m.mes - 1).toLocaleDateString("pt-BR", {
                  month: "short",
                })}{" "}
                {m.ano}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <p className="text-green-400 font-black text-xl">
                {totalConfirmados}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">✓ Pagos</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
              <p className="text-yellow-400 font-black text-xl">
                {totalAguardando}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">⏳ Aguardando</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <p className="text-red-400 font-black text-xl">{totalPendente}</p>
              <p className="text-gray-500 text-xs mt-0.5">✗ Pendente</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {pagamentosMes.map(({ jogador, pagamento }) => {
              const key = `${jogador.id}-${mesSelecionado.mes}-${mesSelecionado.ano}`;
              const isSalvando = salvando === key;
              const badge = getStatusBadge(pagamento?.status);
              return (
                <div
                  key={jogador.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                    {jogador.foto_url ? (
                      <img
                        src={jogador.foto_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold">
                        {jogador.nome.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">
                      {jogador.nome}
                    </p>
                    {pagamento?.pago_em && (
                      <p className="text-gray-600 text-xs">
                        {new Date(pagamento.pago_em).toLocaleDateString(
                          "pt-BR",
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      handleToggle(
                        jogador.id,
                        mesSelecionado.mes,
                        mesSelecionado.ano,
                      )
                    }
                    disabled={isSalvando}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${badge.cor}`}
                  >
                    {isSalvando ? "..." : badge.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista por jogador */}
      {vista === "jogador" && (
        <div className="flex flex-col gap-4">
          {!jogadorSelecionado ? (
            <div className="flex flex-col gap-2">
              {jogadores.map((j) => {
                const pagamentosJ = pagamentos.filter(
                  (p) => p.jogador_id === j.id,
                );
                const atraso = mesesDisponiveis.filter((m) => {
                  const pag = pagamentosJ.find(
                    (p) => p.mes === m.mes && p.ano === m.ano,
                  );
                  return (
                    !pag ||
                    pag.status === "pendente" ||
                    pag.status === "aguardando"
                  );
                }).length;
                return (
                  <button
                    key={j.id}
                    onClick={() => setJogadorSelecionado(j)}
                    className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-gray-700 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                      {j.foto_url ? (
                        <img
                          src={j.foto_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {j.nome.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">
                        {j.nome}
                      </p>
                      <p className="text-gray-500 text-xs">{j.posicao}</p>
                    </div>
                    {atraso > 0 ? (
                      <span className="text-red-400 text-xs font-bold bg-red-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                        {atraso} em atraso
                      </span>
                    ) : (
                      <span className="text-green-400 text-xs font-bold">
                        ✓ Em dia
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setJogadorSelecionado(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ←
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                  {jogadorSelecionado.foto_url ? (
                    <img
                      src={jogadorSelecionado.foto_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold">
                      {jogadorSelecionado.nome.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white font-black">
                    {jogadorSelecionado.nome}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {jogadorSelecionado.posicao}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {pagamentosJogador.map(({ mes, ano, pagamento }) => {
                  const key = `${jogadorSelecionado.id}-${mes}-${ano}`;
                  const isSalvando = salvando === key;
                  const badge = getStatusBadge(pagamento?.status);
                  return (
                    <div
                      key={key}
                      className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm capitalize">
                          {nomeMes(mes, ano)}
                        </p>
                        {pagamento?.pago_em && (
                          <p className="text-gray-600 text-xs">
                            Pago em{" "}
                            {new Date(pagamento.pago_em).toLocaleDateString(
                              "pt-BR",
                            )}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          handleToggle(jogadorSelecionado.id, mes, ano)
                        }
                        disabled={isSalvando}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${badge.cor}`}
                      >
                        {isSalvando ? "..." : badge.label}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista gastos */}
      {vista === "gastos" && (
        <div className="flex flex-col gap-4">
          {gastos.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="text-4xl mb-3">💸</p>
              <p>Nenhum gasto registrado</p>
              <p className="text-sm mt-1">
                Clique em "+ Novo gasto" para adicionar
              </p>
            </div>
          ) : (
            Object.entries(gastosPorMes)
              .sort(([a], [b]) => {
                const [aMes, aAno] = a.split("-").map(Number);
                const [bMes, bAno] = b.split("-").map(Number);
                return bAno !== aAno ? bAno - aAno : bMes - aMes;
              })
              .map(([key, gastosDoMes]) => {
                const [mes, ano] = key.split("-").map(Number);
                const totalMes = gastosDoMes.reduce(
                  (acc, g) => acc + g.valor,
                  0,
                );
                return (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-gray-400 text-xs font-semibold capitalize">
                        {nomeMes(mes, ano)}
                      </p>
                      <p className="text-red-400 text-xs font-bold">
                        {formatReal(totalMes)}
                      </p>
                    </div>
                    {gastosDoMes.map((g) => (
                      <div
                        key={g.id}
                        className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 text-lg">
                          {CATEGORIAS_GASTO[g.categoria].split(" ")[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold">
                            {CATEGORIAS_GASTO[g.categoria]
                              .split(" ")
                              .slice(1)
                              .join(" ")}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {g.dia
                              ? `Dia ${g.dia}${g.descricao ? ` · ${g.descricao}` : ""}`
                              : g.descricao}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-red-400 font-bold text-sm">
                            {formatReal(g.valor)}
                          </p>
                          <button
                            onClick={() => handleDeletarGasto(g.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* Modal novo gasto */}
      {modalGasto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
          onClick={() => setModalGasto(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black">Novo gasto</h2>
              <button
                onClick={() => setModalGasto(false)}
                className="text-gray-500 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Categoria */}
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORIAS_GASTO) as CategoriaGasto[]).map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setGastoCategoria(cat)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${gastoCategoria === cat ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                  >
                    {CATEGORIAS_GASTO[cat]}
                  </button>
                ),
              )}
            </div>

            {/* Valor */}
            <input
              type="text"
              inputMode="decimal"
              placeholder="Valor (ex: 200,00)"
              value={gastoValor}
              onChange={(e) => setGastoValor(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />

            {/* Descrição */}
            <input
              type="text"
              placeholder="Observação (opcional)"
              value={gastoDescricao}
              onChange={(e) => setGastoDescricao(e.target.value)}
              maxLength={100}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />

            {/* Dia/Mês/Ano */}
            <div className="flex gap-2">
              <select
                value={gastoDia}
                onChange={(e) => setGastoDia(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={gastoMes}
                onChange={(e) => setGastoMes(Number(e.target.value))}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleDateString("pt-BR", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
              <select
                value={gastoAno}
                onChange={(e) => setGastoAno(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
              >
                {[2026, 2027, 2028].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {erroGasto && <p className="text-red-400 text-sm">{erroGasto}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setModalGasto(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarGasto}
                disabled={salvandoGasto}
                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold transition-colors"
              >
                {salvandoGasto ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
