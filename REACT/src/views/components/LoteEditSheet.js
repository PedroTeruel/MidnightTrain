import React, { useState } from 'react';
import { Alert } from 'react-native';
import { condicoesDormente, condicoesLote, novoItem, quantidadeValida, rascunhoLote } from '../../models/estoque.mjs';
import { Campo, Cartao, Escolha, Formulario, Linha, Secao, Texto } from './Interface';
import LeituraNFC from './LeituraNFC';

export default function LoteEditSheet({ lote, codigoInicial, fechar, onSalvar }) {
  const [draft, setDraft] = useState(() => rascunhoLote(lote, codigoInicial));
  const [salvando, setSalvando] = useState(false);
  const quantidadeOk = quantidadeValida(draft.quantidade);

  function atualizar(campo, valor) {
    setDraft(atual => ({ ...atual, [campo]: valor }));
  }

  function atualizarItem(indice, campo, valor) {
    setDraft(atual => ({
      ...atual,
      itens: {
        ...atual.itens,
        [indice]: { ...(atual.itens[indice] ?? novoItem()), [campo]: valor },
      },
    }));
  }

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    try {
      await onSalvar(draft, lote?.chave);
      fechar();
    } catch (erro) {
      Alert.alert('Não foi possível concluir', erro.message);
      setSalvando(false);
    }
  }

  const indices = lote || !quantidadeOk ? [] : Array.from({ length: Number(draft.quantidade) }, (_, i) => i);
  function renderDormente({ item: indice }) {
    const item = draft.itens[indice] ?? novoItem();
    return (
      <Secao titulo={`Dormente ${indice + 1}`}>
        <Cartao>
          <Campo titulo="Nome" valor={item.nome} onChangeText={v => atualizarItem(indice, 'nome', v)} />
          <Campo titulo="Tamanho individual (opcional)" valor={item.tamanho}
            onChangeText={v => atualizarItem(indice, 'tamanho', v)} />
          <Campo titulo="Espécie individual (opcional)" valor={item.especie}
            onChangeText={v => atualizarItem(indice, 'especie', v)} />
          <Escolha titulo="Condição" opcoes={condicoesDormente} valor={item.condicao}
            aoEscolher={v => atualizarItem(indice, 'condicao', v)} />
        </Cartao>
      </Secao>
    );
  }

  return (
    <Formulario titulo={lote ? 'Editar lote' : 'Novo lote'} fechar={() => { if (!salvando) fechar(); }}
      salvar={salvar} ocupado={salvando} itens={indices} renderItem={renderDormente}>
      <Secao titulo="Identificação">
        <Cartao>
          <Campo titulo="ID do lote" valor={draft.id} onChangeText={v => atualizar('id', v)} />
          <Campo titulo="Setor" valor={draft.setor} onChangeText={v => atualizar('setor', v)} />
          <Campo titulo="Pátio (opcional)" valor={draft.patio} onChangeText={v => atualizar('patio', v)} />
          {lote
            ? <Linha titulo="Quantidade" valor={draft.quantidade} />
            : <Campo titulo="Quantidade" valor={draft.quantidade} keyboardType="number-pad"
              onChangeText={v => atualizar('quantidade', v)} />}
          {!lote && !quantidadeOk && <Texto secundario>Informe uma quantidade entre 1 e 500.</Texto>}
        </Cartao>
      </Secao>
      <Secao titulo="Características">
        <Cartao>
          <Campo titulo="Tamanho dos dormentes" valor={draft.tamanho} onChangeText={v => atualizar('tamanho', v)} />
          <Campo titulo="Espécies de madeira" valor={draft.especies} onChangeText={v => atualizar('especies', v)} />
          <Escolha titulo="Condição do lote" opcoes={condicoesLote} valor={draft.condicao}
            aoEscolher={v => atualizar('condicao', v)} />
          <Campo titulo="Descrição do lote" valor={draft.descricao} onChangeText={v => atualizar('descricao', v)}
            multiline numberOfLines={3} />
        </Cartao>
      </Secao>
      <Secao titulo="NFC">
        <Cartao>
          <Campo titulo="Código da etiqueta" valor={draft.codigoNFC} onChangeText={v => atualizar('codigoNFC', v)}
            autoCapitalize="none" autoCorrect={false} />
          <LeituraNFC titulo="Ler etiqueta NFC" onCodigo={v => atualizar('codigoNFC', v)} />
        </Cartao>
        <Texto secundario>Associe uma etiqueta ao lote para encontrá-lo pela leitura no estoque.</Texto>
      </Secao>
    </Formulario>
  );
}
