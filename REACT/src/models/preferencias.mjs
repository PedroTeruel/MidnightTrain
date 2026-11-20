export async function lerPreferencia(db, chave, padrao = null) {
  const linha = await db.getFirstAsync('SELECT valor FROM preferencias WHERE chave = ?', chave);
  if (!linha) return padrao;
  try { return JSON.parse(linha.valor); } catch { return padrao; }
}

export async function gravarPreferencia(db, chave, valor) {
  await db.runAsync(
    `INSERT INTO preferencias (chave, valor) VALUES (?, ?)
     ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
    chave, JSON.stringify(valor),
  );
}
