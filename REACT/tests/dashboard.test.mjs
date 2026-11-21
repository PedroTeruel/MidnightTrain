import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from './helpers.mjs';
import { inicializarBanco, salvarDormente, salvarLote, carregarEstoque } from '../src/models/banco.mjs';
import { gravarPreferencia, lerPreferencia } from '../src/models/preferencias.mjs';
import { podeVerDashboard } from '../src/models/permissoes.mjs';
import {
  concluirMovimentacao, definirExtravio, movimentacaoPendente, registrarBusca, registrarMovimentacao,
} from '../src/models/operacoes.mjs';
import { carregarDashboard, listarDormentes, relatorioTexto, topLotesPorCondicao, variacao } from '../src/models/dashboard.mjs';

const DIA = 86400000;
const agora = new Date('2026-11-19T12:00:00.000Z');
const antes = dias => new Date(agora.getTime() - dias * DIA);

async function banco() {
  const db = abrirBanco();
  await inicializarBanco(db);
  return db;
}

function lote(id, setor, patio, quantidade, condicao = 'Pendente', especies = 'Araucária') {
  const itens = {};
  for (let i = 0; i < quantidade; i++) itens[i] = { nome: `${id}-${i + 1}`, condicao: 'Não avaliada', tamanho: '', especie: '' };
  return { id, setor, patio, tamanho: '250 cm', especies, condicao, descricao: '', codigoNFC: '', quantidade: String(quantidade), itens };
}

test('migração leva o banco à versão 2 e o dashboard é liberado', async () => {
  const db = await banco();
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 2);
  assert.equal(podeVerDashboard(null), true);
});

test('banco existente na versão 1 é migrado sem perder dados', async () => {
  const db = abrirBanco();
  await db.execAsync(`
    CREATE TABLE lotes (chave INTEGER PRIMARY KEY, id TEXT NOT NULL UNIQUE, setor TEXT NOT NULL, patio TEXT NOT NULL,
      tamanho TEXT NOT NULL, especies TEXT NOT NULL, condicao TEXT NOT NULL, descricao TEXT NOT NULL, codigoNFC TEXT UNIQUE);
    CREATE TABLE dormentes (id TEXT PRIMARY KEY NOT NULL, loteChave INTEGER NOT NULL, nome TEXT NOT NULL,
      condicao TEXT NOT NULL, tamanho TEXT NOT NULL, especie TEXT NOT NULL, ultimaAtualizacao TEXT NOT NULL);
    CREATE TABLE etiquetas_legadas (loteChave INTEGER NOT NULL, codigo TEXT NOT NULL, PRIMARY KEY (loteChave, codigo));
    INSERT INTO lotes VALUES (1, '9', 'A', 'Pátio A', '1m', 'Pinus', 'Aprovado', '', NULL);
    INSERT INTO dormentes VALUES ('x1', 1, 'D-1', 'Boa', '1m', 'Pinus', '2026-01-01T00:00:00.000Z');
    PRAGMA user_version = 1;`);
  await inicializarBanco(db);
  const [l] = await carregarEstoque(db);
  assert.equal(l.dormentes[0].nome, 'D-1');
  assert.equal((await db.getFirstAsync('SELECT criadoEm FROM dormentes WHERE id = ?', 'x1')).criadoEm, '2026-01-01T00:00:00.000Z');
});

test('cadastrar lote registra entradas; editar condição grava histórico', async () => {
  const db = await banco();
  await salvarLote(db, lote('L1', 'A', 'Pátio A', 3), null, 1);
  const entradas = await db.getAllAsync("SELECT * FROM movimentacoes WHERE tipo = 'Entrada'");
  assert.equal(entradas.length, 3);
  assert.equal(entradas[0].prazoSegundos, null);
  assert.equal(entradas[0].usuarioId, 1);
  const [d] = (await carregarEstoque(db)).find(x => x.id === 'L1').dormentes;
  await salvarDormente(db, d.id, { ...d, condicao: 'Ruim' }, 2);
  await salvarDormente(db, d.id, { ...d, condicao: 'Ruim' }, 2);
  const h = await db.getAllAsync('SELECT * FROM historico_condicao');
  assert.equal(h.length, 1);
  assert.deepEqual([h[0].condicaoAnterior, h[0].condicaoNova, h[0].usuarioId], ['Não avaliada', 'Ruim', 2]);
  await assert.rejects(salvarDormente(db, 'nao-existe', { ...d }), /não encontrado/);
});

test('movimentação: pendente, interna muda o local, saída tira do estoque, entrada devolve', async () => {
  const db = await banco();
  await salvarLote(db, lote('L1', 'A', 'Pátio A', 2));
  const [d] = (await carregarEstoque(db)).find(x => x.id === 'L1').dormentes;
  await assert.rejects(registrarMovimentacao(db, { dormenteId: d.id, tipo: 'Interna', patio: '', setor: '' }), /destino/);
  await assert.rejects(registrarMovimentacao(db, { dormenteId: d.id, tipo: 'Entrada', patio: 'Pátio A', setor: 'A' }), /já está no estoque/);
  const id = await registrarMovimentacao(db, { dormenteId: d.id, tipo: 'Interna', patio: 'Pátio B', setor: 'C' }, antes(0));
  assert.ok(await movimentacaoPendente(db, d.id));
  await assert.rejects(registrarMovimentacao(db, { dormenteId: d.id, tipo: 'Saída' }), /em andamento/);
  await concluirMovimentacao(db, id, new Date(agora.getTime() + 60000));
  await assert.rejects(concluirMovimentacao(db, id), /já concluída/);
  const local = await db.getFirstAsync('SELECT patioAtual, setorAtual, origem FROM dormentes_loc d JOIN movimentacoes m ON m.dormenteId = d.id WHERE m.id = ?', id);
  assert.deepEqual([local.patioAtual, local.setorAtual, local.origem], ['Pátio B', 'C', 'Pátio A · Setor A']);

  const saida = await registrarMovimentacao(db, { dormenteId: d.id, tipo: 'Saída' });
  await concluirMovimentacao(db, saida);
  const noL1 = async () => (await db.getFirstAsync("SELECT COUNT(*) AS n FROM dormentes_estoque WHERE loteId = 'L1'")).n;
  assert.equal(await noL1(), 1);
  assert.equal((await carregarEstoque(db)).find(x => x.id === 'L1').dormentes.length, 1);
  await assert.rejects(registrarMovimentacao(db, { dormenteId: d.id, tipo: 'Interna', patio: 'X', setor: 'Y' }), /já saiu/);
  const volta = await registrarMovimentacao(db, { dormenteId: d.id, tipo: 'Entrada', patio: 'Pátio A', setor: 'A' });
  await concluirMovimentacao(db, volta);
  assert.equal(await noL1(), 2);
});

test('variacao ignora ausência de base', () => {
  assert.equal(variacao(12, 10), 20);
  assert.equal(variacao(8, 10), -20);
  assert.equal(variacao(5, 0), null);
  assert.equal(variacao(null, 5), null);
});

async function cenario() {
  const db = await banco();
  await db.runAsync('DELETE FROM dormentes'); // remove o lote de exemplo; mantém lotes
  await db.runAsync('DELETE FROM lotes');
  await salvarLote(db, lote('1', 'A', 'Pátio A', 4, 'Pendente', 'Araucária'));
  await salvarLote(db, lote('2', 'B', 'Pátio B', 3, 'Aprovado', 'Eucalipto'));
  await salvarLote(db, lote('3', 'A', 'Pátio A', 1, 'Reprovado', 'Pinus'));
  const todos = (await carregarEstoque(db)).flatMap(l => l.dormentes.map(d => ({ ...d, lote: l.id })));
  const por = nome => todos.find(d => d.nome === nome);
  // Todos nasceram há 40 dias.
  await db.runAsync('UPDATE dormentes SET criadoEm = ?, ultimaAtualizacao = ?', antes(40).toISOString(), antes(40).toISOString());
  await db.runAsync('UPDATE movimentacoes SET dataHora = ?, concluidaEm = ?', antes(40).toISOString(), antes(40).toISOString());
  // Condições: uma muda há 3 dias (Não avaliada → Boa), outra há 20 dias (→ Ruim), outra Atenção.
  const muda = async (nome, cond, dias) => {
    const d = por(nome);
    await db.runAsync('UPDATE dormentes SET condicao = ?, ultimaAtualizacao = ? WHERE id = ?', cond, antes(dias).toISOString(), d.id);
    await db.runAsync('INSERT INTO historico_condicao (dormenteId, condicaoAnterior, condicaoNova, dataHora) VALUES (?, ?, ?, ?)',
      d.id, 'Não avaliada', cond, antes(dias).toISOString());
  };
  await muda('1-1', 'Boa', 3);
  await muda('1-2', 'Ruim', 20);
  await muda('2-1', 'Atenção', 2);
  await muda('2-2', 'Boa', 1);
  await db.runAsync('UPDATE dormentes SET especie = ? WHERE id = ?', 'Cedro', por('3-1').id);
  await definirExtravio(db, por('3-1').id, true);
  await db.runAsync('UPDATE dormentes SET extraviadoEm = ? WHERE id = ?', antes(2).toISOString(), por('3-1').id);
  // Movimentações recentes: 2 no prazo, 1 fora; buscas.
  const mov = async (nome, tipo, dias, duracaoS, extra = {}) => {
    const ini = antes(dias);
    const id = await registrarMovimentacao(db, { dormenteId: por(nome).id, tipo, patio: 'Pátio B', setor: 'A', ...extra }, ini);
    await concluirMovimentacao(db, id, new Date(ini.getTime() + duracaoS * 1000));
  };
  await mov('1-3', 'Interna', 1, 300);
  await mov('1-4', 'Interna', 2, 1200);
  await mov('2-3', 'Interna', 3, 100);
  await db.runAsync('UPDATE dormentes SET patio = NULL, setor = NULL');
  for (const [dias, seg] of [[1, 40], [2, 60], [15, 100]]) {
    await registrarBusca(db, { dormenteId: por('1-1').id, iniciadaEm: antes(dias), localizadaEm: new Date(antes(dias).getTime() + seg * 1000) });
  }
  return { db, por };
}

test('dashboard agrega condição, avaliados, perdas, aprovação, espécies, locais e idade', async () => {
  const { db } = await cenario();
  const d = await carregarDashboard(db, { agora });
  assert.equal(d.total, 8);
  assert.deepEqual(Object.fromEntries(d.condicoes.map(c => [c.nome, c.n])), { 'Não avaliada': 4, Boa: 2, 'Atenção': 1, Ruim: 1 });
  assert.equal(d.avaliados.pct, 50);
  assert.equal(d.avaliados.variacao, variacao(50, 13)); // há 7 dias só 1 de 8 estava avaliado (13%)
  assert.equal(d.perdas.n, 1);
  assert.equal(d.perdas.taxa, 12.5);
  assert.deepEqual(d.aprovacao.map(a => a.n), [1, 1, 1]);
  assert.equal(d.especies.find(e => e.nome === 'Cedro').n, 1);
  assert.equal(d.lotes.total, 3);
  assert.deepEqual(d.idade.map(i => i.n), [3, 1, 4]); // 3 mudaram em até 7 dias, 1 há 20 dias, 4 há 40 dias
  assert.equal(d.locais.reduce((a, l) => a + l.n, 0), 8);
  assert.equal(d.alertas.urgente.length, 2);
  assert.equal(d.alertas.revisar.find(a => a.chave === 'parados').n, 4);
});

test('dashboard: buscas, eficiência, movimentações e variações', async () => {
  const { db } = await cenario();
  const sete = await carregarDashboard(db, { agora, periodo: '7 dias' });
  assert.equal(sete.localizacao.segundos, 50); // (40 + 60) / 2; a de 15 dias fica fora
  assert.equal(sete.eficiencia.pct, 67); // 2 de 3 no prazo (prazo interna 900 s)
  assert.equal(sete.movimentacoes.total, 3);
  assert.equal(sete.movimentacoes.serie.length, 7);
  assert.equal(sete.movimentacoes.tipos.find(t => t.nome === 'Interna').n, 3);
  assert.equal(sete.recentes.length, 5);
  assert.equal(sete.recentes[0].tipo, 'Interna');
  const mes = await carregarDashboard(db, { agora, periodo: '4 semanas' });
  assert.equal(mes.localizacao.segundos, 67); // (40 + 60 + 100) / 3
  assert.equal(mes.movimentacoes.serie.length, 4);
  assert.equal(mes.movimentacoes.total, 3 + 0); // as entradas de 40 dias atrás caem no período anterior
  assert.equal(mes.movimentacoes.variacao, variacao(3, 8));
  const tres = await carregarDashboard(db, { agora, periodo: '3 meses' });
  assert.equal(tres.movimentacoes.serie.length, 3);
  assert.equal(tres.movimentacoes.total, 11);
  await assert.rejects(carregarDashboard(db, { agora, periodo: 'ontem' }), /Período inválido/);
});

test('dashboard filtra por pátio e a lista de dormentes respeita filtros e busca', async () => {
  const { db } = await cenario();
  const a = await carregarDashboard(db, { agora, patio: 'Pátio A' });
  assert.equal(a.total, 5);
  assert.equal(a.lotes.total, 2);
  const lista = await listarDormentes(db, { agora, cond: 'ruim' });
  assert.deepEqual(lista.linhas.map(l => l.nome), ['1-2']);
  assert.equal(lista.linhas[0].dias, 20);
  assert.equal((await listarDormentes(db, { agora, cond: 'parados' })).total, 4);
  assert.equal((await listarDormentes(db, { agora, cond: 'extraviados' })).linhas[0].extraviado, true);
  assert.equal((await listarDormentes(db, { agora, busca: '2-' })).total, 3);
  assert.equal((await listarDormentes(db, { agora, busca: '%' })).total, 0);
  assert.equal((await listarDormentes(db, { agora, cond: 'todas', limite: 2 })).linhas.length, 2);
  const lote1 = (await carregarEstoque(db)).find(l => l.id === '1');
  assert.equal((await listarDormentes(db, { agora, lote: lote1.chave })).total, 4);
});

test('topLotesPorCondicao e relatório de texto', async () => {
  const { db } = await cenario();
  const d = await carregarDashboard(db, { agora });
  const top = topLotesPorCondicao(d.condicaoPorLote, 'Não avaliada', 2);
  assert.equal(top.linhas.length, 2);
  assert.equal(top.restantes, 1);
  assert.equal(top.linhas[0].id, '1');
  const texto = relatorioTexto(d);
  assert.match(texto, /Taxa de perdas: 12.5%/);
  assert.match(texto, /Dormentes extraviados: 1/);
});

test('buscas inválidas são rejeitadas', async () => {
  const { db, por } = await cenario();
  await assert.rejects(registrarBusca(db, { dormenteId: por('1-1').id, iniciadaEm: agora, localizadaEm: antes(1) }), /inválido/);
});

test('preferências de widgets são gravadas', async () => {
  const db = await banco();
  assert.deepEqual(await lerPreferencia(db, 'widgets', { ordem: [] }), { ordem: [] });
  await gravarPreferencia(db, 'widgets', { ordem: ['cond', 'mov'], ocultos: ['mov'] });
  await gravarPreferencia(db, 'widgets', { ordem: ['mov', 'cond'], ocultos: [] });
  assert.deepEqual(await lerPreferencia(db, 'widgets'), { ordem: ['mov', 'cond'], ocultos: [] });
  assert.equal(await lerPreferencia(db, 'outra'), null);
});

test('dados de exemplo enchem o dashboard e podem ser removidos', async () => {
  const { gerarDadosExemplo, removerDadosExemplo } = await import('../src/models/exemplo.mjs');
  const db = abrirBanco();
  await inicializarBanco(db);
  const antes = await carregarDashboard(db, { periodo: '4 semanas' });
  await gerarDadosExemplo(db, new Date());
  const cheio = await carregarDashboard(db, { periodo: '4 semanas' });
  assert.ok(cheio.movimentacoes.total > antes.movimentacoes.total);
  assert.ok(cheio.lotes.total > antes.lotes.total);
  await gerarDadosExemplo(db, new Date()); // idempotente
  const repetido = await carregarDashboard(db, { periodo: '4 semanas' });
  assert.equal(repetido.lotes.total, cheio.lotes.total);
  await removerDadosExemplo(db);
  const limpo = await carregarDashboard(db, { periodo: '4 semanas' });
  assert.equal(limpo.lotes.total, antes.lotes.total);
});

test('rota de movimentação nunca mostra "null"', async () => {
  const { rotaDaMovimentacao } = await import('../src/models/dashboard.mjs');
  assert.equal(rotaDaMovimentacao({ tipo: 'Interna', origem: 'A', destino: 'B' }), 'A → B');
  assert.equal(rotaDaMovimentacao({ tipo: 'Saída', origem: 'Pátio A / B', destino: null }), 'Pátio A / B → fora do armazém');
  assert.equal(rotaDaMovimentacao({ tipo: 'Entrada', origem: null, destino: 'Pátio A / A' }), 'Entrada em Pátio A / A');
});

test('relatório: seções e HTML do PDF refletem os dados do dashboard', async () => {
  const { gerarDadosExemplo } = await import('../src/models/exemplo.mjs');
  const { relatorioSecoes, relatorioHtml } = await import('../src/models/relatorio.mjs');
  const db = abrirBanco();
  await inicializarBanco(db);
  await gerarDadosExemplo(db, new Date());
  const dash = await carregarDashboard(db, { periodo: '4 semanas' });
  const s = relatorioSecoes(dash);
  assert.equal(s.indicadores.linhas.length, 4);
  assert.equal(s.condicao.linhas.reduce((a, l) => a + l.n, 0), dash.total);
  assert.match(s.movimentacoes.titulo, /nas últimas 4 semanas/);
  const html = relatorioHtml(dash);
  assert.match(html, /Relatório de indicadores/);
  assert.match(html, /PENDÊNCIAS/);
  assert.ok(!html.includes('null') && !html.includes('undefined'));
});
