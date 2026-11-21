
const { Router } = require('express');
const pool = require('../config/db');

const {
  autenticarToken,
  autorizarRoles
} = require('../middlewares/auth.middleware');

const router = Router();

// Apenas gerentes podem consultar os indicadores.
router.use(autenticarToken);
router.use(autorizarRoles('MANAGER'));

router.get('/resumo', async (req, res) => {
  try {
    const [
      [dormentes],
      [lotes],
      [movimentacoes],
      [locais]
    ] = await Promise.all([
      pool.execute(`
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(situacao_estoque = 'EM_ESTOQUE'), 0)
            AS emEstoque,
          COALESCE(SUM(situacao_estoque = 'RETIRADO'), 0)
            AS retirados,
          COALESCE(SUM(situacao_estoque = 'EXTRAVIADO'), 0)
            AS extraviados,
          COALESCE(SUM(situacao_estoque = 'NAO_INFORMADO'), 0)
            AS naoInformados
        FROM dormentes
      `),

      pool.execute(`
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(condicao = 'Pendente'), 0)
            AS pendentes,
          COALESCE(SUM(condicao = 'Aprovado'), 0)
            AS aprovados,
          COALESCE(SUM(condicao = 'Reprovado'), 0)
            AS reprovados
        FROM lotes
      `),

      pool.execute(`
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(status = 'CONCLUIDA'), 0)
            AS concluidas,
          COALESCE(SUM(status = 'CONCLUIDA'
            AND tipo = 'ENTRADA'), 0) AS entradas,
          COALESCE(SUM(status = 'CONCLUIDA'
            AND tipo = 'SAIDA'), 0) AS saidas,
          COALESCE(SUM(status = 'CONCLUIDA'
            AND tipo = 'INTERNA'), 0) AS internas
        FROM movimentacoes
      `),

      pool.execute(`
        SELECT COUNT(*) AS ativos
        FROM locais
        WHERE ativo = 1
      `)
    ]);

    // MySQL pode retornar SUM como string.
    const converter = (registro) =>
      Object.fromEntries(
        Object.entries(registro).map(
          ([chave, valor]) => [chave, Number(valor)]
        )
      );

    return res.status(200).json({
      dormentes: converter(dormentes[0]),
      lotes: converter(lotes[0]),
      movimentacoes: converter(movimentacoes[0]),
      locais: converter(locais[0]),
      atualizadoEm: new Date().toISOString()
    });

  } catch (error) {
    console.error(
      'Erro no dashboard:',
      error.code || error.message
    );

    return res.status(500).json({
      mensagem: 'Não foi possível consultar o dashboard.'
    });
  }
});

module.exports = router;
