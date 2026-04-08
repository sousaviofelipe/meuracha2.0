import {
  dbListarJogadores,
  dbCriarJogador,
  dbEditarJogador,
  dbToggleJogador,
  dbDeletarJogador,
  uploadFotoJogador,
  dbToggleMensalista,
} from "@/lib/db/jogadores.db";
import { Jogador, Posicao } from "@/types";

export async function listarJogadores(rachaId: string): Promise<Jogador[]> {
  return dbListarJogadores(rachaId);
}

export async function criarJogador(
  rachaId: string,
  nome: string,
  posicao: Posicao,
  foto?: File,
): Promise<Jogador> {
  const jogador = await dbCriarJogador(rachaId, nome, posicao);
  if (foto) {
    const fotoUrl = await uploadFotoJogador(foto, jogador.id);
    return dbEditarJogador(jogador.id, nome, posicao, fotoUrl);
  }
  return jogador;
}

export async function editarJogador(
  id: string,
  nome: string,
  posicao: Posicao,
  foto?: File,
  fotoAtual?: string,
): Promise<Jogador> {
  if (foto) {
    const fotoUrl = await uploadFotoJogador(foto, id);
    return dbEditarJogador(id, nome, posicao, fotoUrl);
  }
  return dbEditarJogador(id, nome, posicao, fotoAtual);
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
