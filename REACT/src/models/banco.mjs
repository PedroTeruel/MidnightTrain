import { prepararLote } from './estoque.mjs';

export async function inicializarBanco(db) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const { user_version } = await db.getFirstAsync('PRAGMA user_version');
  if (user_version !== 0) return;

  await db.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(`
      CREATE TABLE lotes (
        chave INTEGER PRIMARY KEY, id TEXT NOT NULL UNIQUE,
        setor TEXT NOT NULL, patio TEXT NOT NULL, tamanho TEXT NOT NULL,
        especies TEXT NOT NULL, condicao TEXT NOT NULL
          CHECK (condicao IN ('Pendente', 'Aprovado', 'Reprovado')),
        descricao TEXT NOT NULL, codigoNFC TEXT UNIQUE
      );
      CREATE TABLE dormentes (
        id TEXT PRIMARY KEY NOT NULL, loteChave INTEGER NOT NULL
          REFERENCES lotes(chave) ON DELETE CASCADE,
        nome TEXT NOT NULL, condicao TEXT NOT NULL, tamanho TEXT NOT NULL,
        especie TEXT NOT NULL, ultimaAtualizacao TEXT NOT NULL
      );
      CREATE INDEX dormentes_lote ON dormentes(loteChave);
      CREATE TABLE etiquetas_legadas (
        loteChave INTEGER NOT NULL REFERENCES lotes(chave) ON DELETE CASCADE,
        codigo TEXT NOT NULL, PRIMARY KEY (loteChave, codigo)
      );
      INSERT INTO lotes (chave, id, setor, patio, tamanho, especies, condicao, descricao)
        VALUES (1, '1', 'A', 'Pátio A', '32x29m', 'Araucária', 'Pendente', '');
      INSERT INTO etiquetas_legadas (loteChave, codigo)
        VALUES (1, 'DORMENTE-001'), (1, 'DORMENTE-002'), (1, 'DORMENTE-003');
      PRAGMA user_version = 1;
    `);
    for (const id of ['147', '146', '145']) {
      await tx.runAsync(
        'INSERT INTO dormentes VALUES (?, 1, ?, ?, ?, ?, ?)',
        id, `D-0${id}`, 'Não avaliada', '32x29m', 'Araucária', new Date().toISOString(),
      );
    }
  });
}

export async function carregarEstoque(db) {
  const lotes = await db.getAllAsync('SELECT * FROM lotes ORDER BY id');
  const dormentes = await db.getAllAsync('SELECT * FROM dormentes');
  const etiquetas = await db.getAllAsync('SELECT * FROM etiquetas_legadas');
  return lotes.map(lote => ({
    ...lote,
    codigosNFCLegados: etiquetas.filter(item => item.loteChave === lote.chave).map(item => item.codigo),
    dormentes: dormentes.filter(item => item.loteChave === lote.chave),
  }));
}

export async function salvarLote(db, draft, chave = null) {
  await db.withExclusiveTransactionAsync(async tx => {
    const lotes = await carregarEstoque(tx);
    if (chave !== null && !lotes.some(lote => lote.chave === chave)) {
      throw new Error('Lote não encontrado.');
    }
    const { lote, dormentes } = prepararLote(draft, lotes, chave);
    const valores = [
      lote.id, lote.setor, lote.patio, lote.tamanho, lote.especies,
      lote.condicao, lote.descricao, lote.codigoNFC,
    ];
    if (chave !== null) {
      await tx.runAsync(
        `UPDATE lotes SET id = ?, setor = ?, patio = ?, tamanho = ?, especies = ?,
         condicao = ?, descricao = ?, codigoNFC = ? WHERE chave = ?`,
        ...valores, chave,
      );
      return;
    }

    const resultado = await tx.runAsync(
      `INSERT INTO lotes (id, setor, patio, tamanho, especies, condicao, descricao, codigoNFC)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ...valores,
    );
    const agora = new Date().toISOString();
    for (const dormente of dormentes) {
      await tx.runAsync(
        'INSERT INTO dormentes VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)',
        resultado.lastInsertRowId, dormente.nome, dormente.condicao,
        dormente.tamanho, dormente.especie, agora,
      );
    }
  });
}

export async function salvarDormente(db, id, draft) {
  if (!draft.nome.trim()) throw new Error('O nome é obrigatório.');
  const resultado = await db.runAsync(
    `UPDATE dormentes SET nome = ?, condicao = ?, tamanho = ?, especie = ?,
     ultimaAtualizacao = CASE
       WHEN nome != ? OR condicao != ? OR tamanho != ? OR especie != ? THEN ?
       ELSE ultimaAtualizacao END
     WHERE id = ?`,
    draft.nome, draft.condicao, draft.tamanho, draft.especie,
    draft.nome, draft.condicao, draft.tamanho, draft.especie, new Date().toISOString(), id,
  );
  if (!resultado.changes) throw new Error('Dormente não encontrado.');
}
