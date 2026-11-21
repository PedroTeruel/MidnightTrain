// Dados de exemplo só para desenvolvimento: ajudam a ver o dashboard cheio.
// Tudo que é gerado usa o prefixo "EX" e pode ser removido sem mexer nos dados reais.
const PREFIXO = 'EX';
const DIA = 86400000;

const patios = [['Pátio A', 'A'], ['Pátio A', 'B'], ['Pátio B', 'A'], ['Pátio B', 'C'], ['Pátio C', 'A']];
const especies = ['Araucária', 'Araucária', 'Eucalipto', 'Eucalipto', 'Peroba', 'Ipê', 'Angelim'];
const condicoes = ['Boa', 'Boa', 'Boa', 'Atenção', 'Atenção', 'Ruim', 'Não avaliada'];
const aprovacoes = ['Aprovado', 'Aprovado', 'Pendente', 'Reprovado'];

function sorteador(semente) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export async function removerDadosExemplo(db) {
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.runAsync("DELETE FROM buscas WHERE dormenteId LIKE ?", `${PREFIXO}-%`);
    await tx.runAsync("DELETE FROM dormentes WHERE id LIKE ?", `${PREFIXO}-%`);
    await tx.runAsync("DELETE FROM lotes WHERE id LIKE ?", `${PREFIXO}-%`);
  });
}

export async function gerarDadosExemplo(db, agora = new Date()) {
  await removerDadosExemplo(db);
  const rnd = sorteador(42);
  const escolher = lista => lista[Math.floor(rnd() * lista.length)];
  const iso = ms => new Date(ms).toISOString();
  const agoraMs = agora.getTime();

  await db.withExclusiveTransactionAsync(async tx => {
    let seq = 0;
    for (let l = 1; l <= 8; l++) {
      const [patio, setor] = patios[(l - 1) % patios.length];
      const loteId = `${PREFIXO}-${l}`;
      const criadoLote = agoraMs - Math.floor(rnd() * 100) * DIA;
      await tx.runAsync(
        'INSERT INTO lotes (id, setor, patio, tamanho, especies, condicao, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)',
        loteId, setor, patio, '32x29m', escolher(especies), escolher(aprovacoes), 'Lote de exemplo',
      );
      const { chave } = await tx.getFirstAsync('SELECT chave FROM lotes WHERE id = ?', loteId);
      const quantidade = 6 + Math.floor(rnd() * 10);
      for (let d = 1; d <= quantidade; d++) {
        seq += 1;
        const id = `${PREFIXO}-${l}-${String(d).padStart(2, '0')}`;
        const condicao = escolher(condicoes);
        const criado = criadoLote + d * 1000;
        const atualizado = criado + Math.floor(rnd() * Math.max(1, (agoraMs - criado) / DIA)) * DIA;
        const extraviado = rnd() < 0.05 ? iso(agoraMs - Math.floor(rnd() * 20) * DIA) : null;
        const saiu = rnd() < 0.08 ? iso(agoraMs - Math.floor(rnd() * 20) * DIA) : null;
        await tx.runAsync(
          `INSERT INTO dormentes (id, loteChave, nome, condicao, tamanho, especie, ultimaAtualizacao, extraviadoEm, criadoEm, saidaEm)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id, chave, `D-${String(seq).padStart(3, '0')}`, condicao, '32x29m', escolher(especies),
          iso(atualizado), extraviado, iso(criado), saiu,
        );
        await tx.runAsync(
          'INSERT INTO movimentacoes (id, dormenteId, tipo, destino, destinoPatio, destinoSetor, dataHora, prazoSegundos, concluidaEm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          `${id}-e`, id, 'Entrada', `${patio} / ${setor}`, patio, setor, iso(criado), null, iso(criado),
        );
        if (condicao !== 'Não avaliada') {
          await tx.runAsync(
            'INSERT INTO historico_condicao (dormenteId, condicaoAnterior, condicaoNova, dataHora) VALUES (?, ?, ?, ?)',
            id, 'Não avaliada', condicao, iso(atualizado),
          );
        }
        // Movimentações internas e de saída espalhadas pelas últimas semanas.
        const extras = Math.floor(rnd() * 3);
        for (let m = 0; m < extras; m++) {
          const quando = agoraMs - Math.floor(rnd() * 90) * DIA - Math.floor(rnd() * DIA);
          if (quando < criado) continue;
          const tipo = rnd() < 0.7 ? 'Interna' : 'Saída';
          const [pd, sd] = escolher(patios);
          const prazo = tipo === 'Interna' ? 900 : 600;
          const demora = Math.floor(prazo * (0.4 + rnd() * 1.2));
          await tx.runAsync(
            'INSERT INTO movimentacoes (id, dormenteId, tipo, origem, destino, destinoPatio, destinoSetor, dataHora, prazoSegundos, concluidaEm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            `${id}-m${m}`, id, tipo, `${patio} / ${setor}`, tipo === 'Interna' ? `${pd} / ${sd}` : null,
            tipo === 'Interna' ? pd : null, tipo === 'Interna' ? sd : null,
            iso(quando), prazo, iso(quando + demora * 1000),
          );
        }
        if (rnd() < 0.3) {
          const inicio = agoraMs - Math.floor(rnd() * 60) * DIA;
          await tx.runAsync(
            'INSERT INTO buscas (id, dormenteId, iniciadaEm, localizadaEm) VALUES (?, ?, ?, ?)',
            `${id}-b`, id, iso(inicio), iso(inicio + (20 + Math.floor(rnd() * 100)) * 1000),
          );
        }
      }
    }
  });
}
