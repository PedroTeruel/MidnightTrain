
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function autenticarToken(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer (.+)$/i.exec(authorization);

  if (!match) {
    return res.status(401).json({
      mensagem: 'Token não informado.'
    });
  }

  let payload;

  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'midnighttrain-api',
      audience: 'midnighttrain-app'
    });
  } catch {
    return res.status(401).json({
      mensagem: 'Token inválido ou expirado.'
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, nome, email, role
       FROM funcionarios
       WHERE id = ? AND ativo = 1
       LIMIT 1`,
      [payload.sub]
    );

    if (!rows.length) {
      return res.status(401).json({
        mensagem: 'Funcionário inativo ou inexistente.'
      });
    }

    req.usuario = rows[0];
    next();
  } catch (error) {
    console.error('Erro ao validar usuário:', error.code || error.message);

    return res.status(503).json({
      mensagem: 'Serviço temporariamente indisponível.'
    });
  }
}

function autorizarRoles(...rolesPermitidas) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensagem: 'Autenticação necessária.'
      });
    }

    if (!rolesPermitidas.includes(req.usuario.role)) {
      return res.status(403).json({
        mensagem: 'Você não possui permissão para acessar este recurso.'
      });
    }

    next();
  };
}

module.exports = {
  autenticarToken,
  autorizarRoles
};
