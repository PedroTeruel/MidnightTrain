const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000';

const DIAS_POR_PERIODO = {
  '7d': '7',
  '28d': '28',
  '90d': '90',
};

const ROTULOS_TIPO_MOV = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  INTERNA: 'Interna',
};

async function consultar(caminho, token) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (resposta.status === 401) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);
  }

  return dados;
}

function formatarDiaCurto(isoDia) {
  if (!isoDia || typeof isoDia !== 'string') return '';
  const partes = isoDia.split('-');
  if (partes.length < 3) return isoDia;
  return `${partes[2]}/${partes[1]}`;
}

function formatarRotaMovimentacao(m) {
  const origem = m.origemPatio ? `${m.origemPatio} · Setor ${m.origemSetor}` : null;
  const destino = m.destinoPatio ? `${m.destinoPatio} · Setor ${m.destinoSetor}` : null;

  if (m.tipo === 'ENTRADA') {
    return destino ? `Entrada → ${destino}` : 'Entrada em estoque';
  }
  if (m.tipo === 'SAIDA') {
    return origem ? `${origem} → Saída` : 'Saída do estoque';
  }
  return `${origem || 'Origem'} → ${destino || 'Destino'}`;
}

function normalizarDashboard(bruto, periodo) {
  const resumo = bruto?.resumo || {};
  const condicoesObj = bruto?.condicoes || {};
  const aprovacaoObj = bruto?.aprovacaoLotes || {};
  const idadeObj = bruto?.idadeAtualizacao || {};
  const porLoteBruto = bruto?.porLote || [];

  // Agrupa dormentes por Pátio + Setor para o widget "Dormentes por local"
  const mapaLocais = new Map();
  for (const l of porLoteBruto) {
    const patio = l.patio || 'Sem pátio';
    const setor = l.setor || '—';
    const chave = `${patio}|${setor}`;
    const atual = mapaLocais.get(chave) || { patio, setor, n: 0 };
    atual.n += Number(l.total || 0);
    mapaLocais.set(chave, atual);
  }

  const serieMov = (bruto?.movimentacoesPeriodo || []).map(item => ({
    rotulo: formatarDiaCurto(item.dia),
    ini: item.dia,
    total: Number(item.total || 0),
    Entrada: Number(item.ENTRADA || 0),
    'Saída': Number(item.SAIDA || 0),
    Interna: Number(item.INTERNA || 0),
  }));

  const totalMov = serieMov.reduce((acc, item) => acc + item.total, 0);

  return {
    periodo,
    total: Number(resumo.totalDormentes || 0),
    condicoes: [
      { nome: 'Não avaliada', n: Number(condicoesObj.NaoAvaliada || 0) },
      { nome: 'Boa', n: Number(condicoesObj.Boa || 0) },
      { nome: 'Atenção', n: Number(condicoesObj.Atencao || 0) },
      { nome: 'Ruim', n: Number(condicoesObj.Ruim || 0) },
    ],
    condicoesMapa: condicoesObj,
    avaliados: {
      pct: Number(resumo.percentualAvaliados || 0),
      variacao: null,
      n: Number(resumo.avaliados || 0),
      total: Number(resumo.totalDormentes || 0),
    },
    perdas: {
      taxa: Number(resumo.taxaPerdas || 0),
      variacao: null,
      n: Number(resumo.extraviados || 0),
      total: Number(resumo.totalDormentes || 0),
    },
    localizacao: {
      segundos: resumo.tempoLocalizacaoSegundos ?? null,
      variacao: null,
    },
    eficiencia: {
      pct: resumo.eficienciaOperacional ?? null,
      variacao: null,
    },
    lotes: {
      total: Number(aprovacaoObj.total ?? resumo.totalLotes ?? 0),
      pendentes: Number(aprovacaoObj.Pendente || 0),
    },
    listaLotes: bruto?.lotes || [],
    movimentacoes: {
      serie: serieMov,
      total: totalMov,
      variacao: null,
    },
    condicaoPorLote: porLoteBruto.map(l => ({
      chave: l.chave,
      id: l.id,
      aprovacao: l.condicao || 'Pendente',
      total: Number(l.total || 0),
      'Não avaliada': Number(l.NaoAvaliada || 0),
      Boa: Number(l.Boa || 0),
      'Atenção': Number(l.Atencao || 0),
      Ruim: Number(l.Ruim || 0),
    })),
    aprovacao: [
      { nome: 'Aprovado', n: Number(aprovacaoObj.Aprovado || 0) },
      { nome: 'Pendente', n: Number(aprovacaoObj.Pendente || 0) },
      { nome: 'Reprovado', n: Number(aprovacaoObj.Reprovado || 0) },
    ],
    locais: Array.from(mapaLocais.values()),
    especies: (bruto?.porEspecie || []).map(e => ({
      nome: e.especie || 'Não informada',
      n: Number(e.total || 0),
    })),
    idade: [
      { nome: 'Até 7 dias', rotulo: '≤ 7d', n: Number(idadeObj.ate7 || 0), filtro: { idade: 'ate7' } },
      { nome: '8 a 30 dias', rotulo: '8–30d', n: Number(idadeObj.de8a30 || 0), filtro: { idade: '8a30' } },
      { nome: '31 a 90 dias', rotulo: '31–90d', n: Number(idadeObj.de31a90 || 0), filtro: { idade: '31a90' } },
      { nome: 'Acima de 90 dias', rotulo: '> 90d', n: Number(idadeObj.acima90 || 0), filtro: { idade: 'acima90' } },
    ],
    recentes: (bruto?.ultimasMovimentacoes || []).map(m => ({
      id: m.id,
      tipo: ROTULOS_TIPO_MOV[m.tipo] || 'Interna',
      nome: m.dormenteNome || 'Dormente',
      rota: formatarRotaMovimentacao(m),
      dataHora: m.concluida_em,
    })),
    resumo,
    aprovacaoLotes: aprovacaoObj,
    porPatio: bruto?.porPatio || [],
    porLote: porLoteBruto,
    alertas: bruto?.alertas || {},
  };
}

export async function carregarResumoDashboardApi(token) {
  return consultar('/dashboard/resumo', token);
}

export async function carregarPatiosDashboardApi(token) {
  return consultar('/dashboard/patios', token);
}

export async function carregarDadosDashboardApi(
  token,
  periodo = '7d',
  patio = null
) {
  const dias = DIAS_POR_PERIODO[periodo] || '30';
  const parametros = new URLSearchParams({ dias });

  if (patio) {
    parametros.set('patio', patio);
  }

  const bruto = await consultar(`/dashboard/dados?${parametros.toString()}`, token);
  return normalizarDashboard(bruto, periodo);
}

export async function carregarDormentesDashboardApi(token, filtros = {}) {
  const parametros = new URLSearchParams();

  if (filtros.cond) parametros.set('cond', filtros.cond);
  if (filtros.lote != null) parametros.set('lote', String(filtros.lote));
  if (filtros.patio) parametros.set('patio', filtros.patio);
  if (filtros.idade) parametros.set('idade', filtros.idade);

  const query = parametros.toString();
  return consultar(`/dormentes${query ? `?${query}` : ''}`, token);
}

export async function gerarSeedDashboardApi(token) {
  const resposta = await fetch(`${API_URL}/dashboard/seed`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(dados?.mensagem || 'Erro ao gerar exemplo.');
  return dados;
}

export async function removerSeedDashboardApi(token) {
  const resposta = await fetch(`${API_URL}/dashboard/seed`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(dados?.mensagem || 'Erro ao remover exemplo.');
  return dados;
}