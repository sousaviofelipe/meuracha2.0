import {
  dbListarNotificacoes,
  dbCriarNotificacao,
  dbEditarNotificacao,
  dbToggleNotificacao,
  dbDeletarNotificacao,
} from "@/lib/db/notificacoes.db";
import { Notificacao } from "@/types";

export async function listarNotificacoes(
  rachaId: string,
): Promise<Notificacao[]> {
  return dbListarNotificacoes(rachaId);
}

export async function criarNotificacao(
  rachaId: string,
  titulo: string,
  mensagem: string,
): Promise<Notificacao> {
  return dbCriarNotificacao(rachaId, titulo, mensagem);
}

export async function editarNotificacao(
  id: string,
  titulo: string,
  mensagem: string,
): Promise<Notificacao> {
  return dbEditarNotificacao(id, titulo, mensagem);
}

export async function toggleNotificacao(
  id: string,
  ativa: boolean,
): Promise<void> {
  return dbToggleNotificacao(id, ativa);
}

export async function deletarNotificacao(id: string): Promise<void> {
  return dbDeletarNotificacao(id);
}
