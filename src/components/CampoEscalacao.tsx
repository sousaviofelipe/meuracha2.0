"use client";

import { Jogador, Escalacao } from "@/types";

interface Props {
  escalacao: Escalacao;
  jogadores: Jogador[];
}

const POSICOES = ["Goleiro", "Defensor", "Meio-campo", "Atacante"] as const;
const POSICAO_LABEL: Record<string, string> = {
  Goleiro: "GOL",
  Defensor: "DEF",
  "Meio-campo": "MEI",
  Atacante: "ATA",
};

function Avatar({ jogador, cor }: { jogador: Jogador; cor: string }) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 44 }}>
      <div
        className="rounded-full overflow-hidden border-2 flex-shrink-0"
        style={{ width: 38, height: 38, borderColor: cor }}
      >
        {jogador.foto_url ? (
          <img
            src={jogador.foto_url}
            alt={jogador.nome}
            style={{
              width: 38,
              height: 38,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white text-sm font-black"
            style={{ background: cor + "40" }}
          >
            {jogador.nome.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <span
        className="text-white font-medium text-center leading-tight"
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

function ColunaTime({
  nome,
  ids,
  jogadores,
  cor,
  corBg,
}: {
  nome: string;
  ids: string[];
  jogadores: Jogador[];
  cor: string;
  corBg: string;
}) {
  const findJogador = (id: string) => jogadores.find((j) => j.id === id);

  const porPosicao: Record<string, Jogador[]> = {
    Goleiro: [],
    Defensor: [],
    "Meio-campo": [],
    Atacante: [],
    Outros: [],
  };

  ids.forEach((id) => {
    const j = findJogador(id);
    if (!j) return;
    if (porPosicao[j.posicao] !== undefined) {
      porPosicao[j.posicao].push(j);
    } else {
      porPosicao["Outros"].push(j);
    }
  });

  const totalJogadores = ids
    .map((id) => findJogador(id))
    .filter(Boolean).length;

  return (
    <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
      {/* Header do time */}
      <div
        className="py-2.5 text-center font-black text-white text-sm sticky top-0"
        style={{ background: corBg }}
      >
        {nome}
        <span className="ml-1 text-xs opacity-70">({totalJogadores})</span>
      </div>

      {/* Linhas por posição */}
      <div className="flex flex-col flex-1" style={{ background: "#14532d" }}>
        {POSICOES.map((posicao, idx) => {
          const lista = porPosicao[posicao];
          return (
            <div
              key={posicao}
              className="flex flex-col gap-2 py-3 px-2"
              style={{
                borderBottom:
                  idx < POSICOES.length - 1
                    ? "1px dashed rgba(255,255,255,0.1)"
                    : "none",
                minHeight: 80,
              }}
            >
              <span
                className="font-bold tracking-widest text-center"
                style={{ fontSize: 9, color: cor, opacity: 0.8 }}
              >
                {POSICAO_LABEL[posicao]}
              </span>
              {lista.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span
                    style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}
                  >
                    —
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  {lista.map((j) => (
                    <Avatar key={j.id} jogador={j} cor={cor} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Outros (sem posição padrão) */}
        {porPosicao["Outros"].length > 0 && (
          <div className="flex flex-col gap-2 py-3 px-2">
            <span
              className="font-bold tracking-widest text-center"
              style={{ fontSize: 9, color: cor, opacity: 0.8 }}
            >
              OUT
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {porPosicao["Outros"].map((j) => (
                <Avatar key={j.id} jogador={j} cor={cor} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CampoEscalacao({ escalacao, jogadores }: Props) {
  const COR_A = "#22c55e";
  const COR_B = "#f97316";

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-green-900">
      <div className="flex" style={{ minHeight: 400 }}>
        {/* Time A */}
        <ColunaTime
          nome={escalacao.nome_time_a}
          ids={escalacao.jogadores_time_a ?? []}
          jogadores={jogadores}
          cor={COR_A}
          corBg="#15803d"
        />

        {/* Divisor central */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 24, background: "#166534" }}
        >
          <div
            style={{
              width: 1,
              height: "100%",
              background: "rgba(255,255,255,0.2)",
            }}
          />
        </div>

        {/* Time B */}
        <ColunaTime
          nome={escalacao.nome_time_b}
          ids={escalacao.jogadores_time_b ?? []}
          jogadores={jogadores}
          cor={COR_B}
          corBg="#9a3412"
        />
      </div>
    </div>
  );
}
