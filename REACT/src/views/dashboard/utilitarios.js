export const PERIODOS = {
  '7 dias': {
    dias: 7,
    balde: 1,
    texto: 'nos últimos 7 dias',
  },
  '4 semanas': {
    dias: 28,
    balde: 7,
    texto: 'nas últimas 4 semanas',
  },
  '3 meses': {
    dias: 90,
    balde: 30,
    texto: 'nos últimos 3 meses',
  },
};

export function topLotesPorCondicao(porLote, condicao, limite = 5) {
  const ordenados = porLote
    .filter(lote => (lote[condicao] ?? 0) > 0)
    .sort((a, b) => b[condicao] - a[condicao]);

  return {
    linhas: ordenados.slice(0, limite),
    restantes: ordenados.length - limite,
  };
}