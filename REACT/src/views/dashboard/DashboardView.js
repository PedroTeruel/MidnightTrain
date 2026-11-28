import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  carregarDadosDashboardApi,
  carregarPatiosDashboardApi,
  gerarSeedDashboardApi,
  removerSeedDashboardApi,
} from '../../services/dashboardApi';
import { Acao, Cartao, IconeBotao, Linha, Secao, Texto, Titulo } from '../components/Interface';
import { CorpoRolavel, FolhaInferior, ItemPopover, Pilula, Popover } from './Pecas';
import { usePaleta } from './cores';
import { CATALOGO, ORDEM_PADRAO, OCULTOS_PADRAO, Renderizar, normalizarLayout } from './widgets';

const nomeWidget = id => CATALOGO.find(w => w.id === id).nome;
const TIPOS_WIDGET = {
  aval: 'Indicador',
  perd: 'Indicador',
  loc: 'Indicador',
  efi: 'Indicador',
  lotesk: 'Indicador',
  recentes: 'Lista',
};
const tipoWidget = id => TIPOS_WIDGET[id] ?? 'Gráfico';
const larguraWidget = id => CATALOGO.find(w => w.id === id).largura;

const OPCOES_PERIODO = [
  { chave: '7d', rotulo: '7 dias' },
  { chave: '28d', rotulo: '4 semanas' },
  { chave: '90d', rotulo: '3 meses' },
];

function semNfc(codigos) {
  if (!codigos) return true;
  if (Array.isArray(codigos)) return codigos.length === 0;
  const texto = String(codigos).trim();
  return texto === '' || texto === '[]' || texto === 'null';
}

function SetaOrdem({ titulo, icone, desativado, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!desativado }}
      disabled={desativado}
      onPress={onPress}
      style={estilos.setaOrdem}
    >
      <Ionicons
        name={icone}
        size={22}
        color={desativado ? colors.border : colors.primary}
        accessible={false}
      />
    </Pressable>
  );
}

export default function DashboardView({ navigation, usuario, token }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const [dash, setDash] = useState(null);
  const [erro, setErro] = useState(null);
  const [atualizando, setAtualizando] = useState(false);
  const [executandoSeed, setExecutandoSeed] = useState(false);
  const [periodo, setPeriodo] = useState('7d');
  const [patio, setPatio] = useState(null);
  const [patios, setPatios] = useState([]);
  const [layout, setLayout] = useState(() =>
    normalizarLayout({ ordem: ORDEM_PADRAO, ocultos: OCULTOS_PADRAO })
  );
  const [painel, setPainel] = useState(null); // 'periodo' | 'patio' | 'menu' | 'widgets' | 'alertas' | 'exportar'
  const pedido = useRef(0);
  const { width: larguraTela } = useWindowDimensions();
  const { top: topoSeguro } = useSafeAreaInsets();
  const liberado = usuario?.perfil === 'GERENTE' && !!token;

  const carregar = useCallback(async () => {
    const numero = ++pedido.current;

    try {
      const [dadosDashboard, listaPatios] = await Promise.all([
        carregarDadosDashboardApi(token, periodo, patio),
        carregarPatiosDashboardApi(token).catch(() => []),
      ]);

      if (numero !== pedido.current) return;

      setDash(dadosDashboard);
      setPatios(listaPatios);
      setErro(null);
    } catch (falha) {
      if (numero === pedido.current) {
        setErro(falha.message);
      }
    }
  }, [token, periodo, patio]);

  useFocusEffect(
    useCallback(() => {
      if (liberado) carregar();
    }, [carregar, liberado])
  );

  const totalAlertas = dash?.alertas
    ? (dash.alertas.extraviados?.total || 0) +
      (dash.alertas.ruins?.total || 0) +
      (dash.alertas.semAtualizacao30?.total || 0) +
      (dash.alertas.lotesPendentes?.total || 0) +
      (dash.alertas.lotesSemNfc?.total || 0)
    : 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Dashboard',
      headerRight: liberado
        ? () => (
            <View style={estilos.cabecalhoAcoes}>
              <View style={estilos.sinoWrapper}>
                <IconeBotao
                  titulo="Alertas"
                  icone="notifications-outline"
                  onPress={() => setPainel('alertas')}
                />
                {totalAlertas > 0 && (
                  <View
                    pointerEvents="none"
                    style={[estilos.badgeSino, { backgroundColor: paleta.ruim }]}
                  >
                    <Text style={estilos.badgeSinoTexto}>
                      {totalAlertas > 99 ? '99+' : totalAlertas}
                    </Text>
                  </View>
                )}
              </View>
              <IconeBotao
                titulo="Mais opções"
                icone="ellipsis-horizontal"
                onPress={() => setPainel('menu')}
              />
            </View>
          )
        : undefined,
    });
  }, [navigation, liberado, totalAlertas, paleta.ruim]);

  if (!liberado) {
    return (
      <SafeAreaView style={estilos.bloqueado}>
        <Ionicons
          name="lock-closed-outline"
          size={44}
          color={colors.secondaryText}
          accessible={false}
        />
        <Titulo>Acesso restrito</Titulo>
        <Texto secundario>Você não tem permissão para ver o dashboard.</Texto>
        <Acao titulo="Voltar" destaque onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const ir = filtro => navigation.navigate('Dormentes', { ...filtro, patio });
  const salvarLayout = novo => setLayout(novo);
  const visiveis = layout.ordem.filter(id => !layout.ocultos.includes(id));

  const puxar = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  const gerarDadosExemplo = async () => {
    if (executandoSeed) return;
    setPainel(null);
    setExecutandoSeed(true);
    try {
      await gerarSeedDashboardApi(token);
      await carregar();
      Alert.alert('Dados gerados', 'Os lotes, dormentes e métricas de exemplo foram carregados.');
    } catch (falha) {
      Alert.alert('Erro ao gerar exemplo', falha.message);
    } finally {
      setExecutandoSeed(false);
    }
  };

  const confirmarRemoverExemplo = () => {
    setPainel(null);
    Alert.alert(
      'Remover dados de exemplo',
      'Isso apagará apenas os lotes de demonstração (EX-1 a EX-6) e suas movimentações.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setExecutandoSeed(true);
            try {
              await removerSeedDashboardApi(token);
              await carregar();
              Alert.alert('Removido', 'Os dados de exemplo foram apagados.');
            } catch (falha) {
              Alert.alert('Erro ao remover exemplo', falha.message);
            } finally {
              setExecutandoSeed(false);
            }
          },
        },
      ]
    );
  };

  const rotuloPeriodoAtual = OPCOES_PERIODO.find(p => p.chave === periodo)?.rotulo || '7 dias';

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[estilos.tela, { backgroundColor: colors.background }]}
    >
      <View style={estilos.filtros}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Período: ${rotuloPeriodoAtual}`}
          onPress={() => setPainel('periodo')}
          style={[estilos.chip, { backgroundColor: colors.card, borderColor: paleta.borda }]}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} accessible={false} />
          <Text style={[estilos.chipTexto, { color: colors.text }]}>{rotuloPeriodoAtual}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.secondaryText} accessible={false} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pátio: ${patio || 'Todos os pátios'}`}
          onPress={() => setPainel('patio')}
          style={[estilos.chip, { backgroundColor: colors.card, borderColor: paleta.borda }]}
        >
          <Ionicons name="location-outline" size={16} color={colors.primary} accessible={false} />
          <Text numberOfLines={1} style={[estilos.chipTexto, { color: colors.text }]}>
            {patio || 'Todos os pátios'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.secondaryText} accessible={false} />
        </Pressable>

        {executandoSeed && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {!dash && !erro && (
        <ActivityIndicator
          style={estilos.carregando}
          accessibilityLabel="Carregando dashboard"
          color={colors.primary}
        />
      )}
      {erro && (
        <View style={estilos.carregando}>
          <Texto>Não foi possível carregar o dashboard.</Texto>
          <Texto secundario>{erro}</Texto>
          <Acao titulo="Tentar novamente" onPress={() => carregar()} />
        </View>
      )}
      {dash && (
        <ScrollView
          contentContainerStyle={estilos.lista}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={puxar} tintColor={colors.primary} />
          }
        >
          {visiveis.length === 0 && (
            <Texto secundario>Nenhum widget ativo. Use os três pontinhos para personalizar.</Texto>
          )}
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
        <Popover
          aoFechar={() => setPainel(null)}
          ancora={{ top: topoSeguro + 96, left: 16 }}
          largura={220}
        >
          {OPCOES_PERIODO.map(op => (
            <ItemPopover
              key={op.chave}
              texto={op.rotulo}
              marcado={periodo === op.chave}
              aoPressionar={() => {
                setPeriodo(op.chave);
                setPainel(null);
              }}
            />
          ))}
        </Popover>
      )}

      {painel === 'patio' && (
        <Popover
          aoFechar={() => setPainel(null)}
          ancora={{ top: topoSeguro + 96, left: 130 }}
          largura={Math.min(260, larguraTela - 32)}
        >
          <ItemPopover
            texto="Todos os pátios"
            marcado={patio === null}
            aoPressionar={() => {
              setPatio(null);
              setPainel(null);
            }}
          />
          {patios.map(nomePatio => (
            <ItemPopover
              key={nomePatio}
              texto={nomePatio}
              marcado={patio === nomePatio}
              aoPressionar={() => {
                setPatio(nomePatio);
                setPainel(null);
              }}
            />
          ))}
        </Popover>
      )}

      {painel === 'menu' && (
        <Popover
          aoFechar={() => setPainel(null)}
          ancora={{ top: topoSeguro + 52, right: 12 }}
          largura={Math.min(300, larguraTela - 24)}
        >
          <ItemPopover
            icone="apps-outline"
            texto="Personalizar widgets"
            aoPressionar={() => setPainel('widgets')}
          />
          <ItemPopover
            icone="document-text-outline"
            texto="Exportar relatório"
            aoPressionar={() => setPainel('exportar')}
          />
          <ItemPopover
            icone="flask-outline"
            texto="Gerar dados de exemplo"
            aoPressionar={gerarDadosExemplo}
          />
          <ItemPopover
            icone="trash-outline"
            texto="Remover dados de exemplo"
            aoPressionar={confirmarRemoverExemplo}
          />
          <ItemPopover
            icone="refresh-outline"
            texto="Atualizar dados"
            aoPressionar={() => {
              setPainel(null);
              puxar();
            }}
          />
        </Popover>
      )}

      {painel === 'widgets' && (
        <PersonalizarSheet
          layout={layout}
          aoMudar={salvarLayout}
          fechar={() => setPainel(null)}
        />
      )}

      {painel === 'alertas' && dash && (
        <AlertasSheet
          dash={dash}
          patio={patio}
          fechar={() => setPainel(null)}
          aoNavegar={params => {
            setPainel(null);
            navigation.navigate('Dormentes', { ...params, patio });
          }}
        />
      )}

      {painel === 'exportar' && dash && (
        <ExportarSheet
          dash={dash}
          periodo={periodo}
          patio={patio}
          aoMudarPeriodo={setPeriodo}
          fechar={() => setPainel(null)}
        />
      )}
    </SafeAreaView>
  );
}

function AlertasSheet({ dash, fechar, aoNavegar }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const alertas = dash.alertas || {};
  const lotes = dash.listaLotes || [];

  const urgentes = [
    {
      chave: 'extraviados',
      titulo: 'Dormentes extraviados',
      total: alertas.extraviados?.total || 0,
      lotes: alertas.extraviados?.lotes || '',
      cor: paleta.ruim,
      onPress: () => aoNavegar({ cond: 'extraviados' }),
    },
    {
      chave: 'ruins',
      titulo: 'Dormentes em condição ruim',
      total: alertas.ruins?.total || 0,
      lotes: alertas.ruins?.lotes || '',
      cor: paleta.ruim,
      onPress: () => aoNavegar({ cond: 'ruim' }),
    },
  ].filter(item => item.total > 0);

  const revisar = [
    {
      chave: 'semAtualizacao30',
      titulo: 'Sem atualização há >30 dias',
      total: alertas.semAtualizacao30?.total || 0,
      lotes: alertas.semAtualizacao30?.lotes || '',
      cor: paleta.atencao,
      onPress: () => aoNavegar({ idade: 'mais30' }),
    },
    {
      chave: 'lotesPendentes',
      titulo: 'Lotes pendentes de aprovação',
      total: alertas.lotesPendentes?.total || 0,
      lotes: alertas.lotesPendentes?.lotes || '',
      cor: paleta.atencao,
      onPress: () =>
        aoNavegar({
          tipoLista: 'lotesPendentes',
          itensPreCarregados: lotes.filter(l => l.condicao === 'Pendente'),
        }),
    },
    {
      chave: 'lotesSemNfc',
      titulo: 'Lotes sem etiqueta NFC',
      total: alertas.lotesSemNfc?.total || 0,
      lotes: alertas.lotesSemNfc?.lotes || '',
      cor: colors.primary,
      onPress: () =>
        aoNavegar({
          tipoLista: 'lotesSemNfc',
          itensPreCarregados: lotes.filter(l => semNfc(l.codigosNFCLegados)),
        }),
    },
  ].filter(item => item.total > 0);

  const renderGrupo = (tituloGrupo, lista) => {
    if (lista.length === 0) return null;
    return (
      <View style={estilos.grupoAlerta}>
        <Text style={[estilos.tituloGrupoAlerta, { color: colors.secondaryText }]}>
          {tituloGrupo}
        </Text>
        <View style={{ gap: 10 }}>
          {lista.map(item => (
            <Pressable
              key={item.chave}
              accessibilityRole="button"
              onPress={item.onPress}
              style={[estilos.cardAlerta, { backgroundColor: colors.background }]}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                  {item.titulo}
                </Text>
                {!!item.lotes && (
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.secondaryText, fontSize: 13 }}
                  >
                    Lotes: {item.lotes}
                  </Text>
                )}
              </View>
              <Pilula
                texto={String(item.total)}
                cor={{ bg: `${item.cor}24`, fg: item.cor }}
              />
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.secondaryText}
                accessible={false}
              />
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <FolhaInferior titulo="Alertas" aoFechar={fechar} altura="80%">
      <CorpoRolavel>
        {urgentes.length === 0 && revisar.length === 0 ? (
          <View style={estilos.vazioAlertas}>
            <Ionicons
              name="checkmark-circle-outline"
              size={42}
              color={paleta.boa}
              accessible={false}
            />
            <Texto>Nenhum alerta pendente</Texto>
            <Texto secundario>Todos os dormentes e lotes estão em conformidade.</Texto>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {renderGrupo('URGENTE', urgentes)}
            {renderGrupo('REVISAR', revisar)}
          </View>
        )}
      </CorpoRolavel>
    </FolhaInferior>
  );
}

function ExportarSheet({ dash, periodo, patio, aoMudarPeriodo, fechar }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const [exportandoPdf, setExportandoPdf] = useState(false);

  const resumo = dash.resumo || {};
  const condicoes = dash.condicoesMapa || {};
  const aprovacao = dash.aprovacaoLotes || {};
  const rotuloPeriodo = OPCOES_PERIODO.find(p => p.chave === periodo)?.rotulo || '7 dias';
  const escopoPatio = patio || 'Todos os pátios';
  const emitidoEm = new Date().toLocaleString('pt-BR');

  const tempoLocTexto =
    resumo.tempoLocalizacaoSegundos != null ? `${resumo.tempoLocalizacaoSegundos}s` : '—';
  const eficienciaTexto =
    resumo.eficienciaOperacional != null ? `${resumo.eficienciaOperacional}%` : '—';

  const montarTextoRelatorio = () => {
    const linhasPatio = (dash.porPatio || [])
      .map(p => `• ${p.patio}: ${p.total} dormentes`)
      .join('\n');

    return [
      'RELATÓRIO GERENCIAL DE ESTOQUE — CPTM',
      `Escopo: ${escopoPatio} | Período: ${rotuloPeriodo}`,
      `Emitido em: ${emitidoEm}`,
      '',
      'INDICADORES PRINCIPAIS',
      `• Total de dormentes: ${resumo.totalDormentes ?? 0}`,
      `• Avaliados: ${resumo.percentualAvaliados ?? 0}% (${resumo.avaliados ?? 0}/${resumo.totalDormentes ?? 0})`,
      `• Taxa de perdas: ${resumo.taxaPerdas ?? 0}% (${resumo.extraviados ?? 0} extraviados)`,
      `• Tempo médio de localização: ${tempoLocTexto}`,
      `• Eficiência operacional: ${eficienciaTexto}`,
      `• Total de lotes: ${resumo.totalLotes ?? 0}`,
      '',
      'CONDIÇÃO DOS DORMENTES',
      `• Boa: ${condicoes.Boa ?? 0}`,
      `• Atenção: ${condicoes.Atencao ?? 0}`,
      `• Ruim: ${condicoes.Ruim ?? 0}`,
      `• Não avaliada: ${condicoes.NaoAvaliada ?? 0}`,
      '',
      'APROVAÇÃO DOS LOTES',
      `• Aprovados: ${aprovacao.Aprovado ?? 0}`,
      `• Pendentes: ${aprovacao.Pendente ?? 0}`,
      `• Reprovados: ${aprovacao.Reprovado ?? 0}`,
      '',
      'DISTRIBUIÇÃO POR PÁTIO',
      linhasPatio || '• Sem registros no filtro atual',
    ].join('\n');
  };

  const montarHtmlPdf = () => {
    const linhasPatioHtml = (dash.porPatio || [])
      .map(
        p =>
          `<tr><td>${p.patio}</td><td style="text-align:right;font-weight:600">${p.total}</td></tr>`
      )
      .join('');

    const linhasLoteHtml = (dash.porLote || [])
      .map(
        l =>
          `<tr>
            <td>${l.id}</td>
            <td>${l.patio} · Setor ${l.setor}</td>
            <td>${l.condicao}</td>
            <td style="text-align:right">${l.Boa}</td>
            <td style="text-align:right">${l.Atencao}</td>
            <td style="text-align:right">${l.Ruim}</td>
            <td style="text-align:right;font-weight:600">${l.total}</td>
          </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1c1c1e; padding: 28px; }
  h1 { font-size: 20px; margin: 0 0 4px 0; color: #0a4d8c; }
  .sub { font-size: 12px; color: #636366; margin-bottom: 20px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #3a3a3c; margin: 22px 0 8px 0; border-bottom: 1px solid #e5e5ea; padding-bottom: 4px; }
  .grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .kpi { border: 1px solid #e5e5ea; border-radius: 10px; padding: 10px 14px; min-width: 140px; flex: 1; }
  .kpi-label { font-size: 11px; color: #636366; }
  .kpi-val { font-size: 20px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #e5e5ea; padding: 7px 6px; text-align: left; }
  th { background: #f2f2f7; font-weight: 600; }
</style>
</head>
<body>
  <h1>Relatório Gerencial de Estoque — CPTM</h1>
  <div class="sub">Escopo: <strong>${escopoPatio}</strong> · Período: <strong>${rotuloPeriodo}</strong> · Emitido em ${emitidoEm}</div>

  <h2>Indicadores Principais</h2>
  <div class="grid">
    <div class="kpi"><div class="kpi-label">Total de Dormentes</div><div class="kpi-val">${resumo.totalDormentes ?? 0}</div></div>
    <div class="kpi"><div class="kpi-label">Avaliados</div><div class="kpi-val">${resumo.percentualAvaliados ?? 0}%</div></div>
    <div class="kpi"><div class="kpi-label">Taxa de Perdas</div><div class="kpi-val">${resumo.taxaPerdas ?? 0}%</div></div>
    <div class="kpi"><div class="kpi-label">Tempo Localização</div><div class="kpi-val">${tempoLocTexto}</div></div>
    <div class="kpi"><div class="kpi-label">Eficiência Operacional</div><div class="kpi-val">${eficienciaTexto}</div></div>
    <div class="kpi"><div class="kpi-label">Total de Lotes</div><div class="kpi-val">${resumo.totalLotes ?? 0}</div></div>
  </div>

  <h2>Condição dos Dormentes & Aprovação dos Lotes</h2>
  <table>
    <thead><tr><th>Condição</th><th style="text-align:right">Quantidade</th><th>Status dos Lotes</th><th style="text-align:right">Quantidade</th></tr></thead>
    <tbody>
      <tr><td>Boa</td><td style="text-align:right">${condicoes.Boa ?? 0}</td><td>Aprovados</td><td style="text-align:right">${aprovacao.Aprovado ?? 0}</td></tr>
      <tr><td>Atenção</td><td style="text-align:right">${condicoes.Atencao ?? 0}</td><td>Pendentes</td><td style="text-align:right">${aprovacao.Pendente ?? 0}</td></tr>
      <tr><td>Ruim</td><td style="text-align:right">${condicoes.Ruim ?? 0}</td><td>Reprovados</td><td style="text-align:right">${aprovacao.Reprovado ?? 0}</td></tr>
      <tr><td>Não avaliada</td><td style="text-align:right">${condicoes.NaoAvaliada ?? 0}</td><td>Total</td><td style="text-align:right">${aprovacao.total ?? 0}</td></tr>
    </tbody>
  </table>

  <h2>Distribuição por Pátio</h2>
  <table>
    <thead><tr><th>Pátio</th><th style="text-align:right">Dormentes</th></tr></thead>
    <tbody>${linhasPatioHtml || '<tr><td colspan="2">Sem dados</td></tr>'}</tbody>
  </table>

  <h2>Detalhamento por Lote</h2>
  <table>
    <thead><tr><th>Lote</th><th>Local</th><th>Status</th><th style="text-align:right">Boa</th><th style="text-align:right">Atenção</th><th style="text-align:right">Ruim</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${linhasLoteHtml || '<tr><td colspan="7">Sem lotes cadastrados</td></tr>'}</tbody>
  </table>
</body>
</html>`;
  };

  const compartilharTexto = async () => {
    try {
      await Share.share({
        title: 'Relatório Gerencial CPTM',
        message: montarTextoRelatorio(),
      });
    } catch (falha) {
      Alert.alert('Erro ao compartilhar', falha.message);
    }
  };

  const baixarPdf = async () => {
    if (exportandoPdf) return;
    setExportandoPdf(true);
    try {
      let Print;
      let Sharing;
      try {
        Print = require('expo-print');
        Sharing = require('expo-sharing');
      } catch {
        Print = null;
        Sharing = null;
      }

      if (!Print?.printToFileAsync) {
        Alert.alert(
          'Módulo PDF pendente',
          'Instale expo-print e expo-sharing no projeto para gerar o arquivo PDF, ou use "Compartilhar texto" abaixo.'
        );
        return;
      }

      const { uri } = await Print.printToFileAsync({ html: montarHtmlPdf() });
      if (Sharing?.isAvailableAsync && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Salvar ou compartilhar relatório PDF',
        });
      } else {
        Alert.alert('PDF gerado', `Arquivo salvo em:\n${uri}`);
      }
    } catch (falha) {
      Alert.alert('Erro ao gerar PDF', falha.message);
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <FolhaInferior
      titulo="Exportar relatório"
      aoFechar={fechar}
      altura="88%"
      rodape={
        <View
          style={[
            estilos.rodape,
            { borderTopColor: paleta.borda, backgroundColor: colors.card, gap: 10 },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            disabled={exportandoPdf}
            onPress={baixarPdf}
            style={[estilos.botaoPrimario, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="download-outline" size={20} color="#fff" accessible={false} />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {exportandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={compartilharTexto}
            style={[estilos.botaoSecundario, { backgroundColor: colors.background }]}
          >
            <Ionicons name="share-outline" size={19} color={colors.primary} accessible={false} />
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
              Compartilhar texto
            </Text>
          </Pressable>
        </View>
      }
    >
      <CorpoRolavel>
        <View style={{ gap: 14 }}>
          <View style={estilos.abasPeriodo}>
            {OPCOES_PERIODO.map(op => {
              const ativo = periodo === op.chave;
              return (
                <Pressable
                  key={op.chave}
                  accessibilityRole="button"
                  onPress={() => aoMudarPeriodo(op.chave)}
                  style={[
                    estilos.abaItem,
                    {
                      backgroundColor: ativo ? colors.primary : colors.background,
                      borderColor: ativo ? colors.primary : paleta.borda,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: ativo ? '#fff' : colors.text,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {op.rotulo}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Secao titulo="PRÉVIA DO RELATÓRIO">
            <Cartao>
              <Linha titulo="Escopo" valor={escopoPatio} />
              <Linha titulo="Período" valor={rotuloPeriodo} />
              <Linha titulo="Dormentes" valor={String(resumo.totalDormentes ?? 0)} />
              <Linha titulo="Avaliados" valor={`${resumo.percentualAvaliados ?? 0}%`} />
              <Linha titulo="Taxa de perdas" valor={`${resumo.taxaPerdas ?? 0}%`} />
              <Linha titulo="Tempo de localização" valor={tempoLocTexto} />
              <Linha titulo="Eficiência operacional" valor={eficienciaTexto} />
              <Linha titulo="Total de lotes" valor={String(resumo.totalLotes ?? 0)} />
            </Cartao>
          </Secao>

          <Secao titulo="CONDIÇÃO DOS DORMENTES">
            <Cartao>
              <Linha titulo="Boa" valor={String(condicoes.Boa ?? 0)} />
              <Linha titulo="Atenção" valor={String(condicoes.Atencao ?? 0)} />
              <Linha titulo="Ruim" valor={String(condicoes.Ruim ?? 0)} />
              <Linha titulo="Não avaliada" valor={String(condicoes.NaoAvaliada ?? 0)} />
            </Cartao>
          </Secao>
        </View>
      </CorpoRolavel>
    </FolhaInferior>
  );
}

function PersonalizarSheet({ layout, aoMudar, fechar }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const ultimo = layout.ordem.length - 1;

  const mover = (id, passo) => {
    const i = layout.ordem.indexOf(id);
    const j = i + passo;
    if (j < 0 || j > ultimo) return;
    const ordem = [...layout.ordem];
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
    aoMudar({ ...layout, ordem });
  };

  const alternar = id =>
    aoMudar({
      ...layout,
      ocultos: layout.ocultos.includes(id)
        ? layout.ocultos.filter(x => x !== id)
        : [...layout.ocultos, id],
    });

  return (
    <FolhaInferior
      titulo="Personalizar widgets"
      aoFechar={fechar}
      altura="86%"
      rodape={
        <View
          style={[estilos.rodape, { borderTopColor: paleta.borda, backgroundColor: colors.card }]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => aoMudar({ ordem: ORDEM_PADRAO, ocultos: OCULTOS_PADRAO })}
            style={[estilos.botaoSecundario, { backgroundColor: colors.background }]}
          >
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>
              Restaurar padrão
            </Text>
          </Pressable>
        </View>
      }
    >
      <CorpoRolavel>
        <View style={{ gap: 8 }}>
          {layout.ordem.map((id, i) => {
            const ligado = !layout.ocultos.includes(id);
            return (
              <View
                key={id}
                style={[
                  estilos.widgetLinha,
                  { backgroundColor: colors.background, opacity: ligado ? 1 : 0.6 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                    {nomeWidget(id)}
                  </Text>
                  <Text style={{ color: colors.secondaryText, fontSize: 13 }}>
                    {tipoWidget(id)}
                  </Text>
                </View>
                <SetaOrdem
                  titulo={`Mover ${nomeWidget(id)} para cima`}
                  icone="chevron-up"
                  desativado={i === 0}
                  onPress={() => mover(id, -1)}
                />
                <SetaOrdem
                  titulo={`Mover ${nomeWidget(id)} para baixo`}
                  icone="chevron-down"
                  desativado={i === ultimo}
                  onPress={() => mover(id, 1)}
                />
                <Switch
                  accessibilityLabel={nomeWidget(id)}
                  value={ligado}
                  onValueChange={() => alternar(id)}
                  trackColor={{ false: paleta.trilho, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            );
          })}
        </View>
      </CorpoRolavel>
    </FolhaInferior>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  bloqueado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  cabecalhoAcoes: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sinoWrapper: { position: 'relative' },
  badgeSino: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSinoTexto: { color: '#fff', fontSize: 10, fontWeight: '700' },
  filtros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '55%',
  },
  chipTexto: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  lista: { padding: 16, paddingBottom: 32 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  meia: { flexGrow: 1, flexBasis: '45%' },
  cheia: { width: '100%' },
  setaOrdem: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  widgetLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingLeft: 16,
    paddingRight: 10,
    borderRadius: 16,
  },
  grupoAlerta: { gap: 8 },
  tituloGrupoAlerta: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, paddingHorizontal: 4 },
  cardAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  vazioAlertas: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 36 },
  abasPeriodo: { flexDirection: 'row', gap: 8 },
  abaItem: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rodape: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  botaoPrimario: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSecundario: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});