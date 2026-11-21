
const { Router } = require('express');
const pool = require('../config/db');
const { autenticarToken } = require('../middlewares/auth.middleware');

const router = Router();

router.use(autenticarToken);

router.get('/', async (req, res) => {
  const gerente = req.usuario.role === 'MANAGER';

  if (!gerente && req.usuario.role !== 'EMPLOYEE') {
    return res.status(403).json({
      mensagem: 'Perfil não autorizado.'
    });
  }

  try {
    const filtro = gerente
      ? ''
      : 'WHERE m.registrada_por = ?';

    const parametros = gerente ? [] : [req.usuario.id];

    const [movimentacoes] = await pool.execute(
      `SELECT
        m.id,
        m.tipo,
        m.status,
        m.iniciada_em,
        m.concluida_em,
        m.observacao,

        d.id AS dormenteId,
        d.nome AS dormente,

        l.id AS lote,

        origem.patio AS patioOrigem,
        origem.setor AS setorOrigem,

        destino.patio AS patioDestino,
        destino.setor AS setorDestino,

        f.nome AS responsavel

      FROM movimentacoes m

      JOIN dormentes d
        ON d.id = m.dormente_id

      JOIN lotes l
        ON l.chave = d.loteChave

      JOIN funcionarios f
        ON f.id = m.registrada_por

      LEFT JOIN locais origem
        ON origem.id = m.origem_local_id

      LEFT JOIN locais destino
        ON destino.id = m.destino_local_id

      ${filtro}

      ORDER BY m.iniciada_em DESC, m.id DESC
      LIMIT 50`,
      parametros
    );

    return res.status(200).json(movimentacoes);

  } catch (error) {
    console.error(
      'Erro ao consultar movimentações:',
      error.code || error.message
    );

    return res.status(500).json({
      mensagem: 'Não foi possível consultar as movimentações.'
    });
  }
});

module.exports = router;
