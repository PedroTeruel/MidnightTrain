import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { carregarLocaisApi } from '../../services/estoqueApi';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { condicoesDormente } from '../../models/estoque.mjs';
import { Acao, Campo, Cartao, Formulario, Linha, Secao, Texto, Titulo, styles } from '../components/Interface';
import DormenteEditSheet from '../components/DormenteEditSheet';

const titulos = { condicao: 'Condição', tamanho: 'Tamanho', especie: 'Espécie' };

export default function EachDormenteView({ navigation, dormente, lote, token, onSalvarDormente, onRegistrarEntrada, onRegistrarTransferencia, onRegistrarSaida, }) {
  const [editando, setEditando] = useState(false);
  const [campo, setCampo] = useState(null);
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const gravacaoCampo = useRef(Promise.resolve());
  const titulo = dormente?.nome ?? 'Dormente não encontrado';
  const [locais, setLocais] = useState([]);
  const [carregandoLocais, setCarregandoLocais] = useState(false);
  const [entradaAberta, setEntradaAberta] = useState(false);
  const [localSelecionado, setLocalSelecionado] = useState(null);
  const [registrandoEntrada, setRegistrandoEntrada] = useState(false);
  const [transferenciaAberta, setTransferenciaAberta] = useState(false);
  const [destinoSelecionado, setDestinoSelecionado] = useState(null);
  const [transferindo, setTransferindo] = useState(false);
  const [saidaAberta, setSaidaAberta] = useState(false);
  const [registrandoSaida, setRegistrandoSaida] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarLocais() {
     setCarregandoLocais(true);

     try {
        const resultado = await carregarLocaisApi(token);

        if (ativo) {
          setLocais(resultado);
        }
      } catch (erro) {
       if (ativo) {
          Alert.alert('Erro ao carregar locais', erro.message);
        }
     } finally {
       if (ativo) {
         setCarregandoLocais(false);
        }
     }
   }

  if (token) {
    carregarLocais();
  }

  return () => {
    ativo = false;
  };
}, [token]);

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

  function abrirEntrada() {
  if (carregandoLocais) return;

  if (locais.length === 0) {
    Alert.alert(
      'Nenhum local disponível',
      'Não existem locais ativos cadastrados no sistema.'
    );
    return;
  }

  setLocalSelecionado(null);
  setEntradaAberta(true);
}

async function confirmarEntrada() {
  if (localSelecionado === null) {
    Alert.alert('Atenção', 'Selecione um local para continuar.');
    return;
  }

  if (registrandoEntrada) return;

  setRegistrandoEntrada(true);

  try {
    await onRegistrarEntrada(dormente.id, localSelecionado);

    setEntradaAberta(false);
    setLocalSelecionado(null);

    Alert.alert('Sucesso', 'Entrada do dormente registrada.');
  } catch (erro) {
    Alert.alert('Erro ao registrar entrada', erro.message);
  } finally {
    setRegistrandoEntrada(false);
  }
}

function abrirTransferencia() {
  if (
    carregandoLocais ||
    registrandoEntrada ||
    transferindo ||
    registrandoSaida
    ) return;

  const destinosDisponiveis = locais.filter(
    local => String(local.id) !== String(dormente.local_id)
  );

  if (destinosDisponiveis.length === 0) {
    Alert.alert(
      'Nenhum destino disponível',
      'Não existem outros locais ativos para realizar a transferência.'
    );
    return;
  }

  setDestinoSelecionado(null);
  setTransferenciaAberta(true);
}

async function confirmarTransferencia() {
  if (destinoSelecionado === null) {
    Alert.alert('Atenção', 'Selecione um local de destino.');
    return;
  }

  if (String(destinoSelecionado) === String(dormente.local_id)) {
    Alert.alert('Atenção', 'O destino precisa ser diferente do local atual.');
    return;
  }

  if (transferindo) return;

  setTransferindo(true);

  try {
    await onRegistrarTransferencia(dormente.id, destinoSelecionado);

    setTransferenciaAberta(false);
    setDestinoSelecionado(null);

    Alert.alert('Sucesso', 'Transferência do dormente registrada.');
  } catch (erro) {
    Alert.alert('Erro ao transferir', erro.message);
  } finally {
    setTransferindo(false);
  }
}

function abrirSaida() {
  if (registrandoSaida || transferindo || registrandoEntrada) return;

  setSaidaAberta(true);
}

async function confirmarSaida() {
  if (registrandoSaida) return;

  setRegistrandoSaida(true);

  try {
    await onRegistrarSaida(dormente.id);

    setSaidaAberta(false);

    Alert.alert(
      'Sucesso',
      'Saída do dormente registrada.'
    );
  } catch (erro) {
    Alert.alert(
      'Erro ao registrar saída',
      erro.message
    );
  } finally {
    setRegistrandoSaida(false);
  }
}

  const localAtual = locais.find( local => String(local.id) === String(dormente.local_id));
  const local = localAtual ? `${localAtual.patio} - Setor ${localAtual.setor}`: 'Não informado';

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
  {dormente.situacao_estoque === 'NAO_INFORMADO' && (
    <Acao
      titulo="Registrar entrada"
      destaque
      disabled={
        carregandoLocais ||
        registrandoEntrada ||
        transferindo ||
        registrandoSaida
      }
      onPress={abrirEntrada}
    />
  )}

  {dormente.situacao_estoque === 'EM_ESTOQUE' && (
    <Acao
      titulo="Transferir"
      destaque
      disabled={
        carregandoLocais ||
        registrandoEntrada ||
        transferindo ||
        registrandoSaida
      }
      onPress={abrirTransferencia}
    />
  )}

  {dormente.situacao_estoque === 'EM_ESTOQUE' && (
    <Acao
      titulo="Registrar saída"
      perigo
      disabled={
        registrandoEntrada ||
        transferindo ||
        registrandoSaida
      }
      onPress={abrirSaida}
    />
  )}

  <Acao
    titulo="Salvar"
    destaque
    disabled={
      salvando ||
      registrandoEntrada ||
      transferindo ||
      registrandoSaida
    }
    onPress={() => salvar({}, () => navigation.goBack())}
  />
</View>
      {editando && (
  <DormenteEditSheet
    dormente={dormente}
    fechar={() => setEditando(false)}
    onSalvar={onSalvarDormente}
  />
)}

{campo && (
  <Formulario
    titulo={titulos[campo]}
    fechar={concluirCampo}
    acao="OK"
    ocupado={salvando}
    salvar={concluirCampo}
  >
    <Cartao>
      {campo === 'condicao'
        ? condicoesDormente.map(condicao => (
            <Linha
              key={condicao}
              titulo={condicao}
              valor={valor === condicao ? 'Selecionado' : ''}
              onPress={() => atualizarCampo(condicao)}
            />
          ))
        : (
            <Campo
              titulo={titulos[campo]}
              valor={valor}
              onChangeText={atualizarCampo}
            />
          )}
    </Cartao>
  </Formulario>
)}

{entradaAberta && (
  <Formulario
    titulo="Registrar entrada"
    fechar={() => setEntradaAberta(false)}
    acao="Confirmar"
    ocupado={registrandoEntrada}
    salvar={confirmarEntrada}
  >
    <Secao titulo="SELECIONE O LOCAL DE DESTINO">
      <Cartao>
        {locais.map(local => (
          <Linha
            key={local.id}
            titulo={`${local.patio} - Setor ${local.setor}`}
            valor={localSelecionado === local.id ? 'Selecionado' : ''}
            onPress={() => setLocalSelecionado(local.id)}
          />
        ))}
      </Cartao>
    </Secao>
  </Formulario>
)}

{transferenciaAberta && (
  <Formulario
    titulo="Transferir dormente"
    fechar={() => setTransferenciaAberta(false)}
    salvar={confirmarTransferencia}
    ocupado={transferindo}
    acao="Transferir"
  >
    <Cartao>
      {locais
        .filter(local => String(local.id) !== String(dormente.local_id))
        .map(local => (
          <Linha
            key={local.id}
            titulo={`${local.patio} - Setor ${local.setor}`}
            valor={
              String(destinoSelecionado) === String(local.id)
                ? 'Selecionado'
                : ''
            }
            onPress={() => setDestinoSelecionado(local.id)}
          />
        ))}
    </Cartao>
  </Formulario>
)}

{saidaAberta && (
  <Formulario
    titulo="Registrar saída"
    fechar={() => setSaidaAberta(false)}
    salvar={confirmarSaida}
    ocupado={registrandoSaida}
    acao="Confirmar saída"
  >
    <Cartao>
      <Linha
        titulo="Dormente"
        valor={dormente.nome}
      />

      <Linha
        titulo="Local atual"
        valor={local}
      />

      <Linha
        titulo="Situação após a operação"
        valor="RETIRADO"
      />
    </Cartao>
  </Formulario>
)}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingVertical: 8 },
  rodape: { paddingHorizontal: 20, paddingVertical: 10 , gap: 12,},
});
