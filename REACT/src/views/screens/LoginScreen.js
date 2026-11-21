import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Acao, Campo, Cartao, Texto, Titulo } from '../components/Interface';

export default function LoginScreen({ onEntrar }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function entrar() {
    if (ocupado) return;
    if (!email.trim() || !senha) {
      setErro('Informe o e-mail e a senha.');
      return;
    }

    setOcupado(true);
    setErro('');
    try {
      await onEntrar(email, senha);
    } catch (falha) {
      setErro(falha?.message || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.conteudo}
      >
        <View style={styles.apresentacao}>
          <Ionicons name="train-outline" size={48} color={colors.primary} accessible={false} />
          <Titulo>MidNightTrain</Titulo>
          <Texto secundario>Gestão e inspeção de dormentes</Texto>
        </View>

        <Cartao>
          <View style={styles.formulario}>
            <Text style={[styles.cabecalho, { color: colors.text }]}>Entrar</Text>
            <Campo
              titulo="E-mail"
              valor={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="email"
              returnKeyType="next"
            />
            <Campo
              titulo="Senha"
              valor={senha}
              onChangeText={setSenha}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={entrar}
            />
            {!!erro && (
              <Text accessibilityRole="alert" style={styles.erro}>{erro}</Text>
            )}
            <Acao
              titulo={ocupado ? 'Entrando...' : 'Entrar'}
              icone="log-in-outline"
              destaque
              disabled={ocupado}
              onPress={entrar}
            />
          </View>
        </Cartao>
        <View style={styles.rodape}>
          <Texto secundario>Acesso para funcionários e gestores</Texto>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 26 },
  apresentacao: { alignItems: 'center', gap: 10 },
  formulario: { paddingVertical: 20, paddingHorizontal: 4, gap: 12 },
  cabecalho: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  erro: { color: '#c62828', fontSize: 14 },
  rodape: { alignItems: 'center' },
});
