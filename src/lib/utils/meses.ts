export const MESES_NOMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function getMesesRecentes(
  quantidade: number,
): { mes: number; ano: number; label: string }[] {
  const resultado = [];
  const hoje = new Date();
  for (let i = quantidade - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    resultado.push({
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
      label: `${MESES_NOMES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return resultado;
}

export function calcularAtraso(
  jogadorId: string,
  pagamentos: { jogador_id: string; mes: number; ano: number; pago: boolean }[],
  meses: { mes: number; ano: number }[],
): number {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  let atraso = 0;
  meses.forEach(({ mes, ano }) => {
    // Não conta o mês atual como atraso
    if (mes === mesAtual && ano === anoAtual) return;
    const pag = pagamentos.find(
      (p) => p.jogador_id === jogadorId && p.mes === mes && p.ano === ano,
    );
    if (!pag || !pag.pago) atraso++;
  });
  return atraso;
}
