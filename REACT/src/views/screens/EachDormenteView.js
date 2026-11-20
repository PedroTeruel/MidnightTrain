import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { condicoesDormente } from '../../models/estoque.mjs';
import { Acao, Campo, Cartao, Escolha, Formulario, Linha, Secao, Texto, Titulo, styles } from '../components/Interface';
import { concluirMovimentacao, definirExtravio, movimentacaoPendente, registrarMovimentacao, tiposMovimentacao } from '../../models/operacoes.mjs';
import { useSessao } from '../../sessao';
import DormenteEditSheet from '../components/DormenteEditSheet';

const titulos = { condicao: 'Condição', tamanho: 'Tamanho', especie: 'Espécie' };

export default function EachDormenteView({ navigation, dormente, lote, onSalvarDormente }) {
  const { db, usuario, recarregar } = useSessao();
  const [pendente, setPendente] = useState(null);
  const [movendo, setMovendo] = useState(false);
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

  const carregarPendente = useCallback(() => {
    if (dormente) movimentacaoPendente(db, dormente.id).then(setPendente).catch(() => setPendente(null));
  }, [db, dormente]);
  React.useEffect(carregarPendente, [carregarPendente]);

  async function executar(operacao) {
    try {
      await operacao();
      await recarregar();
      carregarPendente();
    } catch (erro) {
      Alert.alert('Não foi possível concluir', erro.message);
    }
  }

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

  const patioAtual = dormente.patio ?? lote.patio, setorAtual = dormente.setor ?? lote.setor;
  const local = patioAtual ? `${patioAtual} - Setor ${setorAtual}` : `Setor ${setorAtual}`;
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={estilos.centro}><Titulo>{titulo}</Titulo></View>
        <Secao titulo="IDENTIFICAÇÃO">
          <Cartao><Linha titulo="Lote" valor={lote.id} /><Linha titulo="Local" valor={local} /></Cartao>
        </Secao>
        <Secao titulo="MOVIMENTAÇÃO">
          <Cartao>
            {pendente ? (
              <>
                <Linha titulo={`${pendente.tipo} em andamento`} valor={pendente.destino} />
                <Acao titulo="Concluir movimentação" icone="checkmark-circle-outline"
                  onPress={() => executar(() => concluirMovimentacao(db, pendente.id))} />
              </>
            ) : (
              <Acao titulo="Registrar movimentação" icone="swap-horizontal-outline" onPress={() => setMovendo(true)} />
            )}
            <Acao titulo={dormente.extraviadoEm ? 'Marcar como localizado' : 'Marcar como extraviado'}
              icone={dormente.extraviadoEm ? 'checkmark-outline' : 'alert-circle-outline'}
              onPress={() => executar(() => definirExtravio(db, dormente.id, !dormente.extraviadoEm))} />
          </Cartao>
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
      {movendo && <MovimentacaoSheet fechar={() => setMovendo(false)} local={{ patio: patioAtual, setor: setorAtual }}
        onSalvar={dados => executar(() => registrarMovimentacao(db, { dormenteId: dormente.id, usuarioId: usuario?.id ?? null, ...dados }))} />}
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

function MovimentacaoSheet({ fechar, onSalvar, local }) {
  const [tipo, setTipo] = useState('Interna');
  const [patio, setPatio] = useState(local.patio ?? '');
  const [setor, setSetor] = useState('');
  const semDestino = tipo === 'Saída';
  function confirmar() {
    onSalvar({ tipo, patio, setor });
    fechar();
  }
  return (
    <Formulario titulo="Registrar movimentação" fechar={fechar} salvar={confirmar} acao="Registrar">
      <Cartao><Escolha titulo="Tipo" opcoes={tiposMovimentacao.filter(t => t !== 'Entrada')} valor={tipo} aoEscolher={setTipo} /></Cartao>
      {!semDestino && <Cartao><Campo titulo="Pátio de destino" valor={patio} onChangeText={setPatio} /><Campo titulo="Setor de destino" valor={setor} onChangeText={setSetor} /></Cartao>}
      <Texto secundario>O dormente fica em andamento até você concluir a movimentação. O prazo previsto alimenta a eficiência operacional.</Texto>
    </Formulario>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingVertical: 8 },
  rodape: { paddingHorizontal: 20, paddingVertical: 10 },
});
