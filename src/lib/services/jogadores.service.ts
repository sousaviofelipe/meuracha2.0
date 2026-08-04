import { dbToggleBloqueioJogador } from "@/lib/db/presencas.db";
import {
  dbListarJogadores,
  dbCriarJogador,
  dbEditarJogador,
  dbToggleJogador,
  dbDeletarJogador,
  uploadFotoJogador,
  dbToggleMensalista,
  dbBuscarJogadorPorUserId,
  dbBuscarJogadorPorEmail,
  dbVincularJogadorManualmente,
  dbDesvincularJogador,
  dbListarVinculosPendentes,
  dbAprovarVinculo,
  dbRejeitarVinculo,
} from "@/lib/db/jogadores.db";
import { Jogador, Posicao, VinculoPendente } from "@/types";

export async function listarJogadores(rachaId: string): Promise<Jogador[]> {
  return dbListarJogadores(rachaId);
}

export async function criarJogador(
  rachaId: string,
  nome: string,
  posicao: Posicao,
  foto?: File,
  email?: string,
): Promise<Jogador> {
  const jogador = await dbCriarJogador(
    rachaId,
    nome,
    posicao,
    undefined,
    email,
  );
  if (foto) {
    const fotoUrl = await uploadFotoJogador(foto, jogador.id);
    return dbEditarJogador(jogador.id, nome, posicao, fotoUrl, email);
  }
  return jogador;
}

export async function editarJogador(
  id: string,
  nome: string,
  posicao: Posicao,
  foto?: File,
  fotoAtual?: string,
  email?: string,
): Promise<Jogador> {
  if (foto) {
    const fotoUrl = await uploadFotoJogador(foto, id);
    return dbEditarJogador(id, nome, posicao, fotoUrl, email);
  }
  return dbEditarJogador(id, nome, posicao, fotoAtual, email);
}

export async function toggleJogador(id: string, ativo: boolean): Promise<void> {
  return dbToggleJogador(id, ativo);
}

export async function deletarJogador(id: string): Promise<void> {
  return dbDeletarJogador(id);
}

export async function toggleMensalista(
  id: string,
  mensalista: boolean,
): Promise<void> {
  return dbToggleMensalista(id, mensalista);
}

export async function toggleBloqueio(
  id: string,
  bloqueado: boolean,
): Promise<void> {
  return dbToggleBloqueioJogador(id, bloqueado);
}
export async function buscarJogadoresPorUserId(
  userId: string,
): Promise<Jogador[]> {
  return dbBuscarJogadorPorUserId(userId);
}

export async function buscarJogadorPorEmail(
  email: string,
  rachaId: string,
): Promise<Jogador | null> {
  return dbBuscarJogadorPorEmail(email, rachaId);
}

export async function vincularJogador(
  jogadorId: string,
  userId: string,
): Promise<void> {
  return dbVincularJogadorManualmente(jogadorId, userId);
}

export async function desvincularJogador(jogadorId: string): Promise<void> {
  return dbDesvincularJogador(jogadorId);
}

export async function listarVinculosPendentes(
  rachaId: string,
): Promise<VinculoPendente[]> {
  return dbListarVinculosPendentes(rachaId);
}

export async function aprovarVinculo(
  vinculoId: string,
  jogadorId: string,
  userId: string,
): Promise<void> {
  return dbAprovarVinculo(vinculoId, jogadorId, userId);
}

export async function rejeitarVinculo(vinculoId: string): Promise<void> {
  return dbRejeitarVinculo(vinculoId);
}
