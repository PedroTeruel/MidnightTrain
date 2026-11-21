
const { Router } = require('express');
const pool = require('../config/db');
const {
  autenticarToken,
  autorizarRoles,
} = require('../middlewares/auth.middleware');

const router = Router();

router.use(autenticarToken);

// Consulta os locais disponíveis.
router.get('/', async (req, res) => {
  try {
    const [locais] = await pool.execute(
      `SELECT id, patio, setor
       FROM locais
       WHERE ativo = 1
       ORDER BY patio, setor`
    );

    return res.json(locais);
  } catch (error) {
    console.error('Erro ao consultar locais:', error.code);
    return res.status(500).json({
      mensagem: 'Não foi possível consultar os locais.',
    });
  }
});

// Cadastra um local de armazenamento.
router.post('/', autorizarRoles('MANAGER'), async (req, res) => {
  const { patio, setor } = req.body || {};

  if (
    typeof patio !== 'string' ||
    typeof setor !== 'string' ||
    !patio.trim() ||
    !setor.trim() ||
    patio.trim().length > 100 ||
    setor.trim().length > 100
  ) {
    return res.status(400).json({
      mensagem: 'Informe um pátio e um setor válidos.',
    });
  }

  const patioNormalizado = patio.trim();
  const setorNormalizado = setor.trim();

  try {
    const [resultado] = await pool.execute(
      'INSERT INTO locais (patio, setor) VALUES (?, ?)',
      [patioNormalizado, setorNormalizado]
    );

    return res.status(201).json({
      id: resultado.insertId,
      patio: patioNormalizado,
      setor: setorNormalizado,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensagem: 'Este pátio e setor já estão cadastrados.',
      });
    }

    console.error('Erro ao cadastrar local:', error.code);
    return res.status(500).json({
      mensagem: 'Não foi possível cadastrar o local.',
    });
  }
});

module.exports = router;
