import React, { useState } from 'react';
import { Alert } from 'react-native';
import { condicoesDormente } from '../../models/estoque.mjs';
import { Campo, Cartao, Escolha, Formulario, Secao, Texto } from './Interface';

export default function DormenteEditSheet({ dormente, fechar, onSalvar }) {
  const [draft, setDraft] = useState(() => ({
    nome: dormente.nome, condicao: dormente.condicao, tamanho: dormente.tamanho, especie: dormente.especie,
  }));
  const [salvando, setSalvando] = useState(false);
  const alterado = Object.keys(draft).some(campo => draft[campo] !== dormente[campo]);

  function atualizar(campo, valor) {
    setDraft(atual => ({ ...atual, [campo]: valor }));
  }

  function cancelar() {
    if (salvando) return;
    if (!alterado) { fechar(); return; }
    Alert.alert('Descartar alterações?', '', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Descartar alterações', style: 'destructive', onPress: fechar },
    ]);
  }

  async function salvar() {
    if (salvando || !draft.nome.trim()) return;
    setSalvando(true);
    try {
      await onSalvar(dormente.id, draft);
      fechar();
    } catch (erro) {
      Alert.alert('Não foi possível salvar', erro.message);
      setSalvando(false);
    }
  }

  return (
    <Formulario titulo="Editar dormente" fechar={cancelar} salvar={salvar} ocupado={salvando || !draft.nome.trim()}>
      <Secao titulo="Identificação">
        <Cartao><Campo titulo="Nome" valor={draft.nome} onChangeText={v => atualizar('nome', v)} /></Cartao>
        <Texto secundario>O nome é obrigatório.</Texto>
      </Secao>
      <Secao titulo="Inspeção">
        <Cartao><Escolha titulo="Condição" opcoes={condicoesDormente}
          valor={draft.condicao} aoEscolher={v => atualizar('condicao', v)} /></Cartao>
      </Secao>
      <Secao titulo="Características">
        <Cartao>
          <Campo titulo="Tamanho" valor={draft.tamanho} onChangeText={v => atualizar('tamanho', v)} />
          <Campo titulo="Espécie" valor={draft.especie} onChangeText={v => atualizar('especie', v)} />
        </Cartao>
      </Secao>
    </Formulario>
  );
}
