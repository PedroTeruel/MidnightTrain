import { DatabaseSync } from 'node:sqlite';

export function abrirBanco(caminho = ':memory:') {
  const sqlite = new DatabaseSync(caminho);
  const db = {
    async execAsync(sql) { sqlite.exec(sql); },
    async getFirstAsync(sql, ...params) { return sqlite.prepare(sql).get(...params); },
    async getAllAsync(sql, ...params) { return sqlite.prepare(sql).all(...params); },
    async runAsync(sql, ...params) {
      const resultado = sqlite.prepare(sql).run(...params);
      return { changes: resultado.changes, lastInsertRowId: Number(resultado.lastInsertRowid) };
    },
    async withExclusiveTransactionAsync(operacao) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const retorno = await operacao(db);
        sqlite.exec('COMMIT');
        return retorno;
      } catch (erro) {
        sqlite.exec('ROLLBACK');
        throw erro;
      }
    },
    fechar() { sqlite.close(); },
  };
  return db;
}
