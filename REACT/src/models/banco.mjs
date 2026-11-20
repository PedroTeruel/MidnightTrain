import { prepararLote } from './estoque.mjs';

export async function inicializarBanco(db) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const { user_version } = await db.getFirstAsync('PRAGMA user_version');
  if (user_version === 0) await criarVersao1(db);
  if (user_version < 2) await migrarParaVersao2(db);
}

async function criarVersao1(db) {
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

// Versão 2: extravio, localização própria do dormente, histórico, movimentações e buscas.
async function migrarParaVersao2(db) {
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(`
      ALTER TABLE dormentes ADD COLUMN extraviadoEm TEXT;
      ALTER TABLE dormentes ADD COLUMN criadoEm TEXT;
      ALTER TABLE dormentes ADD COLUMN patio TEXT;
      ALTER TABLE dormentes ADD COLUMN setor TEXT;
      ALTER TABLE dormentes ADD COLUMN saidaEm TEXT;
      UPDATE dormentes SET criadoEm = ultimaAtualizacao;
      CREATE INDEX dormentes_condicao ON dormentes(condicao);
      CREATE INDEX dormentes_atualizacao ON dormentes(ultimaAtualizacao);

      CREATE TABLE movimentacoes (
        id TEXT PRIMARY KEY NOT NULL,
        dormenteId TEXT NOT NULL REFERENCES dormentes(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK (tipo IN ('Entrada', 'Saída', 'Interna')),
        origem TEXT, destino TEXT, destinoPatio TEXT, destinoSetor TEXT,
        dataHora TEXT NOT NULL, prazoSegundos INTEGER, concluidaEm TEXT,
        usuarioId INTEGER -- quem registrou; fica nulo até existir login
      );
      CREATE INDEX movimentacoes_data ON movimentacoes(dataHora);
      CREATE INDEX movimentacoes_dormente ON movimentacoes(dormenteId);
      CREATE TABLE buscas (
        id TEXT PRIMARY KEY NOT NULL,
        dormenteId TEXT REFERENCES dormentes(id) ON DELETE SET NULL,
        iniciadaEm TEXT NOT NULL, localizadaEm TEXT,
        usuarioId INTEGER
      );
      CREATE INDEX buscas_data ON buscas(iniciadaEm);
      CREATE TABLE historico_condicao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dormenteId TEXT NOT NULL REFERENCES dormentes(id) ON DELETE CASCADE,
        condicaoAnterior TEXT, condicaoNova TEXT NOT NULL, dataHora TEXT NOT NULL,
        usuarioId INTEGER
      );
      CREATE INDEX historico_dormente ON historico_condicao(dormenteId, dataHora);

      CREATE TABLE preferencias (chave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);

      CREATE VIEW dormentes_loc AS
        SELECT d.*, COALESCE(d.patio, l.patio) AS patioAtual, COALESCE(d.setor, l.setor) AS setorAtual,
               l.id AS loteId, l.condicao AS aprovacao
        FROM dormentes d JOIN lotes l ON l.chave = d.loteChave;
      CREATE VIEW dormentes_estoque AS SELECT * FROM dormentes_loc WHERE saidaEm IS NULL;
      PRAGMA user_version = 2;
    `);
  });
}

export async function carregarEstoque(db) {
  const lotes = await db.getAllAsync('SELECT * FROM lotes ORDER BY id');
  const dormentes = await db.getAllAsync('SELECT * FROM dormentes WHERE saidaEm IS NULL');
  const etiquetas = await db.getAllAsync('SELECT * FROM etiquetas_legadas');
  return lotes.map(lote => ({
    ...lote,
    codigosNFCLegados: etiquetas.filter(item => item.loteChave === lote.chave).map(item => item.codigo),
    dormentes: dormentes.filter(item => item.loteChave === lote.chave),
  }));
}

export async function salvarLote(db, draft, chave = null, usuarioId = null) {
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
      const id = (await tx.getFirstAsync('SELECT lower(hex(randomblob(16))) AS id')).id;
      await tx.runAsync(
        `INSERT INTO dormentes (id, loteChave, nome, condicao, tamanho, especie, ultimaAtualizacao, criadoEm)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id, resultado.lastInsertRowId, dormente.nome, dormente.condicao,
        dormente.tamanho, dormente.especie, agora, agora,
      );
      // Cadastro do lote = entrada de estoque (RF04). Entrada automática não entra no cálculo de eficiência.
      await tx.runAsync(
        `INSERT INTO movimentacoes (id, dormenteId, tipo, origem, destino, destinoPatio, destinoSetor,
           dataHora, prazoSegundos, concluidaEm, usuarioId)
         VALUES (lower(hex(randomblob(16))), ?, 'Entrada', 'recebimento', ?, ?, ?, ?, NULL, ?, ?)`,
        id, `${lote.patio} · Setor ${lote.setor}`, lote.patio, lote.setor, agora, agora, usuarioId,
      );
    }
  });
}

export async function salvarDormente(db, id, draft, usuarioId = null) {
  if (!draft.nome.trim()) throw new Error('O nome é obrigatório.');
  await db.withExclusiveTransactionAsync(async tx => {
    const atual = await tx.getFirstAsync('SELECT condicao FROM dormentes WHERE id = ?', id);
    if (!atual) throw new Error('Dormente não encontrado.');
    const agora = new Date().toISOString();
    await tx.runAsync(
      `UPDATE dormentes SET nome = ?, condicao = ?, tamanho = ?, especie = ?,
       ultimaAtualizacao = CASE
         WHEN nome != ? OR condicao != ? OR tamanho != ? OR especie != ? THEN ?
         ELSE ultimaAtualizacao END
       WHERE id = ?`,
      draft.nome, draft.condicao, draft.tamanho, draft.especie,
      draft.nome, draft.condicao, draft.tamanho, draft.especie, agora, id,
    );
    if (atual.condicao !== draft.condicao) {
      await tx.runAsync(
        `INSERT INTO historico_condicao (dormenteId, condicaoAnterior, condicaoNova, dataHora, usuarioId)
         VALUES (?, ?, ?, ?, ?)`,
        id, atual.condicao, draft.condicao, agora, usuarioId,
      );
    }
  });
}
