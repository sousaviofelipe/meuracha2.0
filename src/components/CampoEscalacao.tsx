"use client";

import { Jogador, Escalacao } from "@/types";

interface Props {
  escalacao: Escalacao;
  jogadores: Jogador[];
}

function Avatar({ jogador, cor }: { jogador?: Jogador; cor: string }) {
  if (!jogador) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="rounded-full overflow-hidden border-2 flex-shrink-0"
        style={{ width: 36, height: 36, borderColor: cor }}
      >
        {jogador.foto_url ? (
          <img
            src={jogador.foto_url}
            alt={jogador.nome}
            style={{
              width: 36,
              height: 36,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: cor + "40" }}
          >
            {jogador.nome.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <span
        className="text-white text-center font-medium leading-tight"
        style={{
          fontSize: 9,
          maxWidth: 44,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {jogador.nome.split(" ")[0]}
      </span>
    </div>
  );
}

function LinhaJogadores({
  jogadores,
  cor,
}: {
  jogadores: (Jogador | undefined)[];
  cor: string;
}) {
  const validos = jogadores.filter(Boolean);
  if (validos.length === 0) return null;
  return (
    <div className="flex items-center justify-around w-full px-2">
      {validos.map((j, i) => (
        <Avatar key={i} jogador={j} cor={cor} />
      ))}
    </div>
  );
}

export default function CampoEscalacao({ escalacao, jogadores }: Props) {
  const findJogador = (id: string) => jogadores.find((j) => j.id === id);

  // Separa por posição para cada time
  function distribuirPorPosicao(ids: string[]) {
    const js = ids.map((id) => findJogador(id)).filter(Boolean) as Jogador[];
    return {
      goleiros: js.filter((j) => j.posicao === "Goleiro"),
      defensores: js.filter((j) => j.posicao === "Defensor"),
      meios: js.filter((j) => j.posicao === "Meio-campo"),
      atacantes: js.filter((j) => j.posicao === "Atacante"),
      // Jogadores sem posição específica
      outros: js.filter(
        (j) =>
          !["Goleiro", "Defensor", "Meio-campo", "Atacante"].includes(
            j.posicao,
          ),
      ),
    };
  }

  // Distribui jogadores sem posição nas linhas
  function distribuirSemPosicao(ids: string[]) {
    const js = ids.map((id) => findJogador(id)).filter(Boolean) as Jogador[];
    const total = js.length;
    if (total === 0) return { linha1: [], linha2: [], linha3: [], goleiro: [] };

    const goleiros = js.filter((j) => j.posicao === "Goleiro");
    const resto = js.filter((j) => j.posicao !== "Goleiro");

    // Divide o resto em 3 linhas
    const porLinha = Math.ceil(resto.length / 3);
    return {
      goleiro: goleiros.length > 0 ? goleiros : resto.slice(0, 1),
      linha1: resto.slice(0, porLinha),
      linha2: resto.slice(porLinha, porLinha * 2),
      linha3: resto.slice(porLinha * 2),
    };
  }

  const timeA = distribuirSemPosicao(escalacao.jogadores_time_a);
  const timeB = distribuirSemPosicao(escalacao.jogadores_time_b);

  const COR_A = "#22c55e"; // verde
  const COR_B = "#f97316"; // laranja

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: "#166534", border: "2px solid #15803d" }}
    >
      {/* Times header */}
      <div className="grid grid-cols-2">
        <div className="py-2 text-center" style={{ background: COR_A + "30" }}>
          <span className="text-white font-black text-sm">
            {escalacao.nome_time_a}
          </span>
        </div>
        <div className="py-2 text-center" style={{ background: COR_B + "30" }}>
          <span className="text-white font-black text-sm">
            {escalacao.nome_time_b}
          </span>
        </div>
      </div>

      {/* Campo */}
      <div className="relative flex flex-col" style={{ minHeight: 380 }}>
        {/* Linhas do campo */}
        <div
          className="absolute inset-0 flex flex-col pointer-events-none"
          style={{ opacity: 0.15 }}
        >
          <div className="flex-1" />
          <div style={{ height: 1, background: "white", margin: "0 20px" }} />
          <div className="flex-1" />
        </div>

        {/* Círculo central */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        />

        {/* Time A — lado de cima */}
        <div className="flex flex-col gap-3 pt-4 pb-2" style={{ flex: 1 }}>
          <LinhaJogadores jogadores={timeA.linha3} cor={COR_A} />
          <LinhaJogadores jogadores={timeA.linha2} cor={COR_A} />
          <LinhaJogadores jogadores={timeA.linha1} cor={COR_A} />
          <LinhaJogadores jogadores={timeA.goleiro} cor={COR_A} />
        </div>

        {/* Linha do meio */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.3)",
            margin: "0 16px",
          }}
        />

        {/* Time B — lado de baixo */}
        <div className="flex flex-col gap-3 pt-2 pb-4" style={{ flex: 1 }}>
          <LinhaJogadores jogadores={timeB.goleiro} cor={COR_B} />
          <LinhaJogadores jogadores={timeB.linha1} cor={COR_B} />
          <LinhaJogadores jogadores={timeB.linha2} cor={COR_B} />
          <LinhaJogadores jogadores={timeB.linha3} cor={COR_B} />
        </div>
      </div>
    </div>
  );
}
