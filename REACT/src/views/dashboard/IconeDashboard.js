import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

// Botão do dashboard no Estoque: três barras arredondadas num círculo azul claro (igual ao protótipo).
export default function IconeDashboard({ onPress }) {
  const { colors, dark } = useTheme();
  const barra = (esq, topo, altura) => (
    <View style={{ position: 'absolute', left: esq, top: topo, width: 2, height: altura, borderRadius: 1, backgroundColor: colors.primary }} />
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir dashboard" onPress={onPress}
      style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#14284a' : '#dbe8ff' }}>
        <View style={{ width: 24, height: 24 }}>
          {barra(4, 12, 9)}{barra(11, 4, 17)}{barra(18, 9, 12)}
        </View>
      </View>
    </Pressable>
  );
}
