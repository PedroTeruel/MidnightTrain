
require('dotenv').config();

const argon2 = require('argon2');
const pool = require('../src/config/db');

const contas = [
  {
    email: 'funcionario@teste.com',
    role: 'EMPLOYEE',
    variavel: 'MT_FUNCIONARIO_NOVA_SENHA'
  },
  {
    email: 'manager@teste.com',
    role: 'MANAGER',
    variavel: 'MT_GERENTE_NOVA_SENHA'
  }
];

async function main() {
  const senhas = contas.map(conta => process.env[conta.variavel]);

  if (senhas.some(senha => !senha || senha.length < 14 || senha.length > 1024)) {
    throw new Error('As duas senhas precisam ter entre 14 e 1024 caracteres.');
  }

  if (senhas[0] === senhas[1]) {
    throw new Error('As senhas do funcionário e do gerente precisam ser diferentes.');
  }

  const atualizacoes = await Promise.all(
    contas.map(async conta => ({
      ...conta,
      hash: await argon2.hash(process.env[conta.variavel], {
        type: argon2.argon2id
      })
    }))
  );

  const connection = await pool.getConnection();
  let transacaoIniciada = false;

  try {
    await connection.beginTransaction();
    transacaoIniciada = true;

    for (const conta of atualizacoes) {
      const [resultado] = await connection.execute(
        `UPDATE funcionarios
         SET senha_hash = ?
         WHERE email = ? AND role = ? AND ativo = 1`,
        [conta.hash, conta.email, conta.role]
      );

      if (resultado.affectedRows !== 1) {
        throw new Error(
          `Não foi possível atualizar ${conta.email}. Verifique se a conta existe, está ativa e possui o perfil esperado.`
        );
      }
    }

    await connection.commit();
    transacaoIniciada = false;

    console.log('Senhas das duas contas atualizadas com sucesso.');
  } catch (error) {
    if (transacaoIniciada) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

main()
  .catch(error => {
    console.error('Falha ao atualizar senhas:', error.code || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
