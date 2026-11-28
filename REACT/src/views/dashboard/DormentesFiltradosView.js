import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { carregarDormentesDashboardApi } from '../../services/dashboardApi';
import { Acao, Cartao, Linha, Texto, Titulo } from '../components/Interface';
import { Pilula } from './Pecas';
import { corDaCondicao, usePaleta } from './cores';

const ROTULOS_COND = {
  todas: 'Todos os dormentes',
  nao: 'Não avaliados',
  boa: 'Condição: Boa',
  atencao: 'Condição: Atenção',
  ruim: 'Condição: Ruim',
  extraviados: 'Extraviados',
};

const ROTULOS_IDADE = {
  ate7: 'Atualizados até 7 dias',
  '8a30': 'Sem atualização (8 a 30 dias)',
  mais30: 'Sem atualização (+30 dias)',
  '31a90': 'Sem atualização (31 a 90 dias)',
  acima90: 'Sem atualização (+90 dias)',
};

const ROTULOS_LISTA_LOTES = {
  lotesPendentes: 'Lotes pendentes',
  lotesSemNfc: 'Lotes sem etiqueta NFC',
};

const ROTULOS_SITUACAO = {
  NAO_INFORMADO: 'Não informado',
  EM_ESTOQUE: 'Em estoque',
  RETIRADO: 'Retirado',
  EXTRAVIADO: 'Extraviado',
};

export default function DormentesFiltradosView({ navigation, route, token }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const params = route.params || {};
  const ehListaLotes =
    params.tipoLista === 'lotesPendentes' || params.tipoLista === 'lotesSemNfc';

  const [itens, setItens] = useState(() =>
    ehListaLotes ? params.itensPreCarregados || [] : []
  );
  const [carregando, setCarregando] = useState(!ehListaLotes);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(
    async (mostrarLoader = false) => {
      if (ehListaLotes) {
        setItens(params.itensPreCarregados || []);
        setCarregando(false);
        setErro(null);
        return;
      }

      if (mostrarLoader) {
        setCarregando(true);
      }
      try {
        const lista = await carregarDormentesDashboardApi(token, {
          cond: params.cond,
          lote: params.lote,
          patio: params.patio,
          idade: params.idade,
        });
        setItens(lista);
        setErro(null);
      } catch (falha) {
        setErro(falha.message);
      } finally {
        setCarregando(false);
      }
    },
    [
      ehListaLotes,
      params.itensPreCarregados,
      token,
      params.cond,
      params.lote,
      params.patio,
      params.idade,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      carregar(false);
    }, [carregar])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        ROTULOS_LISTA_LOTES[params.tipoLista] ||
        ROTULOS_COND[params.cond] ||
        ROTULOS_IDADE[params.idade] ||
        'Dormentes',
    });
  }, [navigation, params.tipoLista, params.cond, params.idade]);

  const subtitulos = [
    params.patio ? `Pátio ${params.patio}` : null,
    params.lote != null ? `Lote #${params.lote}` : null,
    params.idade ? ROTULOS_IDADE[params.idade] : null,
  ].filter(Boolean);

  const singular = ehListaLotes ? 'lote' : 'dormente';
  const plural = ehListaLotes ? 'lotes' : 'dormentes';

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[estilos.tela, { backgroundColor: colors.background }]}
    >
      {carregando ? (
        <ActivityIndicator style={estilos.centro} color={colors.primary} />
      ) : erro ? (
        <View style={estilos.centro}>
          <Texto>Não foi possível carregar os registros.</Texto>
          <Texto secundario>{erro}</Texto>
          <Acao titulo="Tentar novamente" onPress={() => carregar(true)} />
        </View>
      ) : (
        <FlatList
          data={itens}
          keyExtractor={item => String(item.chave ?? item.id)}
          contentContainerStyle={estilos.lista}
          ListHeaderComponent={
            <View style={estilos.cabecalho}>
              <Titulo>
                {itens.length} {itens.length === 1 ? singular : plural}
              </Titulo>
              {subtitulos.length > 0 && <Texto secundario>{subtitulos.join(' · ')}</Texto>}
            </View>
          }
          ListEmptyComponent={
            <View style={estilos.centro}>
              <Texto secundario>Nenhum registro encontrado para este filtro.</Texto>
            </View>
          }
          renderItem={({ item }) => {
            if (ehListaLotes) {
              const corStatus =
                item.condicao === 'Aprovado'
                  ? paleta.boa
                  : item.condicao === 'Reprovado'
                    ? paleta.ruim
                    : paleta.atencao;

              return (
                <Cartao>
                  <View style={estilos.topoCard}>
                    <Text style={[estilos.nome, { color: colors.text }]}>Lote {item.id}</Text>
                    <Pilula
                      texto={item.condicao}
                      cor={{ bg: `${corStatus}26`, fg: corStatus }}
                    />
                  </View>
                  <Linha titulo="Local" valor={`${item.patio} · Setor ${item.setor}`} />
                  <Linha titulo="Dormentes" valor={String(item.totalDormentes ?? 0)} />
                  <Linha
                    titulo="Última atualização"
                    valor={new Date(item.ultimaAtualizacao).toLocaleString('pt-BR')}
                  />
                </Cartao>
              );
            }

            const corCond = corDaCondicao(paleta, item.condicao);
            const extraviado = item.situacao_estoque === 'EXTRAVIADO';
            const localTexto = item.localPatio
              ? `${item.localPatio} · Setor ${item.localSetor}`
              : ROTULOS_SITUACAO[item.situacao_estoque] || 'Não informado';

            return (
              <Cartao>
                <View style={estilos.topoCard}>
                  <Text style={[estilos.nome, { color: colors.text }]}>{item.nome}</Text>
                  <View style={estilos.pilulas}>
                    {extraviado && (
                      <Pilula
                        texto="Extraviado"
                        cor={{ bg: `${paleta.ruim}26`, fg: paleta.ruim }}
                      />
                    )}
                    <Pilula texto={item.condicao} cor={{ bg: `${corCond}26`, fg: corCond }} />
                  </View>
                </View>
                <Linha titulo="Lote" valor={item.loteId || `#${item.loteChave}`} />
                <Linha titulo="Localização" valor={localTexto} />
                <Linha titulo="Espécie" valor={item.especie} />
                <Linha titulo="Tamanho" valor={item.tamanho} />
                <Linha
                  titulo="Última atualização"
                  valor={new Date(item.ultimaAtualizacao).toLocaleString('pt-BR')}
                />
              </Cartao>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  lista: { padding: 16, gap: 14, paddingBottom: 32 },
  cabecalho: { gap: 4, marginBottom: 4 },
  topoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 8,
  },
  pilulas: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nome: { fontSize: 17, fontWeight: '700', flex: 1 },
});