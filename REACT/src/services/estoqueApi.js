
import { prepararLote } from '../models/estoque.mjs';

const API_URL = 'http://127.0.0.1:3000';

async function consultar(caminho, token) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (resposta.status === 401) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(dados?.mensagem || `Erro HTTP ${resposta.status}`);
  }

  return dados;
}

async function enviar(caminho, token, metodo, dados) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });

  if (resposta.status === 401) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const resultado = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(
      resultado?.mensagem || `Erro ao salvar: HTTP ${resposta.status}`
    );
  }

  return resultado;
}

export async function carregarEstoqueApi(token) {
  const lotes = await consultar('/lotes', token);

  return Promise.all(
    lotes.map(async (lote) => {
      const dormentes = await consultar(
        `/dormentes?loteChave=${lote.chave}`,
        token
      );

      return {
        ...lote,
        dormentes,
        codigosNFCLegados: [],
      };
    })
  );
}

export async function salvarLoteApi(draft, lotes, chave, token) {
  const { lote, dormentes } = prepararLote(draft, lotes, chave);

  if (chave == null) {
    await enviar('/lotes', token, 'POST', {
      ...lote,
      dormentes,
    });
  } else {
    await enviar(`/lotes/${chave}`, token, 'PUT', lote);
  }

  return carregarEstoqueApi(token);
}

export async function salvarDormenteApi(id, draft, token) {
  await enviar(`/dormentes/${encodeURIComponent(id)}`, token, 'PUT', {
    nome: draft.nome,
    condicao: draft.condicao,
    tamanho: draft.tamanho,
    especie: draft.especie,
  });

  return carregarEstoqueApi(token);
}

export async function carregarLocaisApi(token) {
  return consultar('/locais', token);
}

export async function registrarEntradaApi(id, localId, token, opcoes = {}) {
  await enviar(
    `/dormentes/${encodeURIComponent(id)}/entrada`,
    token,
    'POST',
    { localId, ...opcoes }
  );

  return carregarEstoqueApi(token);
}

export async function registrarTransferenciaApi(id, destinoLocalId, token, opcoes = {}) {
  await enviar(
    `/dormentes/${encodeURIComponent(id)}/transferencia`,
    token,
    'POST',
    { destinoLocalId, ...opcoes }
  );

  return carregarEstoqueApi(token);
}

export async function registrarSaidaApi(id, token, opcoes = {}) {
  await enviar(
    `/dormentes/${encodeURIComponent(id)}/saida`,
    token,
    'POST',
    { ...opcoes }
  );

  return carregarEstoqueApi(token);
}

export async function iniciarBuscaDormenteApi(id, token) {
  return enviar(
    `/dormentes/${encodeURIComponent(id)}/buscas`,
    token,
    'POST',
    {}
  );
}

export async function finalizarBuscaDormenteApi(id, buscaId, resultado, token) {
  return enviar(
    `/dormentes/${encodeURIComponent(id)}/buscas/${encodeURIComponent(buscaId)}`,
    token,
    'PATCH',
    { resultado }
  );
}

export async function alternarExtravioDormenteApi(id, extraviado, token) {
  await enviar(
    `/dormentes/${encodeURIComponent(id)}/extravio`,
    token,
    'PATCH',
    { extraviado }
  );

  return carregarEstoqueApi(token);
}