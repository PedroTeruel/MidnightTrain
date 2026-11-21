import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PERIODOS, carregarDashboard, listarPatios, relatorioTexto } from '../../models/dashboard.mjs';
import { gerarDadosExemplo, removerDadosExemplo } from '../../models/exemplo.mjs';
import { podeVerDashboard } from '../../models/permissoes.mjs';
import { gravarPreferencia, lerPreferencia } from '../../models/preferencias.mjs';
import { useSessao } from '../../sessao';
import { Acao, IconeBotao, Texto, Titulo } from '../components/Interface';
import { relatorioHtml, relatorioSecoes } from '../../models/relatorio.mjs';
import { CorpoRolavel, FolhaInferior, ItemPopover, Popover } from './Pecas';
import { usePaleta } from './cores';
import { CATALOGO, ORDEM_PADRAO, OCULTOS_PADRAO, Renderizar, normalizarLayout } from './widgets';

const nomeWidget = id => CATALOGO.find(w => w.id === id).nome;
const TIPOS_WIDGET = { aval: 'Indicador', perd: 'Indicador', loc: 'Indicador', efi: 'Indicador', lotesk: 'Indicador', recentes: 'Lista' };
const tipoWidget = id => TIPOS_WIDGET[id] ?? 'Gráfico';

// Seta de ordem; fica apagada e inerte quando não há para onde mover.
function SetaOrdem({ titulo, icone, desativado, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} accessibilityState={{ disabled: !!desativado }}
      disabled={desativado} onPress={onPress} style={estilos.setaOrdem}>
      <Ionicons name={icone} size={22} color={desativado ? colors.border : colors.primary} accessible={false} />
    </Pressable>
  );
}
const larguraWidget = id => CATALOGO.find(w => w.id === id).largura;

export default function DashboardView({ navigation }) {
  const { db, usuario, recarregar } = useSessao();
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
  const botaoPeriodo = useRef(null);
  const [ancoraPeriodo, setAncoraPeriodo] = useState({ top: 120, right: 16 });
  const { width: larguraTela } = useWindowDimensions();
  const { top: topoSeguro } = useSafeAreaInsets();
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

  // Opções de teste só aparecem em desenvolvimento; não vão para o app de produção.
  const opcoesMenu = [
    { texto: 'Personalizar widgets', icone: 'apps-outline' },
    { texto: 'Exportar relatório', icone: 'download-outline' },
    ...(__DEV__ ? [
      { texto: 'Gerar dados de exemplo', icone: 'flask-outline' },
      { texto: 'Remover dados de exemplo', icone: 'trash-outline' },
    ] : []),
  ];

  async function escolherMenu(op) {
    setPainel(op === 'Personalizar widgets' ? 'widgets' : op === 'Exportar relatório' ? 'exportar' : null);
    if (op === 'Gerar dados de exemplo') await gerarDadosExemplo(db);
    else if (op === 'Remover dados de exemplo') await removerDadosExemplo(db);
    else return;
    await recarregar();
    await carregar();
  }

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
  const abrirPeriodo = () => {
    // Mede o botão para o menu abrir logo abaixo dele, alinhado à direita.
    botaoPeriodo.current?.measureInWindow((x, y, w, h) => {
      if (w) setAncoraPeriodo({ top: y + h + 6, right: Math.max(8, larguraTela - (x + w)) });
      setPainel('periodo');
    });
  };
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
        <Pressable ref={botaoPeriodo} accessibilityRole="button" accessibilityLabel={`Período: ${periodo}`} onPress={abrirPeriodo}
          style={[estilos.periodo, { backgroundColor: colors.card, borderColor: paleta.borda }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} accessible={false} />
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{{ '7 dias': '7 d', '4 semanas': '4 sem', '3 meses': '3 m' }[periodo]}</Text>
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

      {painel === 'periodo' && (
        <Popover aoFechar={() => setPainel(null)} ancora={ancoraPeriodo} largura={Math.min(280, larguraTela - 32)}>
          {Object.keys(PERIODOS).map(nome => <ItemPopover key={nome} texto={nome} marcado={nome === periodo} aoPressionar={() => escolherPeriodo(nome)} />)}
        </Popover>
      )}
      {painel === 'menu' && (
        <Popover aoFechar={() => setPainel(null)} ancora={{ top: topoSeguro + 52, right: 12 }} largura={Math.min(300, larguraTela - 24)}>
          {opcoesMenu.map(o => <ItemPopover key={o.texto} icone={o.icone} texto={o.texto} aoPressionar={() => escolherMenu(o.texto)} />)}
        </Popover>
      )}
      {painel === 'alertas' && dash && <AlertasSheet alertas={dash.alertas} fechar={() => setPainel(null)}
        abrir={a => { setPainel(null); if (a.filtro) ir(a.filtro); else navigation.navigate('Estoque'); }} />}
      {painel === 'widgets' && <PersonalizarSheet layout={layout} aoMudar={salvarLayout} fechar={() => setPainel(null)} />}
      {painel === 'exportar' && dash && <ExportarSheet db={db} dash={dash} fechar={() => setPainel(null)} />}
    </SafeAreaView>
  );
}

const ICONES_ALERTA = { extraviados: 'close-circle-outline', ruim: 'warning-outline', parados: 'time-outline', pendentes: 'hourglass-outline', semnfc: 'radio-outline' };

function AlertasSheet({ alertas, fechar, abrir }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const grupo = (titulo, itens, cor) => !!itens.length && (
    <View style={estilos.secao}>
      <Text accessibilityRole="header" style={[estilos.secaoTitulo, { color: colors.secondaryText }]}>{titulo}</Text>
      {itens.map(a => (
        <Pressable key={a.chave} accessibilityRole="button" accessibilityLabel={`${a.titulo}: ${a.n}`} onPress={() => abrir(a)}
          style={[estilos.alerta, { backgroundColor: colors.background }]}>
          <View style={[estilos.alertaIcone, { backgroundColor: cor.bg }]}>
            <Ionicons name={ICONES_ALERTA[a.chave] ?? 'alert-circle-outline'} size={21} color={cor.fg} accessible={false} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{a.titulo}</Text>
            <Text style={{ color: colors.secondaryText, fontSize: 13 }}>{a.detalhe}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{a.n}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} accessible={false} />
        </Pressable>
      ))}
    </View>
  );
  return (
    <FolhaInferior titulo="Alertas" aoFechar={fechar}
      subtitulo={alertas.total ? `${alertas.total} ${alertas.total === 1 ? 'item pede' : 'itens pedem'} sua atenção` : undefined}>
      <CorpoRolavel>
        {alertas.total === 0 && (
          <View style={estilos.vazio}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Nada precisa de atenção</Text>
            <Text style={{ color: colors.secondaryText, fontSize: 14, textAlign: 'center' }}>Os alertas aparecem aqui quando houver algo a revisar.</Text>
          </View>
        )}
        {grupo('URGENTE', alertas.urgente, paleta.ruim)}
        {grupo('REVISAR', alertas.revisar, paleta.aviso)}
      </CorpoRolavel>
    </FolhaInferior>
  );
}

function PersonalizarSheet({ layout, aoMudar, fechar }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const ultimo = layout.ordem.length - 1;
  const mover = (id, passo) => {
    const i = layout.ordem.indexOf(id), j = i + passo;
    if (j < 0 || j > ultimo) return;
    const ordem = [...layout.ordem];
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
    aoMudar({ ...layout, ordem });
  };
  const alternar = id => aoMudar({ ...layout, ocultos: layout.ocultos.includes(id) ? layout.ocultos.filter(x => x !== id) : [...layout.ocultos, id] });
  return (
    <FolhaInferior titulo="Personalizar widgets" subtitulo="Ative, desative e mude a ordem" aoFechar={fechar} altura="86%"
      rodape={(
        <View style={[estilos.rodape, { borderTopColor: paleta.borda, backgroundColor: colors.card }]}>
          <Pressable accessibilityRole="button" onPress={() => aoMudar({ ordem: ORDEM_PADRAO, ocultos: OCULTOS_PADRAO })}
            style={[estilos.botaoSecundario, { backgroundColor: colors.background }]}>
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>Restaurar padrão</Text>
          </Pressable>
        </View>
      )}>
      <CorpoRolavel>
        <View style={{ gap: 8 }}>
          {layout.ordem.map((id, i) => {
            const ligado = !layout.ocultos.includes(id);
            return (
              <View key={id} style={[estilos.widgetLinha, { backgroundColor: colors.background, opacity: ligado ? 1 : 0.6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{nomeWidget(id)}</Text>
                  <Text style={{ color: colors.secondaryText, fontSize: 13 }}>{tipoWidget(id)}</Text>
                </View>
                <SetaOrdem titulo={`Mover ${nomeWidget(id)} para cima`} icone="chevron-up" desativado={i === 0} onPress={() => mover(id, -1)} />
                <SetaOrdem titulo={`Mover ${nomeWidget(id)} para baixo`} icone="chevron-down" desativado={i === ultimo} onPress={() => mover(id, 1)} />
                <Switch accessibilityLabel={nomeWidget(id)} value={ligado} onValueChange={() => alternar(id)}
                  trackColor={{ false: paleta.trilho, true: colors.primary }} thumbColor="#fff" />
              </View>
            );
          })}
        </View>
      </CorpoRolavel>
    </FolhaInferior>
  );
}

// Cores fixas: a folha do relatório é sempre branca, como o PDF.
const tinta = '#1c1c1e', suave = '#55555c', linha = '#d8d8de';
const TituloPapel = ({ children }) => <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: suave, marginBottom: 6 }}>{children}</Text>;
const LinhaPapel = ({ children }) => <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: linha }}>{children}</View>;

function ExportarSheet({ db, dash, fechar }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const [periodoExp, setPeriodoExp] = useState(dash.periodo);
  const [dados, setDados] = useState(dash);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(null);
  const secoes = relatorioSecoes(dados);

  const escolher = async nome => {
    setPeriodoExp(nome);
    try { setDados(await carregarDashboard(db, { patio: dash.patio, periodo: nome })); setErro(null); }
    catch (falha) { setErro(falha.message); }
  };
  async function baixarPdf() {
    setOcupado(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: relatorioHtml(dados) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Relatório MidnightTrain' });
        setErro(null);
      } else setErro('Este aparelho não consegue compartilhar o arquivo.');
    } catch (falha) { setErro(falha.message); }
    setOcupado(false);
  }
  async function compartilharTexto() {
    try { await Share.share({ title: 'Relatório MidnightTrain', message: relatorioTexto(dados) }); setErro(null); }
    catch (falha) { setErro(falha.message); }
  }

  return (
    <FolhaInferior titulo="Exportar relatório" subtitulo="Resumo em PDF dos indicadores" aoFechar={fechar} altura="90%"
      rodape={(
        <View style={[estilos.rodape, { borderTopColor: paleta.borda, backgroundColor: colors.card, flexDirection: 'row', gap: 10 }]}>
          <Pressable accessibilityRole="button" disabled={ocupado} onPress={baixarPdf}
            style={[estilos.botaoPrimario, { backgroundColor: colors.primary, opacity: ocupado ? 0.7 : 1 }]}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{ocupado ? 'Gerando PDF…' : 'Baixar PDF'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Compartilhar como texto" onPress={compartilharTexto}
            style={[estilos.botaoIcone, { backgroundColor: colors.background }]}>
            <Ionicons name="share-outline" size={24} color={colors.primary} accessible={false} />
          </Pressable>
        </View>
      )}>
      <View accessibilityRole="tablist" style={[estilos.segmentosExp, { backgroundColor: paleta.trilho }]}>
        {Object.keys(PERIODOS).map(nome => {
          const sel = nome === periodoExp;
          return (
            <Pressable key={nome} accessibilityRole="tab" accessibilityState={{ selected: sel }} onPress={() => escolher(nome)}
              style={[estilos.segmentoExp, sel && { backgroundColor: colors.card, elevation: 2 }]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: sel ? colors.text : colors.secondaryText }}>{nome}</Text>
            </Pressable>
          );
        })}
      </View>
      <CorpoRolavel fundo={colors.background}>
        <View style={estilos.papel}>
          <View style={{ borderBottomWidth: 2, borderBottomColor: tinta, paddingBottom: 12, gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.4, color: suave }}>{secoes.cabecalho.marca}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: tinta }}>{secoes.cabecalho.titulo}</Text>
            <Text style={{ fontSize: 12, color: suave }}>{secoes.cabecalho.sub}</Text>
          </View>
          <View>
            <TituloPapel>{secoes.indicadores.titulo}</TituloPapel>
            <View style={{ flexDirection: 'row', paddingBottom: 6 }}>
              {secoes.indicadores.colunas.map((c, i) => <Text key={c} style={{ flex: i === 0 ? 1.5 : i === 1 ? 0.8 : 1, fontSize: 12, color: suave }}>{c}</Text>)}
            </View>
            {secoes.indicadores.linhas.map(l => (
              <LinhaPapel key={l[0]}>
                <Text style={{ flex: 1.5, fontSize: 12, fontWeight: '600', color: tinta }}>{l[0]}</Text>
                <Text style={{ flex: 0.8, fontSize: 12, fontWeight: '700', color: tinta }}>{l[1]}</Text>
                <Text style={{ flex: 1, fontSize: 12, color: tinta }}>{l[2]}</Text>
              </LinhaPapel>
            ))}
          </View>
          {[secoes.condicao, secoes.movimentacoes].map(sec => (
            <View key={sec.titulo}>
              <TituloPapel>{sec.titulo}</TituloPapel>
              {sec.linhas.map(l => (
                <LinhaPapel key={l.nome}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.cor, marginRight: 6 }} />
                  <Text style={{ flex: 1, fontSize: 12, color: tinta }}>{l.nome}</Text>
                  <Text style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: '700', color: tinta }}>{l.n}</Text>
                  {l.extra != null && <Text style={{ width: 44, textAlign: 'right', fontSize: 12, color: suave }}>{l.extra}</Text>}
                </LinhaPapel>
              ))}
            </View>
          ))}
          <View>
            <TituloPapel>{secoes.pendencias.titulo}</TituloPapel>
            {secoes.pendencias.linhas.map(l => (
              <LinhaPapel key={l.nome}>
                <Text style={{ flex: 1, fontSize: 12, color: tinta }}>{l.nome}</Text>
                <Text style={{ width: 32, textAlign: 'right', fontSize: 12, fontWeight: '700', color: tinta }}>{l.n}</Text>
              </LinhaPapel>
            ))}
          </View>
        </View>
        {erro && <Text style={{ color: paleta.ruim.fg, fontSize: 14 }}>{erro}</Text>}
      </CorpoRolavel>
    </FolhaInferior>
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
  alerta: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 },
  alertaIcone: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  setaOrdem: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  vazio: { alignItems: 'center', gap: 6, paddingVertical: 28, paddingHorizontal: 16 },
  widgetLinha: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingLeft: 16, paddingRight: 10, borderRadius: 16 },
  rodape: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, borderTopWidth: StyleSheet.hairlineWidth },
  botaoSecundario: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  botaoPrimario: { flex: 1, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  botaoIcone: { width: 50, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segmentosExp: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 10, marginHorizontal: 16, marginTop: 4, marginBottom: 8 },
  segmentoExp: { flex: 1, minHeight: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  papel: { backgroundColor: '#ffffff', borderRadius: 6, paddingVertical: 20, paddingHorizontal: 18, gap: 18, elevation: 3, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8 },
});
