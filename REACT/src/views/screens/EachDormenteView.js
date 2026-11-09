import React, { useLayoutEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { condicoesDormente } from '../../models/estoque.mjs';
import { Acao, Campo, Cartao, Formulario, Linha, Secao, Texto, Titulo, styles } from '../components/Interface';
import DormenteEditSheet from '../components/DormenteEditSheet';

const titulos = { condicao: 'Condição', tamanho: 'Tamanho', especie: 'Espécie' };

export default function EachDormenteView({ navigation, dormente, lote, onSalvarDormente }) {
  const [editando, setEditando] = useState(false);
  const [campo, setCampo] = useState(null);
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const gravacaoCampo = useRef(Promise.resolve());
  const titulo = dormente?.nome ?? 'Dormente não encontrado';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: titulo,
      headerRight: dormente ? () => <Acao titulo="Editar" onPress={() => setEditando(true)} /> : undefined,
    });
  }, [navigation, titulo, dormente]);

  if (!dormente) return <View style={styles.conteudo}><Titulo>{titulo}</Titulo></View>;

  function editar(chave) {
    gravacaoCampo.current = Promise.resolve();
    setValor(dormente[chave]);
    setCampo(chave);
  }

  function atualizarCampo(novoValor) {
    setValor(novoValor);
    const alteracao = { ...dormente, [campo]: novoValor };
    // Serializa os textos digitados para uma gravação antiga não sobrescrever a mais recente.
    const gravacao = gravacaoCampo.current.catch(() => {}).then(() =>
      onSalvarDormente(dormente.id, alteracao)
    );
    gravacao.catch(() => {});
    gravacaoCampo.current = gravacao;
  }

  async function concluirCampo() {
    if (salvando) return;
    setSalvando(true);
    try {
      await gravacaoCampo.current;
      setCampo(null);
    } catch (erro) {
      Alert.alert('Não foi possível salvar', erro.message, [
        { text: 'OK', style: 'cancel' },
        { text: 'Tentar novamente', onPress: () => salvar({ [campo]: valor }, () => setCampo(null)) },
      ]);
    } finally {
      setSalvando(false);
    }
  }

  async function salvar(alteracoes, depois) {
    if (salvando) return;
    setSalvando(true);
    try {
      await onSalvarDormente(dormente.id, { ...dormente, ...alteracoes });
      depois();
    } catch (erro) {
      Alert.alert('Não foi possível salvar', erro.message, [
        { text: 'OK', style: 'cancel' },
        { text: 'Tentar novamente', onPress: () => salvar(alteracoes, depois) },
      ]);
    } finally {
      setSalvando(false);
    }
  }

  const local = lote.patio ? `${lote.patio} - Setor ${lote.setor}` : `Setor ${lote.setor}`;
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={estilos.centro}><Titulo>{titulo}</Titulo></View>
        <Secao titulo="IDENTIFICAÇÃO">
          <Cartao><Linha titulo="Lote" valor={lote.id} /><Linha titulo="Local" valor={local} /></Cartao>
        </Secao>
        <Secao titulo="INSPEÇÃO">
          <Cartao><Linha titulo="Condição" valor={dormente.condicao} onPress={() => editar('condicao')} /></Cartao>
        </Secao>
        <Secao titulo="CARACTERÍSTICAS">
          <Cartao>
            <Linha titulo="Tamanho" valor={dormente.tamanho} onPress={() => editar('tamanho')} />
            <Linha titulo="Espécie" valor={dormente.especie} onPress={() => editar('especie')} />
          </Cartao>
        </Secao>
        <Texto secundario>Última atualização: {new Date(dormente.ultimaAtualizacao).toLocaleString('pt-BR')}</Texto>
      </ScrollView>
      <View style={estilos.rodape}>
        <Acao titulo="Salvar" destaque disabled={salvando} onPress={() => salvar({}, () => navigation.goBack())} />
      </View>
      {editando && <DormenteEditSheet dormente={dormente} fechar={() => setEditando(false)} onSalvar={onSalvarDormente} />}
      {campo && (
        <Formulario titulo={titulos[campo]} fechar={concluirCampo} acao="OK" ocupado={salvando}
          salvar={concluirCampo}>
          <Cartao>
            {campo === 'condicao'
              ? condicoesDormente.map(condicao => (
                <Linha key={condicao} titulo={condicao} valor={valor === condicao ? 'Selecionado' : ''}
                  onPress={() => atualizarCampo(condicao)} />
              ))
              : <Campo titulo={titulos[campo]} valor={valor} onChangeText={atualizarCampo} />}
          </Cartao>
        </Formulario>
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingVertical: 8 },
  rodape: { paddingHorizontal: 20, paddingVertical: 10 },
});
