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
    <div className="flex flex-col items-center" style={{ width: 56 }}>
      {/* Foto grande com borda colorida */}
      <div
        style={{
          width: 52,
          height: 64,
          borderRadius: 10,
          overflow: "hidden",
          border: `2px solid ${cor}`,
          flexShrink: 0,
          boxShadow: `0 0 10px ${cor}55`,
        }}
      >
        {jogador.foto_url ? (
          <img
            src={jogador.foto_url}
            alt={jogador.nome}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(160deg, ${cor}30, ${cor}15)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: cor, fontSize: 22, fontWeight: 900 }}>
              {jogador.nome.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Nome */}
      <span
        style={{
          color: "#fff",
          fontSize: 9,
          fontWeight: 700,
          marginTop: 4,
          maxWidth: 56,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.2,
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
        className="py-2.5 text-center font-black text-white text-sm sticky top-0 z-10"
        style={{ background: corBg, borderBottom: `2px solid ${cor}60` }}
      >
        {nome}
        <span className="ml-1 text-xs opacity-60">({totalJogadores})</span>
      </div>

      {/* Linhas por posição */}
      <div className="flex flex-col flex-1" style={{ background: "#14532d" }}>
        {POSICOES.map((posicao, idx) => {
          const lista = porPosicao[posicao];
          return (
            <div
              key={posicao}
              style={{
                borderBottom:
                  idx < POSICOES.length - 1
                    ? "1px dashed rgba(255,255,255,0.08)"
                    : "none",
                minHeight: 100,
                padding: "10px 6px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {/* Label de posição */}
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  color: cor,
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                {POSICAO_LABEL[posicao]}
              </span>

              {lista.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}
                  >
                    —
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {lista.map((j) => (
                    <Avatar key={j.id} jogador={j} cor={cor} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Outros */}
        {porPosicao["Outros"].length > 0 && (
          <div
            style={{
              padding: "10px 6px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: cor,
                opacity: 0.7,
                textAlign: "center",
              }}
            >
              OUT
            </span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 6,
              }}
            >
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
          className="flex-shrink-0 flex items-center justify-center"
          style={{ width: 20, background: "#166534" }}
        >
          <div
            style={{
              width: 1,
              height: "100%",
              background: "rgba(255,255,255,0.15)",
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
