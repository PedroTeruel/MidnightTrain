import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Acao, Cartao, Texto, Titulo } from '../components/Interface';

export default function GestorScreen({ usuario, onAbrirDashboard, onSair }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.tela, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Ionicons name="stats-chart-outline" size={38} color={colors.primary} accessible={false} />
        <Titulo>Área de gestão</Titulo>
        <Texto secundario>{usuario.nome} · {usuario.perfil}</Texto>
        <Cartao>
          <View style={styles.cartao}>
            <Texto>Visualize os indicadores e dados do estoque em tempo real.</Texto>
            <Acao titulo="Abrir dashboard" icone="stats-chart-outline" destaque onPress={onAbrirDashboard} />
          </View>
        </Cartao>
        <Acao titulo="Sair da conta" icone="log-out-outline" perigo onPress={onSair} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { padding: 20, gap: 16 },
  cartao: { paddingVertical: 20, gap: 16 },
});
