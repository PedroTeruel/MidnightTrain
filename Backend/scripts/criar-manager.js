
require('dotenv').config();

const { randomUUID, randomBytes } = require('node:crypto');
const argon2 = require('argon2');
const pool = require('../src/config/db');

async function main() {
  const email = 'manager@teste.com';

  const [existentes] = await pool.execute(
    'SELECT id FROM funcionarios WHERE email = ?',
    [email]
  );

  if (existentes.length > 0) {
    console.log('Gerente já cadastrado.');
    return;
  }

  const senha = randomBytes(24).toString('base64url');

  const senhaHash = await argon2.hash(senha, {
    type: argon2.argon2id
  });

  await pool.execute(
    `INSERT INTO funcionarios
      (id, nome, email, senha_hash, role, ativo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      'Gerente Teste',
      email,
      senhaHash,
      'MANAGER',
      1
    ]
  );

  console.log('Gerente criado com sucesso!');
  console.log('Email:', email);
  console.log('Senha temporária:', senha);
  console.log('Perfil: MANAGER');
  console.log('Guarde a senha e não compartilhe.');
}

main()
  .catch(error => {
    console.error('Erro:', error.code || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
