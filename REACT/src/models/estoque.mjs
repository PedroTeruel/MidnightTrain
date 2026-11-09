export const condicoesLote = ['Pendente', 'Aprovado', 'Reprovado'];
export const condicoesDormente = ['Não avaliada', 'Boa', 'Atenção', 'Ruim'];

export function novoItem() {
  return { nome: '', condicao: 'Não avaliada', tamanho: '', especie: '' };
}

export function rascunhoLote(lote, codigoInicial = '') {
  if (lote) {
    return { ...lote, codigoNFC: lote.codigoNFC ?? '', quantidade: String(lote.dormentes.length), itens: {} };
  }
  return {
    id: '', setor: '', patio: '', tamanho: '', especies: '', descricao: '',
    condicao: 'Pendente', codigoNFC: codigoInicial, quantidade: '1', itens: {},
  };
}

export function quantidadeValida(valor) {
  return /^\d+$/.test(String(valor).trim()) && Number(valor) >= 1 && Number(valor) <= 500;
}

export function correspondeEtiqueta(lote, codigo) {
  return lote.codigoNFC === codigo || (lote.codigosNFCLegados ?? []).includes(codigo);
}

export function localizarEtiqueta(lotes, codigo) {
  return lotes.filter(lote => correspondeEtiqueta(lote, codigo));
}

function textoDeBusca(valor) {
  return valor.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

export function filtrarLotes(lotes, busca, condicao) {
  const termo = textoDeBusca(busca.trim());
  return lotes.filter(lote => {
    const campos = [lote.id, lote.setor, lote.patio, lote.especies];
    return (!condicao || lote.condicao === condicao)
      && campos.some(campo => textoDeBusca(campo).includes(termo));
  });
}

export function prepararLote(draft, lotes, chave) {
  if (![draft.id, draft.setor, draft.tamanho, draft.especies].every(valor => valor.trim())) {
    throw new Error('Preencha ID, setor, tamanho e espécies do lote.');
  }
  const id = draft.id.trim();
  const codigoNFC = draft.codigoNFC.trim() || null;
  const outros = lotes.filter(lote => lote.chave !== chave);
  if (outros.some(lote => lote.id === id)) {
    throw new Error('Já existe um lote com esse ID.');
  }
  if (codigoNFC && localizarEtiqueta(outros, codigoNFC).length) {
    throw new Error(`O código NFC ${codigoNFC} já está associado a outro lote.`);
  }

  const lote = {
    id, setor: draft.setor, patio: draft.patio, tamanho: draft.tamanho,
    especies: draft.especies, condicao: draft.condicao, descricao: draft.descricao, codigoNFC,
  };
  const dormentes = [];
  if (chave == null) {
    if (!quantidadeValida(draft.quantidade)) {
      throw new Error('Informe uma quantidade entre 1 e 500.');
    }
    for (let indice = 0; indice < Number(draft.quantidade); indice++) {
      const item = draft.itens[indice];
      if (!item?.nome.trim()) {
        throw new Error('Informe o nome de cada dormente do lote.');
      }
      dormentes.push({
        nome: item.nome.trim(), condicao: item.condicao,
        tamanho: item.tamanho || lote.tamanho, especie: item.especie || lote.especies,
      });
    }
  }
  return { lote, dormentes };
}
