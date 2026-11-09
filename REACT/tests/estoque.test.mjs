import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { filtrarLotes, localizarEtiqueta, novoItem, prepararLote, quantidadeValida, rascunhoLote } from '../src/models/estoque.mjs';
import { carregarEstoque, inicializarBanco, salvarDormente, salvarLote } from '../src/models/banco.mjs';

function abrirBanco(caminho) {
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
        await operacao(db);
        sqlite.exec('COMMIT');
      } catch (erro) {
        sqlite.exec('ROLLBACK');
        throw erro;
      }
    },
    fechar() { sqlite.close(); },
  };
  return db;
}

function cadastro() {
  return {
    ...rascunhoLote(null, ' TAG-42 '), id: ' L42 ', setor: 'B', patio: 'Pátio Norte',
    tamanho: '250 cm', especies: 'Araucária', condicao: 'Aprovado', descricao: 'Recebimento',
    quantidade: '2',
    itens: {
      0: { ...novoItem(), nome: ' Peça A ' },
      1: { ...novoItem(), nome: 'Peça B', tamanho: '260 cm', especie: 'Eucalipto', condicao: 'Boa' },
    },
  };
}

test('regras de cadastro, busca, códigos NFC exatos e ambiguidade', () => {
  const draft = cadastro();
  const { lote, dormentes } = prepararLote(draft, [], null);
  assert.equal(lote.id, 'L42');
  assert.equal(lote.codigoNFC, 'TAG-42');
  assert.equal(dormentes[0].nome, 'Peça A');
  assert.equal(dormentes[0].tamanho, '250 cm');
  assert.equal(dormentes[1].especie, 'Eucalipto');
  assert.equal(draft.itens[0].nome, ' Peça A ');
  assert.equal(filtrarLotes([lote], 'araucaria', 'Aprovado').length, 1);
  assert.equal(filtrarLotes([lote], 'Norte', 'Pendente').length, 0);
  assert.equal(localizarEtiqueta([lote], 'tag-42').length, 0);
  assert.equal(localizarEtiqueta([lote, { ...lote, codigoNFC: null, codigosNFCLegados: ['TAG-42'] }], 'TAG-42').length, 2);
  assert.equal(quantidadeValida('500'), true);
  for (const valor of ['501', '0', '', '1.5', '-1']) assert.equal(quantidadeValida(valor), false);
  assert.throws(() => prepararLote({ ...draft, setor: ' ' }, [], null), /Preencha/);
  assert.throws(() => prepararLote({ ...draft, quantidade: '3' }, [], null), /nome de cada dormente/);
});

test('SQLite preserva lotes, relações, códigos legados e edições após reabrir', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'midnighttrain-'));
  const caminho = join(pasta, 'estoque.db');
  let db = abrirBanco(caminho);
  try {
    await inicializarBanco(db);
    const iniciais = await carregarEstoque(db);
    assert.equal(iniciais.length, 1);
    assert.equal(iniciais[0].dormentes.length, 3);
    assert.equal(localizarEtiqueta(iniciais, 'DORMENTE-001')[0].id, '1');
    await assert.rejects(salvarLote(db, { ...cadastro(), codigoNFC: 'DORMENTE-003' }), /outro lote/);
    await salvarLote(db, cadastro());
    await assert.rejects(salvarLote(db, cadastro()), /esse ID/);
    const lote = (await carregarEstoque(db)).find(item => item.id === 'L42');
    await salvarLote(db, { ...rascunhoLote(lote), id: 'L43', setor: 'C', condicao: 'Reprovado' }, lote.chave);
    const dormente = lote.dormentes.find(item => item.nome === 'Peça B');
    await assert.rejects(salvarDormente(db, dormente.id, { ...dormente, nome: ' ' }), /obrigatório/);
    await salvarDormente(db, dormente.id, { ...dormente, nome: 'Peça B revisada' });
    db.fechar();
    db = abrirBanco(caminho);
    await inicializarBanco(db);
    const lotes = await carregarEstoque(db);
    assert.equal(lotes.length, 2);
    const atualizado = localizarEtiqueta(lotes, 'TAG-42')[0];
    assert.equal(atualizado.id, 'L43');
    assert.equal(atualizado.chave, lote.chave);
    assert.equal(atualizado.setor, 'C');
    assert.equal(atualizado.condicao, 'Reprovado');
    assert.equal(atualizado.dormentes.length, 2);
    assert.equal(atualizado.dormentes.find(item => item.id === dormente.id).nome, 'Peça B revisada');
    await db.runAsync('DELETE FROM lotes WHERE chave = ?', lote.chave);
    const remanescentes = await db.getAllAsync('SELECT * FROM dormentes WHERE loteChave = ?', lote.chave);
    assert.equal(remanescentes.length, 0);
  } finally {
    db.fechar();
    rmSync(pasta, { recursive: true, force: true });
  }
});

test('falha ao inserir dormente reverte o lote inteiro', async () => {
  const db = abrirBanco(':memory:');
  try {
    await inicializarBanco(db);
    await db.execAsync(`
      CREATE TRIGGER bloquear_dormente BEFORE INSERT ON dormentes
      WHEN NEW.nome = 'Peça B'
      BEGIN SELECT RAISE(ABORT, 'Falha de teste'); END;
    `);
    await assert.rejects(salvarLote(db, cadastro()), /Falha de teste/);
    assert.equal((await carregarEstoque(db)).length, 1);
    assert.equal((await db.getAllAsync('SELECT * FROM dormentes')).length, 3);
  } finally {
    db.fechar();
  }
});
