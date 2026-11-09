import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { openDatabaseAsync } from 'expo-sqlite';
import { carregarEstoque, inicializarBanco, salvarDormente, salvarLote } from './src/models/banco.mjs';
import EstoqueNavigation from './src/navigation/EstoqueNavigation';
import { Acao, azul, Texto, Titulo } from './src/views/components/Interface';

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
  const [db, setDb] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    let banco;
    async function abrir() {
      try {
        banco = await openDatabaseAsync('midnighttrain.db');
        if (!ativo) {
          await banco.closeAsync();
          return;
        }
        await inicializarBanco(banco);
        const registros = await carregarEstoque(banco);
        if (ativo) {
          setLotes(registros);
          setDb(banco);
        }
      } catch (falha) {
        if (ativo) setErro(falha.message);
      }
    }
    abrir();
    return () => {
      ativo = false;
      if (banco) banco.closeAsync().catch(() => {});
    };
  }, [tentativa]);

  async function gravarLote(draft, chave) {
    await salvarLote(db, draft, chave);
    setLotes(await carregarEstoque(db));
  }

  async function gravarDormente(id, draft) {
    await salvarDormente(db, id, draft);
    setLotes(await carregarEstoque(db));
  }

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <NavigationContainer theme={tema}>
          {db ? (
            <EstoqueNavigation lotes={lotes} onSalvarLote={gravarLote} onSalvarDormente={gravarDormente} />
          ) : (
            <SafeAreaView style={[styles.carregando, { backgroundColor: tema.colors.background }]}>
              {erro ? (
                <View style={styles.conteudo}>
                  <Titulo>Não foi possível abrir o estoque</Titulo>
                  <Texto>{erro}</Texto>
                  <Acao titulo="Tentar novamente" onPress={() => { setErro(null); setTentativa(tentativa + 1); }} />
                </View>
              ) : <ActivityIndicator accessibilityLabel="Carregando estoque" color={tema.colors.primary} />}
            </SafeAreaView>
          )}
        </NavigationContainer>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  conteudo: { gap: 12 },
});
