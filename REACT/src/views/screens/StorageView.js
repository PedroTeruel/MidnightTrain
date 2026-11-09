import React, { useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { condicoesLote, filtrarLotes, localizarEtiqueta } from '../../models/estoque.mjs';
import { IconeBotao, MenuOpcoes, Texto } from '../components/Interface';
import LeituraNFC from '../components/LeituraNFC';
import LoteEditSheet from '../components/LoteEditSheet';

export default function StorageView({ navigation, lotes, onSalvarLote }) {
  const { colors } = useTheme();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [menu, setMenu] = useState(false);
  const [cadastro, setCadastro] = useState(null);
  const filtrados = filtrarLotes(lotes, busca, filtro === 'Todos' ? null : filtro);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconeBotao titulo="Registrar lote" icone="add" onPress={() => setCadastro({ codigo: '' })} />
      ),
    });
  }, [navigation]);

  function identificar(codigo) {
    const encontrados = localizarEtiqueta(lotes, codigo);
    if (encontrados.length === 1) {
      navigation.navigate('Lote', { chave: encontrados[0].chave });
    } else if (encontrados.length > 1) {
      Alert.alert('Etiqueta associada a vários lotes',
        'A etiqueta precisa estar associada a um único lote. Verifique o código em Editar lote.');
    } else {
      Alert.alert('Etiqueta ainda sem lote', 'Você pode registrar um lote e associar esta etiqueta a ele.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Registrar lote', onPress: () => setCadastro({ codigo }) },
      ]);
    }
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.tela, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtrados} keyExtractor={lote => String(lote.chave)}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        ListHeaderComponent={<LeituraNFC titulo="Identificar lote" onCodigo={identificar} destaque />}
        ListEmptyComponent={<View style={styles.vazio}><Texto secundario>Nenhum lote encontrado</Texto></View>}
        renderItem={({ item: lote }) => (
          <Pressable accessibilityRole="button"
            onPress={() => navigation.navigate('Lote', { chave: lote.chave })}
            style={[styles.lote, { backgroundColor: colors.card, shadowColor: colors.text }]}>
            <Ionicons name="cube-outline" size={25} color={colors.text} accessible={false} />
            <View style={styles.dados}>
              <Texto>Lote {lote.id}</Texto>
              <Texto secundario>Setor {lote.setor} · {lote.dormentes.length} dormentes</Texto>
              <Texto>{lote.condicao}</Texto>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} accessible={false} />
          </Pressable>
        )}
      />
      <View style={styles.barra}>
        <View style={[styles.busca, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.text} accessible={false} />
          <TextInput
            accessibilityLabel="Buscar lote, setor ou espécie" placeholder="Buscar lote, setor ou espécie"
            placeholderTextColor={colors.secondaryText} value={busca} onChangeText={setBusca}
            autoCorrect={false} returnKeyType="search" style={[styles.entrada, { color: colors.text }]}
          />
        </View>
        <IconeBotao titulo="Filtrar lotes por condição" icone="options-outline" valor={filtro}
          onPress={() => setMenu(true)} circular />
      </View>
      {menu && <MenuOpcoes titulo="Filtrar lotes por condição" opcoes={['Todos', ...condicoesLote]}
        selecionado={filtro} aoFechar={() => setMenu(false)}
        aoEscolher={valor => { setFiltro(valor); setMenu(false); }} />}
      {cadastro && <LoteEditSheet codigoInicial={cadastro.codigo}
        fechar={() => setCadastro(null)} onSalvar={onSalvarLote} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  lista: { padding: 16, gap: 18, paddingBottom: 24 },
  vazio: { alignItems: 'center', paddingVertical: 30 },
  lote: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderRadius: 20, minHeight: 48, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  dados: { flex: 1, gap: 5 },
  barra: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingHorizontal: 14, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth },
  entrada: { minHeight: 48, flex: 1, fontSize: 16, paddingVertical: 8 },
});
