const { Router } = require('express');
const { randomUUID } = require('node:crypto');
const pool = require('../config/db');
const { autenticarToken } = require('../middlewares/auth.middleware');

const router = Router();
router.use(autenticarToken);

let cacheColunasLotes = null;

async function obterColunasLotes() {
  if (cacheColunasLotes) return cacheColunasLotes;
  const [colunas] = await pool.execute('SHOW COLUMNS FROM lotes');
  cacheColunasLotes = new Map(colunas.map((c) => [c.Field, c]));
  return cacheColunasLotes;
}

// Lista os pátios distintos cadastrados nos lotes para o filtro superior
router.get('/patios', async (req, res) => {
  try {
    const [linhas] = await pool.execute(
      `SELECT DISTINCT patio
       FROM lotes
       WHERE patio IS NOT NULL AND TRIM(patio) <> ''
       ORDER BY patio ASC`
    );

    return res.json(linhas.map((item) => item.patio));
  } catch (error) {
    console.error('Erro ao listar pátios:', error.code, error.sqlMessage || error.message);
    return res.status(500).json({ mensagem: 'Erro ao listar pátios.' });
  }
});

// Retorna todos os indicadores, gráficos, listas e alertas da dashboard
router.get('/dados', async (req, res) => {
  const diasBruto = Number(req.query?.dias);
  const dias =
    Number.isSafeInteger(diasBruto) && diasBruto > 0 && diasBruto <= 365
      ? diasBruto
      : 30;

  const patio =
    typeof req.query?.patio === 'string' && req.query.patio.trim()
      ? req.query.patio.trim()
      : null;

  const filtroPatioSql = patio ? 'AND l.patio = ?' : '';
  const paramsPatio = patio ? [patio] : [];

  try {
   const colunasLotes = await obterColunasLotes();
    const temCodigoNfc = colunasLotes.has('codigoNFC');
    const temLegadosNfc = colunasLotes.has('codigosNFCLegados');
    const temUltimaAtualizacaoLote = colunasLotes.has('ultimaAtualizacao');

    // 1. Totais e condições dos dormentes
    const [[totaisDormentes]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN d.condicao = 'Boa' THEN 1 ELSE 0 END) AS boa,
         SUM(CASE WHEN d.condicao = 'Atenção' THEN 1 ELSE 0 END) AS atencao,
         SUM(CASE WHEN d.condicao = 'Ruim' THEN 1 ELSE 0 END) AS ruim,
         SUM(CASE WHEN d.condicao = 'Não avaliada' THEN 1 ELSE 0 END) AS naoAvaliada,
         SUM(CASE WHEN d.condicao <> 'Não avaliada' THEN 1 ELSE 0 END) AS avaliados,
         SUM(CASE WHEN d.situacao_estoque = 'EXTRAVIADO' THEN 1 ELSE 0 END) AS extraviados
       FROM dormentes d
       JOIN lotes l ON l.chave = d.loteChave
       WHERE 1 = 1 ${filtroPatioSql}`,
      paramsPatio
    );

    const totalDormentes = Number(totaisDormentes.total || 0);
    const avaliados = Number(totaisDormentes.avaliados || 0);
    const extraviados = Number(totaisDormentes.extraviados || 0);

    // 2. Tempo médio de localização física (em segundos) no período
    const [[buscaStats]] = await pool.execute(
      `SELECT
         AVG(TIMESTAMPDIFF(SECOND, b.iniciada_em, b.finalizada_em)) AS mediaSegundos,
         COUNT(*) AS totalBuscas
       FROM buscas_localizacao b
       JOIN dormentes d ON d.id = b.dormente_id
       JOIN lotes l ON l.chave = d.loteChave
       WHERE b.resultado IN ('ENCONTRADO', 'NAO_ENCONTRADO')
         AND b.finalizada_em IS NOT NULL
         AND b.finalizada_em >= DATE_SUB(NOW(3), INTERVAL ${dias} DAY)
         ${filtroPatioSql}`,
      paramsPatio
    );

    // 3. Eficiência operacional (% de movimentações concluídas no prazo) no período
    const [[eficienciaStats]] = await pool.execute(
      `SELECT
         COUNT(*) AS totalComPrazo,
         SUM(CASE WHEN m.concluida_em <= m.prazo_previsto_em THEN 1 ELSE 0 END) AS noPrazo
       FROM movimentacoes m
       JOIN dormentes d ON d.id = m.dormente_id
       JOIN lotes l ON l.chave = d.loteChave
       WHERE m.status = 'CONCLUIDA'
         AND m.prazo_previsto_em IS NOT NULL
         AND m.concluida_em IS NOT NULL
         AND m.concluida_em >= DATE_SUB(NOW(3), INTERVAL ${dias} DAY)
         ${filtroPatioSql}`,
      paramsPatio
    );

    const totalComPrazo = Number(eficienciaStats.totalComPrazo || 0);
    const noPrazo = Number(eficienciaStats.noPrazo || 0);

    // 4. Condição por lote (gráfico de barras empilhadas)
    const [porLote] = await pool.execute(
      `SELECT
         l.chave,
         l.id,
         l.patio,
         l.setor,
         l.condicao,
         COUNT(d.id) AS total,
         SUM(CASE WHEN d.condicao = 'Boa' THEN 1 ELSE 0 END) AS Boa,
         SUM(CASE WHEN d.condicao = 'Atenção' THEN 1 ELSE 0 END) AS Atencao,
         SUM(CASE WHEN d.condicao = 'Ruim' THEN 1 ELSE 0 END) AS Ruim,
         SUM(CASE WHEN d.condicao = 'Não avaliada' THEN 1 ELSE 0 END) AS NaoAvaliada
       FROM lotes l
       LEFT JOIN dormentes d ON d.loteChave = l.chave
       WHERE 1 = 1 ${filtroPatioSql}
       GROUP BY l.chave, l.id, l.patio, l.setor, l.condicao
       ORDER BY l.chave ASC`,
      paramsPatio
    );

    // 5. Aprovação dos lotes
    const [[aprovacaoLotes]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN l.condicao = 'Aprovado' THEN 1 ELSE 0 END) AS Aprovado,
         SUM(CASE WHEN l.condicao = 'Pendente' THEN 1 ELSE 0 END) AS Pendente,
         SUM(CASE WHEN l.condicao = 'Reprovado' THEN 1 ELSE 0 END) AS Reprovado
       FROM lotes l
       WHERE 1 = 1 ${filtroPatioSql}`,
      paramsPatio
    );

    // 6. Dormentes por pátio
    const [porPatio] = await pool.execute(
      `SELECT
         l.patio,
         COUNT(d.id) AS total
       FROM lotes l
       LEFT JOIN dormentes d ON d.loteChave = l.chave
       WHERE 1 = 1 ${filtroPatioSql}
       GROUP BY l.patio
       ORDER BY total DESC, l.patio ASC`,
      paramsPatio
    );

    // 7. Dormentes por espécie
    const [porEspecie] = await pool.execute(
      `SELECT
         d.especie,
         COUNT(*) AS total
       FROM dormentes d
       JOIN lotes l ON l.chave = d.loteChave
       WHERE 1 = 1 ${filtroPatioSql}
       GROUP BY d.especie
       ORDER BY total DESC, d.especie ASC`,
      paramsPatio
    );

    // 8. Tempo sem atualização (faixas de dias)
    const [[idadeAtualizacao]] = await pool.execute(
      `SELECT
         SUM(CASE WHEN DATEDIFF(NOW(), d.ultimaAtualizacao) <= 7 THEN 1 ELSE 0 END) AS ate7,
         SUM(CASE WHEN DATEDIFF(NOW(), d.ultimaAtualizacao) BETWEEN 8 AND 30 THEN 1 ELSE 0 END) AS de8a30,
         SUM(CASE WHEN DATEDIFF(NOW(), d.ultimaAtualizacao) BETWEEN 31 AND 90 THEN 1 ELSE 0 END) AS de31a90,
         SUM(CASE WHEN DATEDIFF(NOW(), d.ultimaAtualizacao) > 90 THEN 1 ELSE 0 END) AS acima90
       FROM dormentes d
       JOIN lotes l ON l.chave = d.loteChave
       WHERE 1 = 1 ${filtroPatioSql}`,
      paramsPatio
    );

    // 9. Movimentações agrupadas por dia no período
    const [movimentacoesPeriodo] = await pool.execute(
      `SELECT
         DATE_FORMAT(m.concluida_em, '%Y-%m-%d') AS dia,
         SUM(CASE WHEN m.tipo = 'ENTRADA' THEN 1 ELSE 0 END) AS ENTRADA,
         SUM(CASE WHEN m.tipo = 'INTERNA' THEN 1 ELSE 0 END) AS INTERNA,
         SUM(CASE WHEN m.tipo = 'SAIDA' THEN 1 ELSE 0 END) AS SAIDA,
         COUNT(*) AS total
       FROM movimentacoes m
       JOIN dormentes d ON d.id = m.dormente_id
       JOIN lotes l ON l.chave = d.loteChave
       WHERE m.status = 'CONCLUIDA'
         AND m.concluida_em >= DATE_SUB(NOW(3), INTERVAL ${dias} DAY)
         ${filtroPatioSql}
       GROUP BY dia
       ORDER BY dia ASC`,
      paramsPatio
    );

    // 10. Últimas movimentações
    const [ultimasMovimentacoes] = await pool.execute(
      `SELECT
         m.id,
         m.tipo,
         m.concluida_em,
         m.prazo_previsto_em,
         d.id AS dormenteId,
         d.nome AS dormenteNome,
         l.id AS loteId,
         orig.patio AS origemPatio,
         orig.setor AS origemSetor,
         dest.patio AS destinoPatio,
         dest.setor AS destinoSetor
       FROM movimentacoes m
       JOIN dormentes d ON d.id = m.dormente_id
       JOIN lotes l ON l.chave = d.loteChave
       LEFT JOIN locais orig ON orig.id = m.origem_local_id
       LEFT JOIN locais dest ON dest.id = m.destino_local_id
       WHERE m.status = 'CONCLUIDA' ${filtroPatioSql}
       ORDER BY m.concluida_em DESC
       LIMIT 20`,
      paramsPatio
    );

    // 11. Listagem resumida de lotes
    const camposNfc = [
      temCodigoNfc ? 'l.codigoNFC' : null,
      temLegadosNfc ? 'l.codigosNFCLegados' : null,
    ].filter(Boolean);
    const campoNfcSelect = camposNfc.length ? `${camposNfc.join(', ')},` : '';
    const campoNfcGroup = camposNfc.length ? `, ${camposNfc.join(', ')}` : '';
    const exprUltimaAtualizacao = temUltimaAtualizacaoLote
      ? 'COALESCE(l.ultimaAtualizacao, MAX(d.ultimaAtualizacao), NOW())'
      : 'COALESCE(MAX(d.ultimaAtualizacao), NOW())';

    const [lotesLista] = await pool.execute(
      `SELECT
         l.chave,
         l.id,
         l.patio,
         l.setor,
         l.condicao,
         ${campoNfcSelect}
         ${exprUltimaAtualizacao} AS ultimaAtualizacao,
         COUNT(d.id) AS totalDormentes
       FROM lotes l
       LEFT JOIN dormentes d ON d.loteChave = l.chave
       WHERE 1 = 1 ${filtroPatioSql}
       GROUP BY l.chave, l.id, l.patio, l.setor, l.condicao${campoNfcGroup}
       ORDER BY ultimaAtualizacao DESC, l.chave DESC`,
      paramsPatio
    );

    // 12. Alertas gerenciais (Sininho do topo)
    const [[alertaExtraviados]] = await pool.execute(
      `SELECT COUNT(*) AS total,
              GROUP_CONCAT(DISTINCT l.id ORDER BY l.id SEPARATOR ', ') AS lotes
       FROM dormentes d
       JOIN lotes l ON l.chave = d.loteChave
       WHERE d.situacao_estoque = 'EXTRAVIADO' ${filtroPatioSql}`,
      paramsPatio
    );

    const [[alertaRuins]] = await pool.execute(
      `SELECT COUNT(*) AS total,
              GROUP_CONCAT(DISTINCT l.id ORDER BY l.id SEPARATOR ', ') AS lotes
       FROM dormentes d
       JOIN lotes l ON l.chave = d.loteChave
       WHERE d.condicao = 'Ruim' ${filtroPatioSql}`,
      paramsPatio
    );

    const [[alertaSemAtualizacao]] = await pool.execute(
      `SELECT COUNT(*) AS total,
              GROUP_CONCAT(DISTINCT l.id ORDER BY l.id SEPARATOR ', ') AS lotes
       FROM dormentes d
       JOIN lotes l ON l.chave = d.loteChave
       WHERE DATEDIFF(NOW(), d.ultimaAtualizacao) > 30 ${filtroPatioSql}`,
      paramsPatio
    );

    const [[alertaPendentes]] = await pool.execute(
      `SELECT COUNT(*) AS total,
              GROUP_CONCAT(DISTINCT l.id ORDER BY l.id SEPARATOR ', ') AS lotes
       FROM lotes l
       WHERE l.condicao = 'Pendente' ${filtroPatioSql}`,
      paramsPatio
    );

    let alertaSemNfc = { total: 0, lotes: '' };
    const condicoesSemNfc = [];
    if (temCodigoNfc) {
      condicoesSemNfc.push("(l.codigoNFC IS NULL OR TRIM(l.codigoNFC) = '')");
    }
    if (temLegadosNfc) {
      condicoesSemNfc.push(
        "(l.codigosNFCLegados IS NULL OR TRIM(CAST(l.codigosNFCLegados AS CHAR)) IN ('', '[]', 'null'))"
      );
    }

    if (condicoesSemNfc.length) {
      const [[resSemNfc]] = await pool.execute(
        `SELECT COUNT(*) AS total,
                GROUP_CONCAT(DISTINCT l.id ORDER BY l.id SEPARATOR ', ') AS lotes
         FROM lotes l
         WHERE ${condicoesSemNfc.join(' AND ')}
           ${filtroPatioSql}`,
        paramsPatio
      );
      alertaSemNfc = {
        total: Number(resSemNfc.total || 0),
        lotes: resSemNfc.lotes || '',
      };
    }

    const alertas = {
      extraviados: {
        total: Number(alertaExtraviados.total || 0),
        lotes: alertaExtraviados.lotes || '',
      },
      ruins: {
        total: Number(alertaRuins.total || 0),
        lotes: alertaRuins.lotes || '',
      },
      semAtualizacao30: {
        total: Number(alertaSemAtualizacao.total || 0),
        lotes: alertaSemAtualizacao.lotes || '',
      },
      lotesPendentes: {
        total: Number(alertaPendentes.total || 0),
        lotes: alertaPendentes.lotes || '',
      },
      lotesSemNfc: alertaSemNfc,
    };

    return res.json({
      filtros: { dias, patio },
      resumo: {
        totalDormentes,
        avaliados,
        naoAvaliados: Number(totaisDormentes.naoAvaliada || 0),
        percentualAvaliados:
          totalDormentes > 0 ? Math.round((avaliados / totalDormentes) * 100) : 0,
        extraviados,
        taxaPerdas:
          totalDormentes > 0
            ? Number(((extraviados / totalDormentes) * 100).toFixed(1))
            : 0,
        tempoLocalizacaoSegundos:
          buscaStats.mediaSegundos !== null
            ? Math.round(Number(buscaStats.mediaSegundos))
            : null,
        totalBuscas: Number(buscaStats.totalBuscas || 0),
        eficienciaOperacional:
          totalComPrazo > 0 ? Math.round((noPrazo / totalComPrazo) * 100) : null,
        totalMovimentacoesPrazo: totalComPrazo,
        totalLotes: Number(aprovacaoLotes.total || 0),
      },
      condicoes: {
        Boa: Number(totaisDormentes.boa || 0),
        Atencao: Number(totaisDormentes.atencao || 0),
        Ruim: Number(totaisDormentes.ruim || 0),
        NaoAvaliada: Number(totaisDormentes.naoAvaliada || 0),
      },
      porLote: porLote.map((item) => ({
        ...item,
        total: Number(item.total || 0),
        Boa: Number(item.Boa || 0),
        Atencao: Number(item.Atencao || 0),
        Ruim: Number(item.Ruim || 0),
        NaoAvaliada: Number(item.NaoAvaliada || 0),
      })),
      aprovacaoLotes: {
        total: Number(aprovacaoLotes.total || 0),
        Aprovado: Number(aprovacaoLotes.Aprovado || 0),
        Pendente: Number(aprovacaoLotes.Pendente || 0),
        Reprovado: Number(aprovacaoLotes.Reprovado || 0),
      },
      porPatio: porPatio.map((item) => ({
        patio: item.patio,
        total: Number(item.total || 0),
      })),
      porEspecie: porEspecie.map((item) => ({
        especie: item.especie,
        total: Number(item.total || 0),
      })),
      idadeAtualizacao: {
        ate7: Number(idadeAtualizacao.ate7 || 0),
        de8a30: Number(idadeAtualizacao.de8a30 || 0),
        de31a90: Number(idadeAtualizacao.de31a90 || 0),
        acima90: Number(idadeAtualizacao.acima90 || 0),
      },
      movimentacoesPeriodo: movimentacoesPeriodo.map((item) => ({
        dia: item.dia,
        ENTRADA: Number(item.ENTRADA || 0),
        INTERNA: Number(item.INTERNA || 0),
        SAIDA: Number(item.SAIDA || 0),
        total: Number(item.total || 0),
      })),
      ultimasMovimentacoes,
      lotes: lotesLista.map((item) => {
        const legados = Array.isArray(item.codigosNFCLegados)
          ? item.codigosNFCLegados
          : [];
        const listaNfc =
          temCodigoNfc && item.codigoNFC
            ? Array.from(new Set([item.codigoNFC, ...legados]))
            : legados;

        return {
          ...item,
          codigosNFCLegados: listaNfc,
          totalDormentes: Number(item.totalDormentes || 0),
        };
      }),
      alertas,
    });
  } catch (error) {
    console.error(
      'Erro ao carregar dados da dashboard:',
      error.code,
      error.sqlMessage || error.message
    );
    return res.status(500).json({ mensagem: 'Erro ao carregar dados da dashboard.' });
  }
});

// Função auxiliar para limpar dados do seed na ordem segura das chaves estrangeiras
async function limparDadosSeed(conexao) {
  await conexao.execute(
    `DELETE m FROM movimentacoes m
     JOIN dormentes d ON d.id = m.dormente_id
     JOIN lotes l ON l.chave = d.loteChave
     WHERE l.id LIKE 'EX-%'`
  );
  await conexao.execute(
    `DELETE b FROM buscas_localizacao b
     JOIN dormentes d ON d.id = b.dormente_id
     JOIN lotes l ON l.chave = d.loteChave
     WHERE l.id LIKE 'EX-%'`
  );
  await conexao.execute(
    `DELETE d FROM dormentes d
     JOIN lotes l ON l.chave = d.loteChave
     WHERE l.id LIKE 'EX-%'`
  );
  await conexao.execute("DELETE FROM lotes WHERE id LIKE 'EX-%'");
}

// Gera dados de exemplo (lotes EX-1..EX-6, dormentes, buscas e movimentações)
router.post('/seed', async (req, res) => {
  let conexao;

  try {
    const colunasLotes = await obterColunasLotes();
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    await limparDadosSeed(conexao);

    const locaisSeed = [
      ['Pátio A', 'Setor A'],
      ['Pátio A', 'Setor B'],
      ['Pátio B', 'Setor B'],
      ['Pátio B', 'Setor C'],
      ['Pátio C', 'Setor A'],
    ];

    const localIds = {};
    for (const [patio, setor] of locaisSeed) {
      const [existentes] = await conexao.execute(
        'SELECT id FROM locais WHERE patio = ? AND setor = ? LIMIT 1',
        [patio, setor]
      );
      if (existentes.length) {
        localIds[`${patio}|${setor}`] = existentes[0].id;
      } else {
        const [resLocal] = await conexao.execute(
          'INSERT INTO locais (patio, setor, ativo) VALUES (?, ?, 1)',
          [patio, setor]
        );
        localIds[`${patio}|${setor}`] = resLocal.insertId;
      }
    }

    const lotesConfig = [
      { id: 'EX-1', patio: 'Pátio A', setor: 'Setor A', condicao: 'Pendente', desc: 'Lote de exemplo', nfc: ['NFC-EX-01'] },
      { id: 'EX-2', patio: 'Pátio A', setor: 'Setor B', condicao: 'Aprovado', desc: 'Dormentes tratados', nfc: ['NFC-EX-02'] },
      { id: 'EX-3', patio: 'Pátio B', setor: 'Setor B', condicao: 'Pendente', desc: 'Aguardando vistoria', nfc: [] },
      { id: 'EX-4', patio: 'Pátio B', setor: 'Setor C', condicao: 'Aprovado', desc: 'Lote linha principal', nfc: ['NFC-EX-04'] },
      { id: 'EX-5', patio: 'Pátio C', setor: 'Setor A', condicao: 'Reprovado', desc: 'Madeira com fissuras', nfc: [] },
      { id: 'EX-6', patio: 'Pátio C', setor: 'Setor A', condicao: 'Aprovado', desc: 'Estoque reserva', nfc: ['NFC-EX-06'] },
    ];

    const listaCondicoes = ['Boa', 'Boa', 'Atenção', 'Ruim', 'Não avaliada'];
    const listaEspecies = ['Eucalipto', 'Araucária', 'Angico', 'Ipê'];
    let seq = 1;
    const dormentesCriados = [];

    for (const lote of lotesConfig) {
      const especieLote = listaEspecies[seq % listaEspecies.length];
      const colsInsert = ['id', 'patio', 'setor'];
      const valsInsert = [lote.id, lote.patio, lote.setor];

      const preencherColunaTextoOuJson = (nomeColuna, valorTexto) => {
        if (!colunasLotes.has(nomeColuna)) return;
        const meta = colunasLotes.get(nomeColuna);
        const ehJson = String(meta?.Type || '').toLowerCase().includes('json');
        colsInsert.push(nomeColuna);
        valsInsert.push(ehJson ? JSON.stringify([valorTexto]) : valorTexto);
      };

      preencherColunaTextoOuJson('tamanhoDormentes', '280x24x17');
      preencherColunaTextoOuJson('tamanho', '280x24x17');
      preencherColunaTextoOuJson('tamanhos', '280x24x17');
      preencherColunaTextoOuJson('especieMadeira', especieLote);
      preencherColunaTextoOuJson('especie', especieLote);
      preencherColunaTextoOuJson('especies', especieLote);

      if (colunasLotes.has('quantidade')) {
        colsInsert.push('quantidade');
        valsInsert.push(6);
      }

      colsInsert.push('condicao');
      valsInsert.push(lote.condicao);

      if (colunasLotes.has('descricao')) {
        colsInsert.push('descricao');
        valsInsert.push(lote.desc);
      }

      if (colunasLotes.has('codigosNFCLegados')) {
        colsInsert.push('codigosNFCLegados');
        valsInsert.push(JSON.stringify(lote.nfc));
      }

      const placeholders = colsInsert.map(() => '?').join(', ');
      const sqlInsertLote = colunasLotes.has('ultimaAtualizacao')
        ? `INSERT INTO lotes (${colsInsert.join(', ')}, ultimaAtualizacao) VALUES (${placeholders}, DATE_SUB(NOW(3), INTERVAL ? DAY))`
        : `INSERT INTO lotes (${colsInsert.join(', ')}) VALUES (${placeholders})`;

      const paramsInsertLote = colunasLotes.has('ultimaAtualizacao')
        ? [...valsInsert, seq * 3]
        : valsInsert;

      const [resLote] = await conexao.execute(sqlInsertLote, paramsInsertLote);

      const loteChave = resLote.insertId;
      const localId = localIds[`${lote.patio}|${lote.setor}`];

      for (let i = 0; i < 6; i += 1) {
        const dormenteId = randomUUID();
        const nome = `D-${String(seq).padStart(3, '0')}`;
        const cond = listaCondicoes[(seq + i) % listaCondicoes.length];
        const extraviado = seq === 7 || seq === 14 || seq === 22;
        const diasAtras = i === 5 ? 45 : (seq % 12) + 1;

        await conexao.execute(
          `INSERT INTO dormentes
           (id, loteChave, nome, condicao, tamanho, especie, situacao_estoque, local_id, extraviado_em, ultimaAtualizacao)
           VALUES (?, ?, ?, ?, '280x24x17', ?, ?, ?, IF(? = 1, DATE_SUB(NOW(3), INTERVAL ? DAY), NULL), DATE_SUB(NOW(3), INTERVAL ? DAY))`,
          [
            dormenteId,
            loteChave,
            nome,
            cond,
            listaEspecies[(seq + i) % listaEspecies.length],
            extraviado ? 'EXTRAVIADO' : 'EM_ESTOQUE',
            extraviado ? null : localId,
            extraviado ? 1 : 0,
            diasAtras,
            diasAtras,
          ]
        );

        dormentesCriados.push({ id: dormenteId, localId });
        seq += 1;
      }
    }

    // Registra buscas físicas (~58s em média)
    const temposBusca = [48, 55, 62, 67];
    for (let i = 0; i < temposBusca.length; i += 1) {
      await conexao.execute(
        `INSERT INTO buscas_localizacao
         (id, dormente_id, usuario_id, iniciada_em, finalizada_em, resultado)
         VALUES (?, ?, ?, DATE_SUB(NOW(3), INTERVAL ? MINUTE), DATE_ADD(DATE_SUB(NOW(3), INTERVAL ? MINUTE), INTERVAL ? SECOND), 'ENCONTRADO')`,
        [randomUUID(), dormentesCriados[i].id, req.usuario.id, (i + 1) * 30, (i + 1) * 30, temposBusca[i]]
      );
    }

    // Registra movimentações (80% no prazo, 20% atrasadas)
    const todosLocaisIds = Object.values(localIds);
    const dormentesValidosMov = dormentesCriados.filter((d) => d.localId != null);
    const tipos = ['ENTRADA', 'INTERNA', 'SAIDA', 'ENTRADA', 'INTERNA'];

    for (let i = 0; i < 10; i += 1) {
      const tipo = tipos[i % tipos.length];
      const dormente = dormentesValidosMov[i % dormentesValidosMov.length];
      const outroLocal =
        todosLocaisIds.find((id) => id !== dormente.localId) || dormente.localId;

      const origemLocalId = tipo === 'ENTRADA' ? null : dormente.localId;
      const destinoLocalId =
        tipo === 'SAIDA' ? null : tipo === 'ENTRADA' ? dormente.localId : outroLocal;

      const noPrazo = i % 5 !== 4;
      const diasAtras = i < 5 ? 2 : i < 8 ? 14 : 45;

      await conexao.execute(
        `INSERT INTO movimentacoes
         (id, dormente_id, tipo, origem_local_id, destino_local_id, status, registrada_por, iniciada_em, prazo_previsto_em, concluida_em)
         VALUES (?, ?, ?, ?, ?, 'CONCLUIDA', ?,
           DATE_SUB(NOW(3), INTERVAL ? DAY),
           DATE_ADD(DATE_SUB(NOW(3), INTERVAL ? DAY), INTERVAL 15 MINUTE),
           DATE_ADD(DATE_SUB(NOW(3), INTERVAL ? DAY), INTERVAL ? MINUTE))`,
        [
          randomUUID(),
          dormente.id,
          tipo,
          origemLocalId,
          destinoLocalId,
          req.usuario.id,
          diasAtras,
          diasAtras,
          diasAtras,
          noPrazo ? 8 : 25,
        ]
      );
    }

    await conexao.commit();
    return res.status(201).json({ mensagem: 'Dados de exemplo gerados.' });
  } catch (error) {
    if (conexao) await conexao.rollback().catch(() => {});
    console.error('Erro ao gerar seed:', error.code, error.sqlMessage || error.message);
    return res.status(500).json({ mensagem: 'Erro ao gerar dados de exemplo.' });
  } finally {
    if (conexao) conexao.release();
  }
});

// Remove apenas os lotes e registros criados pelo seed (EX-%)
router.delete('/seed', async (req, res) => {
  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    await limparDadosSeed(conexao);
    await conexao.commit();

    return res.status(200).json({ mensagem: 'Dados de exemplo removidos.' });
  } catch (error) {
    if (conexao) await conexao.rollback().catch(() => {});
    console.error('Erro ao remover seed:', error.code, error.sqlMessage || error.message);
    return res.status(500).json({ mensagem: 'Erro ao remover dados de exemplo.' });
  } finally {
    if (conexao) conexao.release();
  }
});

module.exports = router;