
const jwt = require('jsonwebtoken');
const { autenticar } = require('../services/auth.service');

async function login(req, res) {
  const { email, senha } = req.body || {};

  if (
    typeof email !== 'string' ||
    typeof senha !== 'string' ||
    !email.trim() ||
    !senha ||
    email.length > 255 ||
    senha.length > 1024
  ) {
    return res.status(400).json({
      mensagem: 'Informe um email e uma senha válidos.'
    });
  }

  try {
    const usuario = await autenticar(email, senha);

    if (!usuario) {
      return res.status(401).json({
        mensagem: 'Credenciais inválidas.'
      });
    }

    const token = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        algorithm: 'HS256',
        subject: usuario.id,
        issuer: 'midnighttrain-api',
        audience: 'midnighttrain-app',
        expiresIn: '2h'
      }
    );

    return res.status(200).json({
      token,
      usuario
    });
  } catch (error) {
    console.error('Erro no login:', error.code || error.message);

    return res.status(500).json({
      mensagem: 'Erro interno ao autenticar.'
    });
  }
}

module.exports = { login };
