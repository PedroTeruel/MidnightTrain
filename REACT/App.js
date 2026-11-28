import React, { useState } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import EstoqueNavigation from './src/navigation/EstoqueNavigation';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, useColorScheme } from 'react-native';
import LoginScreen from './src/views/screens/LoginScreen';
import GestorNavigation from './src/navigation/GestorNavigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { autenticarDemo } from './src/services/auth';
import {carregarEstoqueApi,salvarLoteApi,salvarDormenteApi, registrarEntradaApi, registrarTransferenciaApi, registrarSaidaApi, alternarExtravioDormenteApi} from './src/services/estoqueApi';
import { azul } from './src/views/components/Interface';


const temaClaro = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: azul, background: '#f2f2f7', card: '#fff', secondaryText: '#55555c' },
};
const temaEscuro = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: '#69aaff', background: '#000', card: '#1c1c1e', secondaryText: '#b2b2b8' },
};

export default function App() {
  const tema = useColorScheme() === 'dark' ? temaEscuro : temaClaro;
  const [usuario, setUsuario] = useState(null);
  const [lotes, setLotes] = useState([]);

  async function gravarLote(draft, chave) {
  if (!usuario?.token) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  const estoqueAtualizado = await salvarLoteApi(
    draft,
    lotes,
    chave,
    usuario.token
  );

  setLotes(estoqueAtualizado);
}

  async function gravarDormente(id, draft) {
  if (!usuario?.token) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  const estoqueAtualizado = await salvarDormenteApi(
    id,
    draft,
    usuario.token
  );

  setLotes(estoqueAtualizado);
}

async function registrarEntrada(id, localId, opcoes) {
  if (!usuario?.token) throw new Error('Sessão inválida. Faça login novamente.');
  const estoqueAtualizado = await registrarEntradaApi(id, localId, usuario.token, opcoes);
  setLotes(estoqueAtualizado);
}

async function registrarTransferencia(id, destinoLocalId, opcoes) {
  if (!usuario?.token) throw new Error('Sessão inválida. Faça login novamente.');
  const estoqueAtualizado = await registrarTransferenciaApi(id, destinoLocalId, usuario.token, opcoes);
  setLotes(estoqueAtualizado);
}

async function registrarSaida(id, opcoes) {
  if (!usuario?.token) throw new Error('Sessão inválida. Faça login novamente.');
  const estoqueAtualizado = await registrarSaidaApi(id, usuario.token, opcoes);
  setLotes(estoqueAtualizado);
}

async function alternarExtravio(id, extraviado) {
  if (!usuario?.token) throw new Error('Sessão inválida. Faça login novamente.');
  const estoqueAtualizado = await alternarExtravioDormenteApi(id, extraviado, usuario.token);
  setLotes(estoqueAtualizado);
}

  async function entrar(email, senha) {
  const conta = await autenticarDemo(email, senha);

  if (conta.perfil === 'FUNCIONARIO') {
    try {
      const estoqueRemoto = await carregarEstoqueApi(conta.token);
      setLotes(estoqueRemoto);
    } catch (erro) {
      Alert.alert('Erro ao carregar estoque', erro.message);
      return;
    }
  }

  setUsuario(conta);
}

   return (
    <SafeAreaProvider>
      <KeyboardAvoidingView
        style={styles.tela}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <NavigationContainer theme={tema}>
          {!usuario ? (
            <LoginScreen onEntrar={entrar} />
          ) : usuario.perfil !== 'FUNCIONARIO' ? (
            <GestorNavigation
               usuario={usuario}
                onSair={() => setUsuario(null)}
            />
          ) : (
            <EstoqueNavigation
              lotes={lotes}
              token={usuario.token}
              onSalvarLote={gravarLote}
              onSalvarDormente={gravarDormente}
              onRegistrarEntrada={registrarEntrada}
              onRegistrarTransferencia={registrarTransferencia}
              onRegistrarSaida={registrarSaida}
              onAlternarExtravio={alternarExtravio}
              onSair={() => setUsuario(null)}
            />
          )}
        </NavigationContainer>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
});
