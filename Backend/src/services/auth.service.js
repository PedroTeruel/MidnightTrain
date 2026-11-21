
const argon2 = require('argon2');
const pool = require('../config/db');

async function autenticar(email, senha) {
  const [rows] = await pool.execute(
    `SELECT id, nome, email, senha_hash, role, ativo
     FROM funcionarios
     WHERE email = ?
     LIMIT 1`,
    [email.trim().toLowerCase()]
  );

  const funcionario = rows[0];

  if (!funcionario || !funcionario.ativo) {
    return null;
  }

  const senhaValida = await argon2.verify(
    funcionario.senha_hash,
    senha
  );

  if (!senhaValida) {
    return null;
  }

  return {
    id: funcionario.id,
    nome: funcionario.nome,
    email: funcionario.email,
    role: funcionario.role
  };
}

module.exports = { autenticar };
