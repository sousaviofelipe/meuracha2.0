import {
  dbListarEnquetes,
  dbCriarEnquete,
  dbToggleEnquete,
  dbDeletarEnquete,
  dbVotar,
} from "@/lib/db/enquetes.db";
import { Enquete } from "@/types";

export async function listarEnquetes(rachaId: string): Promise<Enquete[]> {
  return dbListarEnquetes(rachaId);
}

export async function criarEnquete(
  rachaId: string,
  pergunta: string,
  opcoes: string[],
): Promise<Enquete> {
  return dbCriarEnquete(rachaId, pergunta, opcoes);
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
