
require('dotenv').config();

const { randomUUID, randomBytes } = require('node:crypto');
const argon2 = require('argon2');
const pool = require('../src/config/db');

async function main() {
  const email = 'funcionario@teste.com';

  const [existentes] = await pool.execute(
    'SELECT id FROM funcionarios WHERE email = ?',
    [email]
  );

  if (existentes.length) {
    console.log('Funcionário de teste já cadastrado.');
    return;
  }

  const senha = randomBytes(18).toString('base64url');

  const senhaHash = await argon2.hash(senha, {
    type: argon2.argon2id
  });

  await pool.execute(
    `INSERT INTO funcionarios
       (id, nome, email, senha_hash, role, ativo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      'Funcionário Teste',
      email,
      senhaHash,
      'EMPLOYEE',
      1
    ]
  );

  console.log('Funcionário criado com sucesso!');
  console.log('Email:', email);
  console.log('Senha temporária:', senha);
  console.log('Guarde a senha: ela não será exibida novamente.');
}

main()
  .catch(error => {
    console.error('Erro:', error.code || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
