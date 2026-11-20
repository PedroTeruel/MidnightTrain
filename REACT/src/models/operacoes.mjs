// Operações de estoque: extravio, movimentações (RF04–RF06) e buscas (tempo de localização).
export const tiposMovimentacao = ['Entrada', 'Saída', 'Interna'];

// Prazo previsto, em segundos, para concluir cada tipo de operação (base da eficiência operacional).
export const prazosPadrao = { Entrada: 600, 'Saída': 600, Interna: 900 };

export async function definirExtravio(db, dormenteId, extraviado) {
  const resultado = await db.runAsync(
    'UPDATE dormentes SET extraviadoEm = ? WHERE id = ?',
    extraviado ? new Date().toISOString() : null, dormenteId,
  );
  if (!resultado.changes) throw new Error('Dormente não encontrado.');
}

export async function movimentacaoPendente(db, dormenteId) {
  return (await db.getFirstAsync(
    'SELECT * FROM movimentacoes WHERE dormenteId = ? AND concluidaEm IS NULL ORDER BY dataHora DESC LIMIT 1',
    dormenteId,
  )) ?? null;
}

export async function registrarMovimentacao(db, { dormenteId, tipo, patio, setor, usuarioId = null }, agora = new Date()) {
  if (!tiposMovimentacao.includes(tipo)) throw new Error('Tipo de movimentação inválido.');
  if (tipo !== 'Saída' && !(patio?.trim() && setor?.trim())) throw new Error('Informe o pátio e o setor de destino.');
  let id;
  await db.withExclusiveTransactionAsync(async tx => {
    const dormente = await tx.getFirstAsync(
      'SELECT id, saidaEm, patioAtual, setorAtual FROM dormentes_loc WHERE id = ?', dormenteId);
    if (!dormente) throw new Error('Dormente não encontrado.');
    if (await movimentacaoPendente(tx, dormenteId)) throw new Error('Este dormente já tem uma movimentação em andamento.');
    if (tipo === 'Entrada' && !dormente.saidaEm) throw new Error('O dormente já está no estoque.');
    if (tipo !== 'Entrada' && dormente.saidaEm) throw new Error('O dormente já saiu do estoque.');
    const aqui = `${dormente.patioAtual} · Setor ${dormente.setorAtual}`;
    const destino = tipo === 'Saída' ? 'expedição' : `${patio.trim()} · Setor ${setor.trim()}`;
    id = (await tx.getFirstAsync('SELECT lower(hex(randomblob(16))) AS id')).id;
    await tx.runAsync(
      `INSERT INTO movimentacoes (id, dormenteId, tipo, origem, destino, destinoPatio, destinoSetor,
         dataHora, prazoSegundos, usuarioId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, dormenteId, tipo, tipo === 'Entrada' ? 'recebimento' : aqui, destino,
      tipo === 'Saída' ? null : patio.trim(), tipo === 'Saída' ? null : setor.trim(),
      agora.toISOString(), prazosPadrao[tipo], usuarioId,
    );
  });
  return id;
}

export async function concluirMovimentacao(db, id, agora = new Date()) {
  await db.withExclusiveTransactionAsync(async tx => {
    const mov = await tx.getFirstAsync('SELECT * FROM movimentacoes WHERE id = ?', id);
    if (!mov) throw new Error('Movimentação não encontrada.');
    if (mov.concluidaEm) throw new Error('Movimentação já concluída.');
    const iso = agora.toISOString();
    await tx.runAsync('UPDATE movimentacoes SET concluidaEm = ? WHERE id = ?', iso, id);
    if (mov.tipo === 'Saída') {
      await tx.runAsync('UPDATE dormentes SET saidaEm = ? WHERE id = ?', iso, mov.dormenteId);
    } else {
      await tx.runAsync('UPDATE dormentes SET patio = ?, setor = ?, saidaEm = NULL WHERE id = ?',
        mov.destinoPatio, mov.destinoSetor, mov.dormenteId);
    }
  });
}

// Uma busca vai do início da procura até o momento em que o dormente é aberto.
export async function registrarBusca(db, { dormenteId, iniciadaEm, localizadaEm = new Date(), usuarioId = null }) {
  const inicio = new Date(iniciadaEm), fim = new Date(localizadaEm);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) {
    throw new Error('Período da busca inválido.');
  }
  await db.runAsync(
    `INSERT INTO buscas (id, dormenteId, iniciadaEm, localizadaEm, usuarioId)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)`,
    dormenteId, inicio.toISOString(), fim.toISOString(), usuarioId,
  );
}
