import {
  dbListarAvaliacoesDoJogador,
  dbBuscarAvaliacaoDoUsuario,
  dbSalvarAvaliacao,
  dbListarJogadoresComNivel,
  dbListarAvaliacoesDoAvaliador,
  dbListarTotalPartidas,
} from "@/lib/db/avaliacoes.db";
import { Avaliacao, JogadorComNivel, EscalacaoGerada, Posicao } from "@/types";

export async function salvarAvaliacao(
  rachaId: string,
  avaliadorId: string,
  jogadorId: string,
  nota: number,
): Promise<Avaliacao> {
  if (avaliadorId === jogadorId) {
    throw new Error("Você não pode avaliar a si mesmo.");
  }
  if (nota < 0 || nota > 10) {
    throw new Error("A nota deve ser entre 0 e 10.");
  }
  const notaArredondada = Math.round(nota * 10) / 10;
  return dbSalvarAvaliacao(rachaId, avaliadorId, jogadorId, notaArredondada);
}

export async function buscarAvaliacaoDoUsuario(
  avaliadorId: string,
  jogadorId: string,
): Promise<Avaliacao | null> {
  return dbBuscarAvaliacaoDoUsuario(avaliadorId, jogadorId);
}

export async function listarJogadoresComNivel(
  rachaId: string,
  avaliadorId?: string,
): Promise<JogadorComNivel[]> {
  const [jogadores, totalPartidas, avaliacoesDoAvaliador] = await Promise.all([
    dbListarJogadoresComNivel(rachaId),
    dbListarTotalPartidas(rachaId),
    avaliadorId
      ? dbListarAvaliacoesDoAvaliador(avaliadorId, rachaId)
      : Promise.resolve([]),
  ]);

  return jogadores.map((j: any) => ({
    ...j,
    total_partidas:
      totalPartidas.find((p) => p.jogador_id === j.id)?.total_partidas ?? 0,
    avaliacao_do_usuario:
      avaliacoesDoAvaliador.find((a) => a.jogador_id === j.id)?.nota ?? null,
  }));
}

// Algoritmo de sorteio por posição e nível
export function sortearTimes(
  jogadores: JogadorComNivel[],
  nomeTimeA: string,
  nomeTimeB: string,
): EscalacaoGerada {
  const ORDEM_POSICOES: Posicao[] = [
    "Goleiro",
    "Defensor",
    "Meio-campo",
    "Atacante",
  ];

  const timeA: JogadorComNivel[] = [];
  const timeB: JogadorComNivel[] = [];

  for (const posicao of ORDEM_POSICOES) {
    const doGrupo = jogadores
      .filter((j) => j.posicao === posicao)
      .sort((a, b) => {
        // 1º critério: nível médio (maior primeiro)
        const nivelA = a.nivel_medio ?? 5;
        const nivelB = b.nivel_medio ?? 5;
        if (nivelB !== nivelA) return nivelB - nivelA;
        // 2º critério: total de partidas (menor primeiro — quem jogou menos vai primeiro)
        const partA = a.total_partidas ?? 0;
        const partB = b.total_partidas ?? 0;
        return partA - partB;
      });

    // Distribui alternadamente entre os times
    // Considera o tamanho atual dos times para balancear
    doGrupo.forEach((jogador, index) => {
      const tamanhoA = timeA.length;
      const tamanhoB = timeB.length;

      if (tamanhoA <= tamanhoB) {
        timeA.push(jogador);
      } else {
        timeB.push(jogador);
      }
    });
  }

  return {
    time_a: timeA,
    time_b: timeB,
    nome_time_a: nomeTimeA,
    nome_time_b: nomeTimeB,
  };
}
