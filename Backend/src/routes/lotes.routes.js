const { randomUUID } = require('node:crypto');
const { Router } = require('express');
const pool = require('../config/db');
const { autenticarToken } = require('../middlewares/auth.middleware');

const router = Router();

router.use(autenticarToken);

router.get('/', async (req, res) => {
  try {
    const [lotes] = await pool.execute(
      'SELECT * FROM lotes ORDER BY chave DESC'
    );

    return res.json(lotes);
  } catch (error) {
    console.error('Erro ao consultar lotes:', error.code);
    return res.status(500).json({
      mensagem: 'Erro ao consultar lotes.'
    });
  }
});

router.post('/', async (req, res) => {
  const dados = req.body || {};

  const texto = (valor, limite) =>
    typeof valor === 'string' &&
    valor.trim().length > 0 &&
    valor.trim().length <= limite
      ? valor.trim()
      : null;

  const id = texto(dados.id, 64);
  const setor = texto(dados.setor, 100);
  const tamanho = texto(dados.tamanho, 100);
  const especies = texto(dados.especies, 255);

  const patio = dados.patio ?? '';
  const descricao = dados.descricao ?? '';
  const codigoNFC = dados.codigoNFC || null;
  const condicao = dados.condicao;
  const itens = dados.dormentes ?? [];

  if (
    !id || !setor || !tamanho || !especies ||
    typeof patio !== 'string' || patio.length > 100 ||
    typeof descricao !== 'string' ||
    (codigoNFC !== null &&
      (typeof codigoNFC !== 'string' || codigoNFC.length > 255)) ||
    !['Pendente', 'Aprovado', 'Reprovado'].includes(condicao) ||
    !Array.isArray(itens) ||
    itens.length > 500
  ) {
    return res.status(400).json({
      mensagem: 'Dados do lote inválidos.'
    });
  }

  const dormentes = [];

  for (const item of itens) {
    const nome = texto(item?.nome, 120);
    const tamanhoIndividual = texto(item?.tamanho || tamanho, 100);
    const especieIndividual = texto(item?.especie || especies, 120);

    if (
      !nome || !tamanhoIndividual || !especieIndividual ||
      !['Não avaliada', 'Boa', 'Atenção', 'Ruim']
        .includes(item?.condicao)
    ) {
      return res.status(400).json({
        mensagem: 'Um ou mais dormentes possuem dados inválidos.'
      });
    }

    dormentes.push({
      id: randomUUID(),
      nome,
      tamanho: tamanhoIndividual,
      especie: especieIndividual,
      condicao: item.condicao
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const [resultado] = await conexao.execute(
      `INSERT INTO lotes
       (id, setor, patio, tamanho, especies,
        condicao, descricao, codigoNFC)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, setor, patio.trim(), tamanho,
        especies, condicao, descricao, codigoNFC
      ]
    );

    const chave = resultado.insertId;

    for (const dormente of dormentes) {
      await conexao.execute(
        `INSERT INTO dormentes
         (id, loteChave, nome, condicao,
          tamanho, especie, ultimaAtualizacao)
         VALUES (?, ?, ?, ?, ?, ?, NOW(3))`,
        [
          dormente.id, chave, dormente.nome,
          dormente.condicao, dormente.tamanho,
          dormente.especie
        ]
      );

      await conexao.execute(
        `INSERT INTO historico_alteracoes
         (entidade, entidade_id, acao, dados_novos, usuario_id)
         VALUES ('DORMENTE', ?, 'CRIACAO', ?, ?)`,
        [
          dormente.id,
          JSON.stringify({ ...dormente, loteChave: chave }),
          req.usuario.id
        ]
      );
    }

    await conexao.execute(
      `INSERT INTO historico_alteracoes
       (entidade, entidade_id, acao, dados_novos, usuario_id)
       VALUES ('LOTE', ?, 'CRIACAO', ?, ?)`,
      [
        String(chave),
        JSON.stringify({
          id, setor, patio, tamanho, especies,
          condicao, descricao, codigoNFC,
          quantidadeDormentes: dormentes.length
        }),
        req.usuario.id
      ]
    );

    await conexao.commit();

    return res.status(201).json({
      chave,
      id,
      setor,
      patio,
      tamanho,
      especies,
      condicao,
      descricao,
      codigoNFC,
      dormentes
    });

  } catch (error) {
    if (conexao) {
      await conexao.rollback().catch(() => {});
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensagem: 'ID ou código NFC já cadastrado.'
      });
    }

    console.error('Erro ao cadastrar lote:', error);

    return res.status(500).json({
      mensagem: 'Não foi possível cadastrar o lote.'
    });
  } finally {
    if (conexao) conexao.release();
  }
});


router.put('/:chave', async (req, res) => {
  const chave = Number(req.params.chave);
  const dados = req.body || {};

  const texto = (valor, limite, obrigatorio = true) => {
    if (typeof valor !== 'string') return null;

    const normalizado = valor.trim();

    if (normalizado.length > limite) return null;
    if (obrigatorio && !normalizado) return null;

    return normalizado;
  };

  const atualizado = {
    id: texto(dados.id, 64),
    setor: texto(dados.setor, 100),
    patio: texto(dados.patio ?? '', 100, false),
    tamanho: texto(dados.tamanho, 100),
    especies: texto(dados.especies, 255),
    condicao: dados.condicao,
    descricao: texto(dados.descricao ?? '', 65535, false),
    codigoNFC: dados.codigoNFC == null || dados.codigoNFC === ''
      ? null
      : texto(dados.codigoNFC, 255)
  };

  if (
    !Number.isSafeInteger(chave) || chave <= 0 ||
    Object.values(atualizado).some(
      valor => valor === null
    ) && atualizado.codigoNFC !== null ||
    !atualizado.id ||
    !atualizado.setor ||
    atualizado.patio === null ||
    !atualizado.tamanho ||
    !atualizado.especies ||
    atualizado.descricao === null ||
    (dados.codigoNFC && atualizado.codigoNFC === null) ||
    !['Pendente', 'Aprovado', 'Reprovado'].includes(atualizado.condicao)
  ) {
    return res.status(400).json({
      mensagem: 'Dados do lote inválidos.'
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const [registros] = await conexao.execute(
      'SELECT * FROM lotes WHERE chave = ? FOR UPDATE',
      [chave]
    );

    if (!registros.length) {
      await conexao.rollback();
      return res.status(404).json({
        mensagem: 'Lote não encontrado.'
      });
    }

    const anterior = registros[0];

    await conexao.execute(
      `UPDATE lotes
       SET id = ?, setor = ?, patio = ?, tamanho = ?,
           especies = ?, condicao = ?, descricao = ?,
           codigoNFC = ?
       WHERE chave = ?`,
      [
        atualizado.id,
        atualizado.setor,
        atualizado.patio,
        atualizado.tamanho,
        atualizado.especies,
        atualizado.condicao,
        atualizado.descricao,
        atualizado.codigoNFC,
        chave
      ]
    );

    await conexao.execute(
      `INSERT INTO historico_alteracoes
       (entidade, entidade_id, acao,
        dados_anteriores, dados_novos, usuario_id)
       VALUES ('LOTE', ?, 'ATUALIZACAO', ?, ?, ?)`,
      [
        String(chave),
        JSON.stringify(anterior),
        JSON.stringify({ chave, ...atualizado }),
        req.usuario.id
      ]
    );

    await conexao.commit();

    return res.status(200).json({
      chave,
      ...atualizado
    });

  } catch (error) {
    if (conexao) {
      await conexao.rollback().catch(() => {});
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensagem: 'ID ou etiqueta NFC já cadastrada.'
      });
    }

    console.error('Erro ao atualizar lote:', error.code || error.message);

    return res.status(500).json({
      mensagem: 'Não foi possível atualizar o lote.'
    });
  } finally {
    if (conexao) conexao.release();
  }
});

module.exports = router;
