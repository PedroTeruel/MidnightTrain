import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { listarDormentes } from '../../models/dashboard.mjs';
import { registrarBusca } from '../../models/operacoes.mjs';
import { podeVerDashboard } from '../../models/permissoes.mjs';
import { useSessao } from '../../sessao';
import { Acao, Texto, Titulo } from '../components/Interface';
import { corDaCondicao, usePaleta } from '../dashboard/cores';

const filtros = [
  ['todas', 'Todas'], ['nao', 'Não aval.'], ['boa', 'Boa'], ['atencao', 'Atenção'],
  ['ruim', 'Ruim'], ['parados', '+30 dias'], ['extraviados', 'Extraviados'],
];

export default function DormentesView({ navigation, route }) {
  const { db, usuario } = useSessao();
  const { colors } = useTheme();
  const paleta = usePaleta();
  const [cond, setCond] = useState(route.params?.cond ?? 'todas');
  const [lote, setLote] = useState(route.params?.lote ?? null);
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState({ total: 0, linhas: [] });
  const inicioBusca = useRef(null);
  const patio = route.params?.patio ?? null;
  const liberado = podeVerDashboard(usuario);

  useLayoutEffect(() => { navigation.setOptions({ title: 'Dormentes' }); }, [navigation]);

  const carregar = useCallback(() => {
    if (!liberado) return;
    listarDormentes(db, { cond, lote, patio, busca }).then(setResultado).catch(() => setResultado({ total: 0, linhas: [] }));
  }, [db, cond, lote, patio, busca, liberado]);
  useFocusEffect(carregar);

  if (!liberado) {
    return (
      <SafeAreaView style={estilos.bloqueado}>
        <Ionicons name="lock-closed-outline" size={44} color={colors.secondaryText} accessible={false} />
        <Titulo>Acesso restrito</Titulo>
        <Texto secundario>Você não tem permissão para ver esta área.</Texto>
        <Acao titulo="Voltar" destaque onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  function digitar(texto) {
    if (!busca && texto && !inicioBusca.current) inicioBusca.current = new Date();
    if (!texto) inicioBusca.current = null;
    setBusca(texto);
  }

  // Abrir o resultado de uma busca fecha o cronômetro do tempo de localização.
  async function abrir(item) {
    if (busca && inicioBusca.current) {
      try { await registrarBusca(db, { dormenteId: item.id, iniciadaEm: inicioBusca.current, usuarioId: usuario?.id ?? null }); } catch { /* a navegação não depende do registro */ }
      inicioBusca.current = null;
    }
    navigation.navigate('Dormente', { id: item.id, chave: item.loteChave });
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[estilos.tela, { backgroundColor: colors.background }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.faixa} contentContainerStyle={estilos.chips}>
        {lote != null && (
          <Pressable accessibilityRole="button" accessibilityLabel="Remover filtro de lote" onPress={() => setLote(null)}
            style={[estilos.chip, { backgroundColor: paleta.trilho, flexDirection: 'row', gap: 6 }]}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Lote {resultado.linhas[0]?.loteId ?? ''}</Text>
            <Ionicons name="close" size={14} color={colors.text} accessible={false} />
          </Pressable>
        )}
        {filtros.map(([chave, nome]) => {
          const sel = chave === cond;
          return (
            <Pressable key={chave} accessibilityRole="button" accessibilityState={{ selected: sel }} onPress={() => setCond(chave)}
              style={[estilos.chip, { backgroundColor: sel ? colors.primary : colors.card, borderColor: paleta.borda, borderWidth: StyleSheet.hairlineWidth }]}>
              <Text style={{ color: sel ? '#fff' : colors.text, fontSize: 15, fontWeight: '600' }}>{nome}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <FlatList
        data={resultado.linhas} keyExtractor={item => item.id} contentContainerStyle={estilos.lista}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        ListHeaderComponent={<Text style={[estilos.contagem, { color: colors.secondaryText }]}>
          {resultado.total} {resultado.total === 1 ? 'dormente' : 'dormentes'}{resultado.total > resultado.linhas.length ? ` (mostrando ${resultado.linhas.length})` : ''}</Text>}
        ListEmptyComponent={<View style={estilos.vazio}><Texto secundario>Nenhum dormente aqui. Troque o filtro ou a busca.</Texto></View>}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => abrir(item)}
            style={[estilos.cartao, { backgroundColor: colors.card, shadowColor: colors.text }]}>
            <View style={[estilos.ponto, { backgroundColor: corDaCondicao(paleta, item.condicao) }]} />
            <View style={estilos.dados}>
              <Texto>{item.nome}</Texto>
              <Texto secundario>Lote {item.loteId} · {item.patio} · {item.dias === 0 ? 'hoje' : `há ${item.dias} ${item.dias === 1 ? 'dia' : 'dias'}`}</Texto>
              <View style={estilos.linhaCond}>
                <Texto>{item.condicao}</Texto>
                {item.extraviado && <View style={[estilos.tag, { backgroundColor: paleta.ruim.bg }]}><Text style={{ color: paleta.ruim.fg, fontSize: 12, fontWeight: '600' }}>Extraviado</Text></View>}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} accessible={false} />
          </Pressable>
        )}
      />
      <View style={estilos.barra}>
        <View style={[estilos.busca, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.text} accessible={false} />
          <TextInput accessibilityLabel="Buscar dormente" placeholder="Buscar dormente (ex.: D-0147)" placeholderTextColor={colors.secondaryText}
            value={busca} onChangeText={digitar} autoCorrect={false} returnKeyType="search" style={[estilos.entrada, { color: colors.text }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  bloqueado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  faixa: { flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: 16, gap: 18, paddingBottom: 24 },
  contagem: { fontSize: 13, paddingHorizontal: 4 },
  vazio: { alignItems: 'center', paddingVertical: 30 },
  cartao: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderRadius: 20, minHeight: 48, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  ponto: { width: 14, height: 14, borderRadius: 7, marginHorizontal: 5 },
  dados: { flex: 1, gap: 5 },
  linhaCond: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { paddingVertical: 1, paddingHorizontal: 8, borderRadius: 9 },
  barra: { paddingHorizontal: 16, paddingVertical: 10 },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth },
  entrada: { minHeight: 48, flex: 1, fontSize: 16, paddingVertical: 8 },
});
