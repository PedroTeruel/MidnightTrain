
const { Router } = require('express');
const { randomUUID } = require('node:crypto');
const pool = require('../config/db');
const { autenticarToken } = require('../middlewares/auth.middleware');

const router = Router();
router.use(autenticarToken);

const condicoesValidas = ['Não avaliada', 'Boa', 'Atenção', 'Ruim'];

router.get('/', async (req, res) => {
  const loteChave = Number(req.query.loteChave);

  if (!Number.isSafeInteger(loteChave) || loteChave <= 0) {
    return res.status(400).json({
      mensagem: 'Informe um loteChave válido.'
    });
  }

  try {
    const [dormentes] = await pool.execute(
      `SELECT *
       FROM dormentes
       WHERE loteChave = ?
       ORDER BY nome`,
      [loteChave]
    );

    return res.json(dormentes);
  } catch (error) {
    console.error('Erro ao consultar dormentes:', error.code);
    return res.status(500).json({
      mensagem: 'Erro ao consultar dormentes.'
    });
  }
});

router.post('/', async (req, res) => {
  const { loteChave, nome, condicao, tamanho, especie } = req.body || {};
  const chave = Number(loteChave);

  if (
    !Number.isSafeInteger(chave) || chave <= 0 ||
    typeof nome !== 'string' || !nome.trim() || nome.length > 120 ||
    !condicoesValidas.includes(condicao) ||
    typeof tamanho !== 'string' || !tamanho.trim() || tamanho.length > 100 ||
    typeof especie !== 'string' || !especie.trim() || especie.length > 120
  ) {
    return res.status(400).json({
      mensagem: 'Dados do dormente inválidos.'
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const [lotes] = await conexao.execute(
      'SELECT chave FROM lotes WHERE chave = ? FOR UPDATE',
      [chave]
    );

    if (!lotes.length) {
      await conexao.rollback();
      return res.status(404).json({
        mensagem: 'Lote não encontrado.'
      });
    }

    const [[contagem]] = await conexao.execute(
      'SELECT COUNT(*) AS total FROM dormentes WHERE loteChave = ?',
      [chave]
    );

    if (contagem.total >= 500) {
      await conexao.rollback();
      return res.status(409).json({
        mensagem: 'O lote já possui 500 dormentes.'
      });
    }

    const dormente = {
      id: randomUUID(),
      loteChave: chave,
      nome: nome.trim(),
      condicao,
      tamanho: tamanho.trim(),
      especie: especie.trim(),
      situacao_estoque: 'NAO_INFORMADO',
      local_id: null
    };

    await conexao.execute(
      `INSERT INTO dormentes
       (id, loteChave, nome, condicao, tamanho, especie, ultimaAtualizacao)
       VALUES (?, ?, ?, ?, ?, ?, NOW(3))`,
      [
        dormente.id,
        dormente.loteChave,
        dormente.nome,
        dormente.condicao,
        dormente.tamanho,
        dormente.especie
      ]
    );

    await conexao.execute(
      `INSERT INTO historico_alteracoes
       (entidade, entidade_id, acao, dados_novos, usuario_id)
       VALUES ('DORMENTE', ?, 'CRIACAO', ?, ?)`,
      [
        dormente.id,
        JSON.stringify(dormente),
        req.usuario.id
      ]
    );

    await conexao.commit();

    return res.status(201).json(dormente);
  } catch (error) {
    if (conexao) {
      await conexao.rollback().catch(() => {});
    }

    console.error('Erro ao cadastrar dormente:', error.code || error.message);

    return res.status(500).json({
      mensagem: 'Não foi possível cadastrar o dormente.'
    });
  } finally {
    if (conexao) conexao.release();
  }
});


router.post('/:id/entrada', async (req, res) => {
  const { id } = req.params;
  const localId = Number(req.body?.localId);

  if (
    !Number.isSafeInteger(localId) ||
    localId <= 0
  ) {
    return res.status(400).json({
      mensagem: 'Informe um localId válido.'
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Bloqueia o dormente durante a operação.
    const [dormentes] = await conexao.execute(
      `SELECT id, local_id, situacao_estoque
       FROM dormentes
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    const dormente = dormentes[0];

    if (!dormente) {
      await conexao.rollback();
      return res.status(404).json({
        mensagem: 'Dormente não encontrado.'
      });
    }

    if (dormente.situacao_estoque !== 'NAO_INFORMADO') {
      await conexao.rollback();
      return res.status(409).json({
        mensagem: 'Este dormente não está disponível para entrada inicial.'
      });
    }

    // Verifica se o destino existe e está ativo.
    const [locais] = await conexao.execute(
      'SELECT id, patio, setor FROM locais WHERE id = ? AND ativo = 1',
      [localId]
    );

    if (!locais.length) {
      await conexao.rollback();
      return res.status(404).json({
        mensagem: 'Local de destino não encontrado.'
      });
    }

    const movimentacaoId = randomUUID();

    // Registra a entrada concluída.
    await conexao.execute(
      `INSERT INTO movimentacoes
       (
         id, dormente_id, tipo, origem_local_id,
         destino_local_id, status, registrada_por,
         iniciada_em, concluida_em
       )
       VALUES (?, ?, 'ENTRADA', NULL, ?, 'CONCLUIDA', ?,
               NOW(3), NOW(3))`,
      [
        movimentacaoId,
        id,
        localId,
        req.usuario.id
      ]
    );

    // Atualiza a situação e localização do dormente.
    await conexao.execute(
      `UPDATE dormentes
       SET situacao_estoque = 'EM_ESTOQUE',
           local_id = ?,
           ultimaAtualizacao = NOW(3)
       WHERE id = ?`,
      [localId, id]
    );

    // Preserva a alteração na auditoria.
    await conexao.execute(
      `INSERT INTO historico_alteracoes
       (entidade, entidade_id, acao,
        dados_anteriores, dados_novos, usuario_id)
       VALUES ('DORMENTE', ?, 'ENTRADA_ESTOQUE', ?, ?, ?)`,
      [
        id,
        JSON.stringify({
          situacao_estoque: dormente.situacao_estoque,
          local_id: dormente.local_id
        }),
        JSON.stringify({
          situacao_estoque: 'EM_ESTOQUE',
          local_id: localId,
          movimentacao_id: movimentacaoId
        }),
        req.usuario.id
      ]
    );

    await conexao.commit();

    return res.status(201).json({
      mensagem: 'Entrada registrada com sucesso.',
      movimentacao: {
        id: movimentacaoId,
        tipo: 'ENTRADA',
        status: 'CONCLUIDA',
        destino: locais[0]
      },
      dormente: {
        id,
        situacao_estoque: 'EM_ESTOQUE',
        local_id: localId
      }
    });

  } catch (error) {
    if (conexao) {
      await conexao.rollback().catch(() => {});
    }

    console.error(
      'Erro ao registrar entrada:',
      error.code || error.message
    );

    return res.status(500).json({
      mensagem: 'Não foi possível registrar a entrada.'
    });
  } finally {
    if (conexao) conexao.release();
  }
});


router.post('/:id/transferencia', async (req, res) => {
  const { id } = req.params;
  const destinoLocalId = Number(req.body?.destinoLocalId);
  const observacao = req.body?.observacao ?? null;

  if (
    !Number.isSafeInteger(destinoLocalId) ||
    destinoLocalId <= 0 ||
    (observacao !== null &&
      (typeof observacao !== 'string' || observacao.length > 500))
  ) {
    return res.status(400).json({
      mensagem: 'Dados da transferência inválidos.'
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Bloqueia o dormente para impedir transferências simultâneas.
    const [dormentes] = await conexao.execute(
      `SELECT id, situacao_estoque, local_id
       FROM dormentes
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    const dormente = dormentes[0];

    if (!dormente) {
      await conexao.rollback();
      return res.status(404).json({
        mensagem: 'Dormente não encontrado.'
      });
    }

    if (
      dormente.situacao_estoque !== 'EM_ESTOQUE' ||
      dormente.local_id === null
    ) {
      await conexao.rollback();
      return res.status(409).json({
        mensagem: 'Dormente não está disponível para transferência.'
      });
    }

    if (Number(dormente.local_id) === destinoLocalId) {
      await conexao.rollback();
      return res.status(409).json({
        mensagem: 'Origem e destino devem ser diferentes.'
      });
    }

    const [locais] = await conexao.execute(
      `SELECT id, patio, setor
       FROM locais
       WHERE id = ? AND ativo = 1`,
      [destinoLocalId]
    );

    if (!locais.length) {
      await conexao.rollback();
      return res.status(404).json({
        mensagem: 'Local de destino não encontrado ou inativo.'
      });
    }

    const origemLocalId = Number(dormente.local_id);
    const movimentacaoId = randomUUID();

    await conexao.execute(
      `INSERT INTO movimentacoes (
        id, dormente_id, tipo,
        origem_local_id, destino_local_id,
        status, registrada_por,
        iniciada_em, concluida_em, observacao
      )
      VALUES (?, ?, 'INTERNA', ?, ?,
              'CONCLUIDA', ?, NOW(3), NOW(3), ?)`,
      [
        movimentacaoId,
        id,
        origemLocalId,
        destinoLocalId,
        req.usuario.id,
        observacao
      ]
    );

    await conexao.execute(
      `UPDATE dormentes
       SET local_id = ?,
           ultimaAtualizacao = NOW(3)
       WHERE id = ?`,
      [destinoLocalId, id]
    );

    await conexao.execute(
      `INSERT INTO historico_alteracoes (
        entidade, entidade_id, acao,
        dados_anteriores, dados_novos, usuario_id
      )
      VALUES ('DORMENTE', ?, 'MOVIMENTACAO_INTERNA', ?, ?, ?)`,
      [
        id,
        JSON.stringify({ local_id: origemLocalId }),
        JSON.stringify({
          local_id: destinoLocalId,
          movimentacao_id: movimentacaoId
        }),
        req.usuario.id
      ]
    );

    await conexao.commit();

    return res.status(201).json({
      mensagem: 'Transferência realizada com sucesso.',
      movimentacaoId,
      dormenteId: id,
      origemLocalId,
      destinoLocalId
    });

  } catch (error) {
    if (conexao) {
      await conexao.rollback().catch(() => {});
    }

    console.error(
      'Erro na transferência:',
      error.code || error.message
    );

    return res.status(500).json({
      mensagem: 'Não foi possível realizar a transferência.'
    });
  } finally {
    if (conexao) conexao.release();
  }
});


router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const dados = req.body || {};

  const texto = (valor, limite) => {
    if (typeof valor !== 'string') return null;

    const normalizado = valor.trim();

    if (!normalizado || normalizado.length > limite) {
      return null;
    }

    return normalizado;
  };

  const atualizado = {
    nome: texto(dados.nome, 120),
    condicao: dados.condicao,
    tamanho: texto(dados.tamanho, 100),
    especie: texto(dados.especie, 120)
  };

  if (
    typeof id !== 'string' ||
    !id.trim() ||
    id.length > 36 ||
    !atualizado.nome ||
    !condicoesValidas.includes(atualizado.condicao) ||
    !atualizado.tamanho ||
    !atualizado.especie
  ) {
    return res.status(400).json({
      mensagem: 'Dados do dormente inválidos.'
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const [registros] = await conexao.execute(
      `SELECT *
       FROM dormentes
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (!registros.length) {
      await conexao.rollback();

      return res.status(404).json({
        mensagem: 'Dormente não encontrado.'
      });
    }

    const anterior = registros[0];

    const semAlteracao =
      anterior.nome === atualizado.nome &&
      anterior.condicao === atualizado.condicao &&
      anterior.tamanho === atualizado.tamanho &&
      anterior.especie === atualizado.especie;

    if (semAlteracao) {
      await conexao.commit();
      return res.status(200).json(anterior);
    }

    await conexao.execute(
      `UPDATE dormentes
       SET nome = ?,
           condicao = ?,
           tamanho = ?,
           especie = ?,
           ultimaAtualizacao = NOW(3)
       WHERE id = ?`,
      [
        atualizado.nome,
        atualizado.condicao,
        atualizado.tamanho,
        atualizado.especie,
        id
      ]
    );

    const [registrosAtualizados] = await conexao.execute(
      'SELECT * FROM dormentes WHERE id = ?',
      [id]
    );

    const novoRegistro = registrosAtualizados[0];

    await conexao.execute(
      `INSERT INTO historico_alteracoes
       (entidade, entidade_id, acao,
        dados_anteriores, dados_novos, usuario_id)
       VALUES ('DORMENTE', ?, 'ATUALIZACAO', ?, ?, ?)`,
      [
        id,
        JSON.stringify(anterior),
        JSON.stringify(novoRegistro),
        req.usuario.id
      ]
    );

    await conexao.commit();

    return res.status(200).json(novoRegistro);

  } catch (error) {
    if (conexao) {
      await conexao.rollback().catch(() => {});
    }

    console.error(
      'Erro ao atualizar dormente:',
      error.code || error.message
    );

    return res.status(500).json({
      mensagem: 'Não foi possível atualizar o dormente.'
    });
  } finally {
    if (conexao) conexao.release();
  }
});



router.post('/:id/saida', async (req, res) => {
  const { id } = req.params;
  const observacao = req.body?.observacao ?? null;

  if (
    observacao !== null &&
    (typeof observacao !== 'string' || observacao.length > 500)
  ) {
    return res.status(400).json({
      mensagem: 'Observação inválida.'
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const [dormentes] = await conexao.execute(
      `SELECT id, local_id, situacao_estoque
       FROM dormentes
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    const dormente = dormentes[0];

    if (!dormente) {
      await conexao.rollback();
      return res.status(404).json({
        mensagem: 'Dormente não encontrado.'
      });
    }

    if (
      dormente.situacao_estoque !== 'EM_ESTOQUE' ||
      dormente.local_id === null
    ) {
      await conexao.rollback();
      return res.status(409).json({
        mensagem: 'Dormente não está disponível para saída.'
      });
    }

    const origemLocalId = Number(dormente.local_id);
    const movimentacaoId = randomUUID();

    await conexao.execute(
      `INSERT INTO movimentacoes (
        id, dormente_id, tipo,
        origem_local_id, destino_local_id,
        status, registrada_por,
        iniciada_em, concluida_em, observacao
      )
      VALUES (
        ?, ?, 'SAIDA',
        ?, NULL,
        'CONCLUIDA', ?,
        NOW(3), NOW(3), ?
      )`,
      [
        movimentacaoId,
        id,
        origemLocalId,
        req.usuario.id,
        observacao
      ]
    );

    await conexao.execute(
      `UPDATE dormentes
       SET situacao_estoque = 'RETIRADO',
           local_id = NULL,
           ultimaAtualizacao = NOW(3)
       WHERE id = ?`,
      [id]
    );

    await conexao.execute(
      `INSERT INTO historico_alteracoes (
        entidade, entidade_id, acao,
        dados_anteriores, dados_novos, usuario_id
      )
      VALUES ('DORMENTE', ?, 'SAIDA_ESTOQUE', ?, ?, ?)`,
      [
        id,
        JSON.stringify({
          situacao_estoque: 'EM_ESTOQUE',
          local_id: origemLocalId
        }),
        JSON.stringify({
          situacao_estoque: 'RETIRADO',
          local_id: null,
          movimentacao_id: movimentacaoId
        }),
        req.usuario.id
      ]
    );

    await conexao.commit();

    return res.status(201).json({
      mensagem: 'Saída registrada com sucesso.',
      movimentacaoId,
      dormenteId: id,
      origemLocalId,
      situacao_estoque: 'RETIRADO'
    });

  } catch (error) {
    if (conexao) {
      await conexao.rollback().catch(() => {});
    }

    console.error(
      'Erro ao registrar saída:',
      error.code || error.message
    );

    return res.status(500).json({
      mensagem: 'Não foi possível registrar a saída.'
    });
  } finally {
    if (conexao) conexao.release();
  }
});


module.exports = router;
