// Consultas agregadas do dashboard. Nada aqui carrega o estoque inteiro na memória.
export const PERIODOS = {
  '7 dias': { dias: 7, balde: 1, texto: 'nos últimos 7 dias' },
  '4 semanas': { dias: 28, balde: 7, texto: 'nas últimas 4 semanas' },
  '3 meses': { dias: 90, balde: 30, texto: 'nos últimos 3 meses' },
};
export const DIA = 86400000;
export const condicoes = ['Não avaliada', 'Boa', 'Atenção', 'Ruim'];
export const filtrosDormentes = ['todas', 'nao', 'boa', 'atencao', 'ruim', 'parados', 'extraviados'];
const condicaoDoFiltro = { nao: 'Não avaliada', boa: 'Boa', atencao: 'Atenção', ruim: 'Ruim' };
const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// Variação percentual relativa; sem base de comparação não há variação a mostrar.
export function variacao(atual, anterior) {
  if (atual == null || !anterior) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

const pct = (parte, todo) => (todo ? Math.round((parte / todo) * 100) : 0);
const iso = ms => new Date(ms).toISOString();

function janelas(periodo, agora) {
  const { dias } = PERIODOS[periodo];
  const fim = agora.getTime();
  return { dias, fim, inicio: fim - dias * DIA, inicioAnterior: fim - 2 * dias * DIA };
}

function clausulaPatio(patio, coluna = 'patioAtual') {
  return patio ? { sql: ` AND ${coluna} = ?`, params: [patio] } : { sql: '', params: [] };
}

async function condicoesEm(db, limite, patio) {
  const f = clausulaPatio(patio);
  const linha = await db.getFirstAsync(
    `SELECT COUNT(*) AS total, COALESCE(SUM(c != 'Não avaliada'), 0) AS avaliados FROM (
       SELECT COALESCE(
         (SELECT h.condicaoNova FROM historico_condicao h
           WHERE h.dormenteId = d.id AND h.dataHora < ? ORDER BY h.dataHora DESC, h.id DESC LIMIT 1),
         (SELECT h.condicaoAnterior FROM historico_condicao h
           WHERE h.dormenteId = d.id ORDER BY h.dataHora ASC, h.id ASC LIMIT 1),
         d.condicao) AS c
       FROM dormentes_estoque d WHERE d.criadoEm < ?${f.sql})`,
    limite, limite, ...f.params,
  );
  return linha;
}

async function mediaBuscas(db, de, ate, patio) {
  const f = clausulaPatio(patio, 'd.patioAtual');
  const juncao = patio ? 'JOIN dormentes_loc d ON d.id = b.dormenteId' : '';
  const linha = await db.getFirstAsync(
    `SELECT AVG((julianday(b.localizadaEm) - julianday(b.iniciadaEm)) * 86400) AS media
     FROM buscas b ${juncao}
     WHERE b.localizadaEm IS NOT NULL AND b.iniciadaEm >= ? AND b.iniciadaEm < ?${f.sql}`,
    de, ate, ...f.params,
  );
  return linha.media == null ? null : Math.round(linha.media);
}

async function eficienciaEm(db, de, ate, patio) {
  const f = clausulaPatio(patio, 'd.patioAtual');
  const linha = await db.getFirstAsync(
    `SELECT COUNT(*) AS total,
       COALESCE(SUM((julianday(m.concluidaEm) - julianday(m.dataHora)) * 86400 <= m.prazoSegundos), 0) AS no_prazo
     FROM movimentacoes m JOIN dormentes_loc d ON d.id = m.dormenteId
     WHERE m.concluidaEm IS NOT NULL AND m.prazoSegundos IS NOT NULL
       AND m.dataHora >= ? AND m.dataHora < ?${f.sql}`,
    de, ate, ...f.params,
  );
  return linha.total ? pct(linha.no_prazo, linha.total) : null;
}

function rotuloBalde(indice, quantidade, periodo, inicioBalde) {
  if (periodo === '7 dias') return diasSemana[new Date(inicioBalde).getDay()];
  const atras = quantidade - 1 - indice;
  if (periodo === '4 semanas') return atras === 0 ? 'últ. 7 dias' : `há ${atras} sem.`;
  return atras === 0 ? 'últ. 30 dias' : `há ${atras} ${atras === 1 ? 'mês' : 'meses'}`;
}

function juntarLotes(lotes) {
  if (lotes.length === 1) return `Lote ${lotes[0]}`;
  return `Lotes ${lotes.slice(0, -1).join(', ')} e ${lotes[lotes.length - 1]}`;
}

// Entrada não tem origem e saída não tem destino: nunca mostra "null".
export function rotaDaMovimentacao({ tipo, origem, destino }) {
  if (origem && destino) return `${origem} → ${destino}`;
  if (origem) return `${origem} → fora do armazém`;
  if (destino) return `${tipo === 'Entrada' ? 'Entrada em' : 'Para'} ${destino}`;
  return tipo;
}

async function alertas(db, patio, agora) {
  const f = clausulaPatio(patio);
  const limite30 = iso(agora.getTime() - 30 * DIA);
  const lotesDe = async (extra, ...p) => (await db.getAllAsync(
    `SELECT DISTINCT loteId FROM dormentes_estoque WHERE 1=1${f.sql}${extra} ORDER BY loteId`, ...f.params, ...p)).map(l => l.loteId);
  const contar = async (extra, ...p) => (await db.getFirstAsync(
    `SELECT COUNT(*) AS n FROM dormentes_estoque WHERE 1=1${f.sql}${extra}`, ...f.params, ...p)).n;
  const fl = clausulaPatio(patio, 'patio');
  const urgente = [], revisar = [];
  const extraviados = await contar(' AND extraviadoEm IS NOT NULL');
  if (extraviados) urgente.push({ chave: 'extraviados', titulo: 'Dormentes extraviados', n: extraviados,
    detalhe: juntarLotes(await lotesDe(' AND extraviadoEm IS NOT NULL')), filtro: { cond: 'extraviados' } });
  const ruins = await contar(" AND condicao = 'Ruim'");
  if (ruins) urgente.push({ chave: 'ruim', titulo: 'Dormentes em condição Ruim', n: ruins,
    detalhe: juntarLotes(await lotesDe(" AND condicao = 'Ruim'")), filtro: { cond: 'ruim' } });
  const parados = await contar(' AND ultimaAtualizacao < ?', limite30);
  if (parados) revisar.push({ chave: 'parados', titulo: 'Sem atualização há +30 dias', n: parados,
    detalhe: 'Dormentes sem nova leitura ou avaliação', filtro: { cond: 'parados' } });
  const pendentes = (await db.getAllAsync(
    `SELECT id FROM lotes WHERE condicao = 'Pendente'${fl.sql} ORDER BY id`, ...fl.params)).map(l => l.id);
  if (pendentes.length) revisar.push({ chave: 'pendentes', titulo: 'Lotes pendentes de aprovação',
    n: pendentes.length, detalhe: juntarLotes(pendentes), filtro: null });
  const semNfc = (await db.getAllAsync(
    `SELECT id FROM lotes l WHERE codigoNFC IS NULL
       AND NOT EXISTS (SELECT 1 FROM etiquetas_legadas e WHERE e.loteChave = l.chave)${fl.sql} ORDER BY id`,
    ...fl.params)).map(l => l.id);
  if (semNfc.length) revisar.push({ chave: 'semnfc', titulo: 'Lotes sem etiqueta NFC', n: semNfc.length,
    detalhe: juntarLotes(semNfc), filtro: null });
  return { urgente, revisar, total: urgente.length + revisar.length };
}

export async function listarPatios(db) {
  return (await db.getAllAsync('SELECT DISTINCT patio FROM lotes ORDER BY patio')).map(l => l.patio);
}

export async function carregarDashboard(db, { patio = null, periodo = '7 dias', agora = new Date() } = {}) {
  if (!PERIODOS[periodo]) throw new Error('Período inválido.');
  const j = janelas(periodo, agora);
  const f = clausulaPatio(patio);
  const fLote = clausulaPatio(patio, 'patio');

  const porCondicao = await db.getAllAsync(
    `SELECT condicao, COUNT(*) AS n FROM dormentes_estoque WHERE 1=1${f.sql} GROUP BY condicao`, ...f.params);
  const contagem = Object.fromEntries(condicoes.map(c => [c, 0]));
  porCondicao.forEach(l => { contagem[l.condicao] = l.n; });
  const total = condicoes.reduce((a, c) => a + contagem[c], 0);
  const avaliados = total - contagem['Não avaliada'];

  const antes = await condicoesEm(db, iso(j.inicio), patio);
  const extraviados = (await db.getFirstAsync(
    `SELECT COUNT(*) AS n FROM dormentes_estoque WHERE extraviadoEm IS NOT NULL${f.sql}`, ...f.params)).n;
  const extraviadosAntes = (await db.getFirstAsync(
    `SELECT COUNT(*) AS n FROM dormentes_estoque WHERE extraviadoEm IS NOT NULL AND extraviadoEm < ? AND criadoEm < ?${f.sql}`,
    iso(j.inicio), iso(j.inicio), ...f.params)).n;

  const locAtual = await mediaBuscas(db, iso(j.inicio), iso(j.fim + 1), patio);
  const locAnterior = await mediaBuscas(db, iso(j.inicioAnterior), iso(j.inicio), patio);
  const efiAtual = await eficienciaEm(db, iso(j.inicio), iso(j.fim + 1), patio);
  const efiAnterior = await eficienciaEm(db, iso(j.inicioAnterior), iso(j.inicio), patio);

  const lotes = await db.getFirstAsync(
    `SELECT COUNT(*) AS total, COALESCE(SUM(condicao = 'Pendente'), 0) AS pendentes FROM lotes WHERE 1=1${fLote.sql}`,
    ...fLote.params);

  // Movimentações: baldes do período atual + total do período anterior (para a variação).
  const fm = clausulaPatio(patio, 'd.patioAtual');
  const movs = await db.getAllAsync(
    `SELECT m.tipo, m.dataHora FROM movimentacoes m JOIN dormentes_loc d ON d.id = m.dormenteId
     WHERE m.dataHora >= ? AND m.dataHora < ?${fm.sql}`, iso(j.inicioAnterior), iso(j.fim + 1), ...fm.params);
  const nBaldes = j.dias / PERIODOS[periodo].balde;
  const baldeMs = PERIODOS[periodo].balde * DIA;
  const serie = Array.from({ length: nBaldes }, (_, i) => {
    const ini = j.inicio + i * baldeMs;
    return { rotulo: rotuloBalde(i, nBaldes, periodo, ini), 'Entrada': 0, 'Saída': 0, Interna: 0, total: 0, ini };
  });
  let atual = 0, anterior = 0;
  for (const m of movs) {
    const t = new Date(m.dataHora).getTime();
    if (t < j.inicio) { anterior++; continue; }
    const b = serie[Math.min(nBaldes - 1, Math.floor((t - j.inicio) / baldeMs))];
    b[m.tipo]++; b.total++; atual++;
  }
  const tipos = ['Entrada', 'Saída', 'Interna'].map(nome => ({ nome, n: serie.reduce((a, b) => a + b[nome], 0) }));

  const recentes = (await db.getAllAsync(
    `SELECT m.id, m.tipo, m.origem, m.destino, m.dataHora, d.nome FROM movimentacoes m
     JOIN dormentes_loc d ON d.id = m.dormenteId WHERE 1=1${fm.sql} ORDER BY m.dataHora DESC, m.rowid DESC LIMIT 5`,
    ...fm.params)).map(m => ({ ...m, rota: rotaDaMovimentacao(m) }));

  const porLote = await db.getAllAsync(
    `SELECT loteChave, loteId, patioAtual AS patio, aprovacao, condicao, COUNT(*) AS n
     FROM dormentes_estoque WHERE 1=1${f.sql} GROUP BY loteChave, patioAtual, condicao ORDER BY loteId`, ...f.params);
  const mapa = new Map();
  for (const l of porLote) {
    if (!mapa.has(l.loteChave)) {
      mapa.set(l.loteChave, { chave: l.loteChave, id: l.loteId, patio: l.patio, aprovacao: l.aprovacao,
        total: 0, ...Object.fromEntries(condicoes.map(c => [c, 0])) });
    }
    const alvo = mapa.get(l.loteChave);
    alvo[l.condicao] += l.n; alvo.total += l.n;
  }

  const aprovacao = await db.getAllAsync(
    `SELECT condicao AS nome, COUNT(*) AS n FROM lotes WHERE 1=1${fLote.sql} GROUP BY condicao`, ...fLote.params);
  const aprovMapa = Object.fromEntries(aprovacao.map(a => [a.nome, a.n]));

  const especiesTodas = await db.getAllAsync(
    `SELECT especie AS nome, COUNT(*) AS n FROM dormentes_estoque WHERE 1=1${f.sql}
     GROUP BY especie ORDER BY n DESC, especie`, ...f.params);
  const especies = especiesTodas.slice(0, 5);
  const resto = especiesTodas.slice(5).reduce((a, e) => a + e.n, 0);
  if (resto) especies.push({ nome: 'Outras', n: resto });

  const locais = (await db.getAllAsync(
    `SELECT patioAtual AS patio, setorAtual AS setor, COUNT(*) AS n FROM dormentes_estoque
     WHERE 1=1${f.sql} GROUP BY patioAtual, setorAtual ORDER BY n DESC, patioAtual, setorAtual LIMIT 5`, ...f.params));

  const lim7 = iso(agora.getTime() - 7 * DIA), lim30 = iso(agora.getTime() - 30 * DIA);
  const idade = await db.getFirstAsync(
    `SELECT COALESCE(SUM(ultimaAtualizacao >= ?), 0) AS ate7,
            COALESCE(SUM(ultimaAtualizacao < ? AND ultimaAtualizacao >= ?), 0) AS de8a30,
            COALESCE(SUM(ultimaAtualizacao < ?), 0) AS mais30
     FROM dormentes_estoque WHERE 1=1${f.sql}`, lim7, lim7, lim30, lim30, ...f.params);

  return {
    periodo, patio, geradoEm: agora.toISOString(), total,
    condicoes: condicoes.map(nome => ({ nome, n: contagem[nome] })),
    avaliados: { n: avaliados, total, pct: pct(avaliados, total), variacao: variacao(pct(avaliados, total), antes.total ? pct(antes.avaliados, antes.total) : null) },
    perdas: { n: extraviados, total, taxa: total ? Math.round((extraviados / total) * 1000) / 10 : 0, variacao: variacao(extraviados, extraviadosAntes) },
    localizacao: { segundos: locAtual, variacao: variacao(locAtual, locAnterior) },
    eficiencia: { pct: efiAtual, variacao: variacao(efiAtual, efiAnterior) },
    lotes: { total: lotes.total, pendentes: lotes.pendentes },
    movimentacoes: { total: atual, variacao: variacao(atual, anterior), serie, tipos },
    recentes,
    condicaoPorLote: [...mapa.values()],
    aprovacao: ['Pendente', 'Aprovado', 'Reprovado'].map(nome => ({ nome, n: aprovMapa[nome] ?? 0 })),
    especies, locais,
    idade: [
      { nome: 'Até 7 dias', n: idade.ate7, filtro: { cond: 'todas' } },
      { nome: '8 a 30 dias', n: idade.de8a30, filtro: { cond: 'todas' } },
      { nome: 'Mais de 30 dias', n: idade.mais30, filtro: { cond: 'parados' } },
    ],
    alertas: await alertas(db, patio, agora),
  };
}

// Top N lotes para uma condição (o widget "Condição por lote"). N lotes = N linhas, nunca 300 barras.
export function topLotesPorCondicao(porLote, condicao, limite = 5) {
  const ordenados = porLote.filter(l => l.total > 0)
    .sort((a, b) => b[condicao] - a[condicao] || a.id.localeCompare(b.id, 'pt-BR', { numeric: true }));
  return { linhas: ordenados.slice(0, limite), restantes: Math.max(0, ordenados.length - limite) };
}

export async function listarDormentes(db, { cond = 'todas', lote = null, patio = null, busca = '', limite = 200, agora = new Date() } = {}) {
  const where = ['1=1'], params = [];
  if (patio) { where.push('patioAtual = ?'); params.push(patio); }
  if (lote != null) { where.push('loteChave = ?'); params.push(lote); }
  if (cond === 'parados') { where.push('ultimaAtualizacao < ?'); params.push(iso(agora.getTime() - 30 * DIA)); }
  else if (cond === 'extraviados') where.push('extraviadoEm IS NOT NULL');
  else if (condicaoDoFiltro[cond]) { where.push('condicao = ?'); params.push(condicaoDoFiltro[cond]); }
  if (busca.trim()) { where.push("nome LIKE ? ESCAPE '\\'"); params.push(`%${busca.trim().replace(/[\\%_]/g, m => '\\' + m)}%`); }
  const filtro = where.join(' AND ');
  const { total } = await db.getFirstAsync(`SELECT COUNT(*) AS total FROM dormentes_estoque WHERE ${filtro}`, ...params);
  const linhas = (await db.getAllAsync(
    `SELECT id, nome, condicao, loteChave, loteId, patioAtual AS patio, setorAtual AS setor,
            ultimaAtualizacao, extraviadoEm FROM dormentes_estoque WHERE ${filtro}
     ORDER BY ultimaAtualizacao ASC, nome LIMIT ?`, ...params, limite)).map(l => ({
    ...l, extraviado: l.extraviadoEm != null,
    dias: Math.max(0, Math.floor((agora.getTime() - new Date(l.ultimaAtualizacao).getTime()) / DIA)),
  }));
  return { total, linhas };
}

export function relatorioTexto(dash) {
  const v = x => (x == null ? 'sem dados' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x) + '%');
  const linhas = [
    `Relatório do dashboard · ${dash.patio ?? 'Todos os pátios'} · ${PERIODOS[dash.periodo].texto}`,
    `Gerado em ${new Date(dash.geradoEm).toLocaleString('pt-BR')}`, '',
    'INDICADORES',
    `Avaliados: ${dash.avaliados.pct}% (${dash.avaliados.n} de ${dash.avaliados.total}) · ${v(dash.avaliados.variacao)}`,
    `Taxa de perdas: ${dash.perdas.taxa}% (${dash.perdas.n} de ${dash.perdas.total}) · ${v(dash.perdas.variacao)}`,
    `Tempo de localização: ${dash.localizacao.segundos == null ? 'sem dados' : dash.localizacao.segundos + ' s'} · ${v(dash.localizacao.variacao)}`,
    `Eficiência operacional: ${dash.eficiencia.pct == null ? 'sem dados' : dash.eficiencia.pct + '%'} · ${v(dash.eficiencia.variacao)}`,
    `Movimentações registradas: ${dash.movimentacoes.total} · ${v(dash.movimentacoes.variacao)}`, '',
    'CONDIÇÃO DOS DORMENTES', ...dash.condicoes.map(c => `${c.nome}: ${c.n}`), '',
    'APROVAÇÃO DOS LOTES', ...dash.aprovacao.map(a => `${a.nome}: ${a.n}`), '',
    'PENDÊNCIAS', ...(dash.alertas.total ? [...dash.alertas.urgente, ...dash.alertas.revisar].map(a => `${a.titulo}: ${a.n} (${a.detalhe})`) : ['Nenhuma']),
  ];
  return linhas.join('\n');
}
