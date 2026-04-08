import {
  dbListarEnquetes,
  dbCriarEnqueteTexto,
  dbCriarEnqueteJogador,
  dbToggleEnquete,
  dbDeletarEnquete,
  dbVotar,
  dbDesvotarOpcao,
} from "@/lib/db/enquetes.db";
import { Enquete } from "@/types";

export async function listarEnquetes(rachaId: string): Promise<Enquete[]> {
  return dbListarEnquetes(rachaId);
}

export async function criarEnqueteTexto(
  rachaId: string,
  pergunta: string,
  opcoes: string[],
): Promise<Enquete> {
  return dbCriarEnqueteTexto(rachaId, pergunta, opcoes);
}

export async function criarEnqueteJogador(
  rachaId: string,
  pergunta: string,
  jogadorIds: string[],
): Promise<Enquete> {
  return dbCriarEnqueteJogador(rachaId, pergunta, jogadorIds);
}

export async function toggleEnquete(id: string, ativa: boolean): Promise<void> {
  return dbToggleEnquete(id, ativa);
}

export async function deletarEnquete(id: string): Promise<void> {
  return dbDeletarEnquete(id);
}

export async function votar(opcaoId: string): Promise<void> {
  return dbVotar(opcaoId);
}

export async function desvotarOpcao(opcaoId: string): Promise<void> {
  return dbDesvotarOpcao(opcaoId);
}
