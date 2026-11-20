import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PERIODOS, carregarDashboard, listarPatios, relatorioTexto } from '../../models/dashboard.mjs';
import { podeVerDashboard } from '../../models/permissoes.mjs';
import { gravarPreferencia, lerPreferencia } from '../../models/preferencias.mjs';
import { useSessao } from '../../sessao';
import { Acao, Cartao, Formulario, IconeBotao, MenuOpcoes, Texto, Titulo } from '../components/Interface';
import { usePaleta } from './cores';
import { CATALOGO, ORDEM_PADRAO, OCULTOS_PADRAO, Renderizar, normalizarLayout } from './widgets';

const nomeWidget = id => CATALOGO.find(w => w.id === id).nome;
const larguraWidget = id => CATALOGO.find(w => w.id === id).largura;

export default function DashboardView({ navigation }) {
  const { db, usuario } = useSessao();
  const { colors } = useTheme();
  const paleta = usePaleta();
  const [dash, setDash] = useState(null);
  const [erro, setErro] = useState(null);
  const [atualizando, setAtualizando] = useState(false);
  const [patio, setPatio] = useState(null);
  const [patios, setPatios] = useState([]);
  const [periodo, setPeriodo] = useState('7 dias');
  const [layout, setLayout] = useState({ ordem: ORDEM_PADRAO, ocultos: OCULTOS_PADRAO });
  const [painel, setPainel] = useState(null); // 'periodo' | 'menu' | 'alertas' | 'widgets' | 'exportar'
  const pedido = useRef(0);
  const liberado = podeVerDashboard(usuario);

  const carregar = useCallback(async (filtros = {}) => {
    const numero = ++pedido.current;
    try {
      const novo = await carregarDashboard(db, { patio: 'patio' in filtros ? filtros.patio : patio, periodo: 'periodo' in filtros ? filtros.periodo : periodo });
      const lista = await listarPatios(db);
      if (numero !== pedido.current) return; // chegou uma resposta mais nova
      setDash(novo); setPatios(lista); setErro(null);
    } catch (falha) {
      if (numero === pedido.current) setErro(falha.message);
    }
  }, [db, patio, periodo]);

  // Recalcula sempre que a tela volta ao foco: o banco é local, então os dados estão sempre atuais.
  useFocusEffect(useCallback(() => { if (liberado) carregar(); }, [carregar, liberado]));

  React.useEffect(() => {
    if (!liberado) return;
    lerPreferencia(db, 'dashboard.widgets').then(salvo => setLayout(normalizarLayout(salvo)));
  }, [db, liberado]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Dashboard',
      headerRight: liberado ? () => (
        <View style={estilos.cabecalhoAcoes}>
          <View>
            <IconeBotao titulo={`Alertas: ${dash?.alertas.total ?? 0}`} icone="notifications-outline" onPress={() => setPainel('alertas')} />
            {!!dash?.alertas.total && <View style={[estilos.selo, { backgroundColor: paleta.ruim.fg }]}><Text style={estilos.seloTexto}>{dash.alertas.total}</Text></View>}
          </View>
          <IconeBotao titulo="Mais opções" icone="ellipsis-horizontal" onPress={() => setPainel('menu')} />
        </View>
      ) : undefined,
    });
  }, [navigation, liberado, dash, paleta]);

  if (!liberado) {
    return (
      <SafeAreaView style={estilos.bloqueado}>
        <Ionicons name="lock-closed-outline" size={44} color={colors.secondaryText} accessible={false} />
        <Titulo>Acesso restrito</Titulo>
        <Texto secundario>Você não tem permissão para ver o dashboard.</Texto>
        <Acao titulo="Voltar ao Estoque" destaque onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const ir = filtro => navigation.navigate('Dormentes', { ...filtro, patio });
  const salvarLayout = novo => { setLayout(novo); gravarPreferencia(db, 'dashboard.widgets', novo).catch(() => {}); };
  const visiveis = layout.ordem.filter(id => !layout.ocultos.includes(id));
  const puxar = async () => { setAtualizando(true); await carregar(); setAtualizando(false); };
  const escolherPatio = valor => { setPatio(valor); carregar({ patio: valor }); };
  const escolherPeriodo = valor => { setPeriodo(valor); setPainel(null); carregar({ periodo: valor }); };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[estilos.tela, { backgroundColor: colors.background }]}>
      <View style={estilos.filtros}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
          {[null, ...patios].map(p => {
            const sel = p === patio;
            return (
              <Pressable key={p ?? 'todos'} accessibilityRole="button" accessibilityState={{ selected: sel }} onPress={() => escolherPatio(p)}
                style={[estilos.chip, { backgroundColor: sel ? colors.primary : colors.card, borderColor: paleta.borda }]}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: sel ? '#fff' : colors.text }}>{p ?? 'Todos'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel={`Período: ${periodo}`} onPress={() => setPainel('periodo')}
          style={[estilos.periodo, { backgroundColor: colors.card, borderColor: paleta.borda }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} accessible={false} />
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{periodo}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.secondaryText} accessible={false} />
        </Pressable>
      </View>

      {!dash && !erro && <ActivityIndicator style={estilos.carregando} accessibilityLabel="Carregando dashboard" color={colors.primary} />}
      {erro && <View style={estilos.carregando}><Texto>Não foi possível carregar o dashboard.</Texto><Texto secundario>{erro}</Texto><Acao titulo="Tentar novamente" onPress={() => carregar()} /></View>}
      {dash && (
        <ScrollView contentContainerStyle={estilos.lista} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={puxar} tintColor={colors.primary} />}>
          {visiveis.length === 0 && <Texto secundario>Nenhum widget ativo. Use os três pontinhos para personalizar.</Texto>}
          <View style={estilos.grade}>
            {visiveis.map(id => (
              <View key={id} style={larguraWidget(id) === 'meia' ? estilos.meia : estilos.cheia}>
                <Renderizar id={id} dash={dash} ir={ir} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {painel === 'periodo' && <MenuOpcoes titulo="Período" opcoes={Object.keys(PERIODOS)} selecionado={periodo}
        aoFechar={() => setPainel(null)} aoEscolher={escolherPeriodo} />}
      {painel === 'menu' && <MenuOpcoes titulo="Dashboard" opcoes={['Personalizar widgets', 'Exportar relatório']} selecionado=""
        aoFechar={() => setPainel(null)} aoEscolher={op => setPainel(op === 'Personalizar widgets' ? 'widgets' : 'exportar')} />}
      {painel === 'alertas' && dash && <AlertasSheet alertas={dash.alertas} fechar={() => setPainel(null)}
        abrir={a => { setPainel(null); if (a.filtro) ir(a.filtro); else navigation.navigate('Estoque'); }} />}
      {painel === 'widgets' && <PersonalizarSheet layout={layout} aoMudar={salvarLayout} fechar={() => setPainel(null)} />}
      {painel === 'exportar' && dash && <ExportarSheet dash={dash} fechar={() => setPainel(null)} />}
    </SafeAreaView>
  );
}

function AlertasSheet({ alertas, fechar, abrir }) {
  const { colors } = useTheme();
  const grupo = (titulo, itens) => !!itens.length && (
    <View style={estilos.secao}>
      <Text accessibilityRole="header" style={[estilos.secaoTitulo, { color: colors.secondaryText }]}>{titulo}</Text>
      <Cartao>
        {itens.map(a => (
          <Pressable key={a.chave} accessibilityRole="button" onPress={() => abrir(a)} style={[estilos.alerta, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{a.titulo}</Text>
              <Text style={{ color: colors.secondaryText, fontSize: 13 }}>{a.detalhe}</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{a.n}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} accessible={false} />
          </Pressable>
        ))}
      </Cartao>
    </View>
  );
  return (
    <Formulario titulo="Atenção necessária" fechar={fechar}>
      {alertas.total === 0 && <Texto secundario>Nada precisa de atenção agora.</Texto>}
      {grupo('URGENTE', alertas.urgente)}
      {grupo('PARA REVISAR', alertas.revisar)}
    </Formulario>
  );
}

function PersonalizarSheet({ layout, aoMudar, fechar }) {
  const { colors } = useTheme();
  const mover = (id, passo) => {
    const i = layout.ordem.indexOf(id), j = i + passo;
    if (j < 0 || j >= layout.ordem.length) return;
    const ordem = [...layout.ordem];
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
    aoMudar({ ...layout, ordem });
  };
  const alternar = id => aoMudar({ ...layout, ocultos: layout.ocultos.includes(id) ? layout.ocultos.filter(x => x !== id) : [...layout.ocultos, id] });
  return (
    <Formulario titulo="Personalizar widgets" fechar={fechar} salvar={fechar} acao="OK">
      <Cartao>
        {layout.ordem.map((id, i) => {
          const ligado = !layout.ocultos.includes(id);
          return (
            <View key={id} style={[estilos.widgetLinha, { borderBottomColor: colors.border }]}>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: ligado }} accessibilityLabel={nomeWidget(id)}
                onPress={() => alternar(id)} style={estilos.widgetNome}>
                <Ionicons name={ligado ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={ligado ? colors.primary : colors.secondaryText} accessible={false} />
                <Text style={{ color: colors.text, fontSize: 16, flexShrink: 1 }}>{nomeWidget(id)}</Text>
              </Pressable>
              <IconeBotao titulo={`Mover ${nomeWidget(id)} para cima`} icone="chevron-up" onPress={() => mover(id, -1)} />
              <IconeBotao titulo={`Mover ${nomeWidget(id)} para baixo`} icone="chevron-down" onPress={() => mover(id, 1)} />
            </View>
          );
        })}
      </Cartao>
      <Acao titulo="Restaurar padrão" onPress={() => aoMudar({ ordem: ORDEM_PADRAO, ocultos: OCULTOS_PADRAO })} />
    </Formulario>
  );
}

function ExportarSheet({ dash, fechar }) {
  const { colors } = useTheme();
  const texto = relatorioTexto(dash);
  const [erro, setErro] = useState(null);
  async function compartilhar() {
    try { await Share.share({ title: 'Relatório MidnightTrain', message: texto }); setErro(null); }
    catch (falha) { setErro(falha.message); }
  }
  return (
    <Formulario titulo="Exportar relatório" fechar={fechar} salvar={compartilhar} acao="Compartilhar">
      <Texto secundario>O relatório usa o pátio e o período escolhidos no dashboard.</Texto>
      <Cartao><Text selectable style={{ color: colors.text, fontSize: 14, lineHeight: 21, paddingVertical: 10 }}>{texto}</Text></Cartao>
      {erro && <Texto>{erro}</Texto>}
    </Formulario>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  bloqueado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  cabecalhoAcoes: { flexDirection: 'row', alignItems: 'center' },
  selo: { position: 'absolute', top: 6, right: 4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  seloTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },
  filtros: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 12, paddingVertical: 8, gap: 8 },
  chips: { gap: 8, paddingRight: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  periodo: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  lista: { padding: 16, paddingBottom: 32 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  meia: { flexGrow: 1, flexBasis: '45%' },
  cheia: { width: '100%' },
  secao: { gap: 8 },
  secaoTitulo: { fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
  alerta: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  widgetLinha: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  widgetNome: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
});
