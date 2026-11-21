import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { corDaCondicao, formatarSegundos, nomesCondicao, usePaleta } from './cores';
import { PERIODOS, topLotesPorCondicao } from '../../models/dashboard.mjs';
import { Colunas, Delta, Kpi, LinhaTrilho, Rosca, Widget } from './Pecas';

export const CATALOGO = [
  { id: 'cond', nome: 'Condição dos dormentes', largura: 'cheia' },
  { id: 'aval', nome: 'Avaliados', largura: 'meia' },
  { id: 'perd', nome: 'Taxa de perdas', largura: 'meia' },
  { id: 'loc', nome: 'Tempo de localização', largura: 'meia' },
  { id: 'efi', nome: 'Eficiência operacional', largura: 'meia' },
  { id: 'lotesk', nome: 'Lotes', largura: 'meia' },
  { id: 'mov', nome: 'Movimentações', largura: 'cheia' },
  { id: 'lote', nome: 'Condição por lote', largura: 'cheia' },
  { id: 'apro', nome: 'Aprovação dos lotes', largura: 'cheia' },
  { id: 'local', nome: 'Dormentes por local', largura: 'cheia' },
  { id: 'esp', nome: 'Dormentes por espécie', largura: 'cheia' },
  { id: 'idade', nome: 'Tempo sem atualização', largura: 'cheia' },
  { id: 'recentes', nome: 'Últimas movimentações', largura: 'cheia' },
];
export const ORDEM_PADRAO = CATALOGO.map(w => w.id);
export const OCULTOS_PADRAO = ['lotesk', 'idade', 'recentes'];

// Mantém só ids conhecidos e acrescenta widgets novos ao fim (preferências antigas continuam válidas).
export function normalizarLayout(salvo) {
  const ordem = (salvo?.ordem ?? []).filter(id => ORDEM_PADRAO.includes(id));
  ORDEM_PADRAO.forEach(id => { if (!ordem.includes(id)) ordem.push(id); });
  const ocultos = salvo ? (salvo.ocultos ?? []).filter(id => ORDEM_PADRAO.includes(id)) : OCULTOS_PADRAO;
  return { ordem, ocultos };
}

function CondicaoWidget({ dash, ir }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const partes = dash.condicoes.map((c, i) => ({ ...c, cor: paleta.condicao[i] }));
  const filtros = ['nao', 'boa', 'atencao', 'ruim'];
  return (
    <Widget titulo="Condição dos dormentes">
      <View style={estilos.roscaLinha}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver todos os dormentes" onPress={() => ir({ cond: 'todas' })}>
          <Rosca partes={partes}>
            <Text style={[estilos.roscaTotal, { color: colors.text }]}>{dash.total}</Text>
            <Text style={[estilos.sub, { color: colors.secondaryText }]}>dormentes</Text>
          </Rosca>
        </Pressable>
        <View style={estilos.legenda}>
          {partes.map((p, i) => (
            <Pressable key={p.nome} accessibilityRole="button" onPress={() => ir({ cond: filtros[i] })} style={estilos.legendaItem}>
              <View style={[estilos.ponto, { backgroundColor: p.cor }]} />
              <Text style={[estilos.legendaNome, { color: colors.text }]}>{p.nome}</Text>
              <Text style={[estilos.legendaNumero, { color: colors.text }]}>{p.n}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} accessible={false} />
            </Pressable>
          ))}
        </View>
      </View>
    </Widget>
  );
}

function MovimentacoesWidget({ dash }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const { serie, total, variacao } = dash.movimentacoes;
  const maximo = Math.max(1, ...serie.map(s => s.total));
  const ordem = ['Entrada', 'Saída', 'Interna'];
  return (
    <Widget titulo="Movimentações">
      <View style={estilos.movCabecalho}>
        <Text style={[estilos.valorGrande, { color: colors.text }]}>{total}</Text>
        <Text style={[estilos.movRotulo, { color: colors.secondaryText }]}>{total === 1 ? 'movimentação' : 'movimentações'} {PERIODOS[dash.periodo].texto}</Text>
        <Delta valor={variacao} boaQuandoSobe={null} />
      </View>
      <View style={estilos.legendaHorizontal}>
        {ordem.map((nome, i) => (
          <View key={nome} style={estilos.legendaMov}>
            <View style={[estilos.quadrado, { backgroundColor: paleta.movimento[i] }]} />
            <Text style={[estilos.sub, { color: colors.secondaryText }]}>{nome}</Text>
          </View>
        ))}
      </View>
      <View accessible accessibilityLabel={`Movimentações por período: ${serie.map(s => `${s.rotulo} ${s.total}`).join(', ')}`}>
        <View style={[estilos.colunasMov, { borderBottomColor: paleta.borda }]}>
          {serie.map(s => (
            <View key={s.rotulo + s.ini} style={estilos.colunaMov}>
              <Text style={[estilos.colunaNumero, { color: colors.text }]}>{s.total}</Text>
              <View style={{ width: 24 }}>
                {[...ordem].reverse().map((tipo, k) => {
                  const idx = ordem.indexOf(tipo);
                  const h = s[tipo] ? Math.max(3, Math.round((s[tipo] / maximo) * 92)) : 0;
                  return h ? <View key={tipo} style={{ height: h, backgroundColor: paleta.movimento[idx], marginTop: k ? 2 : 0, borderTopLeftRadius: k === 0 ? 4 : 0, borderTopRightRadius: k === 0 ? 4 : 0 }} /> : null;
                })}
              </View>
            </View>
          ))}
        </View>
        <View style={estilos.rotulosMov}>
          {serie.map(s => <Text key={s.rotulo + s.ini} numberOfLines={1} style={[estilos.rotuloMov, { color: colors.secondaryText }]}>{s.rotulo}</Text>)}
        </View>
      </View>
    </Widget>
  );
}

const rotuloCurto = { 'Não avaliada': 'Não aval.' };
const rotuloResumo = { 'Não avaliada': 'não avaliados', Boa: 'em condição Boa', 'Atenção': 'em condição Atenção', Ruim: 'em condição Ruim' };

function CondicaoPorLoteWidget({ dash, ir }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const [cond, setCond] = useState('Ruim');
  const { linhas, restantes } = topLotesPorCondicao(dash.condicaoPorLote, cond, 5);
  const filtro = { 'Não avaliada': 'nao', Boa: 'boa', 'Atenção': 'atencao', Ruim: 'ruim' }[cond];
  const totalCond = dash.condicaoPorLote.reduce((soma, l) => soma + (l[cond] ?? 0), 0);
  const lotesCond = dash.condicaoPorLote.filter(l => (l[cond] ?? 0) > 0).length;
  const corBarra = corDaCondicao(paleta, cond);
  const statusCor = { Pendente: paleta.pendente.fg, Aprovado: paleta.aprovado.fg, Reprovado: paleta.reprovado.fg };
  return (
    <Widget titulo="Condição por lote">
      <View accessibilityRole="tablist" style={[estilos.segmentos, { backgroundColor: paleta.trilho }]}>
        {nomesCondicao.map(nome => {
          const sel = nome === cond;
          return (
            <Pressable key={nome} accessibilityRole="tab" accessibilityLabel={nome} accessibilityState={{ selected: sel }} onPress={() => setCond(nome)}
              style={[estilos.segmento, sel && [estilos.segmentoSel, { backgroundColor: colors.card }]]}>
              <View style={[estilos.quadrado, { backgroundColor: corDaCondicao(paleta, nome) }]} />
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: sel ? colors.text : colors.secondaryText }}>{rotuloCurto[nome] ?? nome}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={estilos.movCabecalho}>
        <Text style={[estilos.valorGrande, { color: colors.text }]}>{totalCond}</Text>
        <Text style={[estilos.movRotulo, { color: colors.secondaryText }]}>
          {totalCond === 1 ? 'dormente' : 'dormentes'} {rotuloResumo[cond]} · {lotesCond} {lotesCond === 1 ? 'lote' : 'lotes'}
        </Text>
      </View>
      {linhas.length === 0 && <Text style={[estilos.sub, { color: colors.secondaryText }]}>Nenhum lote com dormentes.</Text>}
      <View style={{ gap: 14 }}>
        {linhas.map(l => (
          <Pressable key={l.chave} accessibilityRole="button" accessibilityLabel={`Lote ${l.id}, ${l.aprovacao}, ${l[cond]} de ${l.total}`}
            onPress={() => ir({ cond: filtro, lote: l.chave })} style={estilos.linhaLote}>
            <View style={estilos.loteNome}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Lote {l.id}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: statusCor[l.aprovacao] ?? colors.secondaryText }}>{l.aprovacao}</Text>
            </View>
            <View style={[estilos.trilhoLote, { backgroundColor: paleta.trilho }]}>
              {l[cond] > 0 && <View style={{ height: 12, borderRadius: 6, backgroundColor: corBarra, width: `${Math.max(6, Math.round((l[cond] / l.total) * 100))}%` }} />}
            </View>
            <Text style={estilos.loteNumero}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{l[cond]}</Text>
              <Text style={{ fontSize: 12, color: colors.secondaryText }}> / {l.total}</Text>
            </Text>
          </Pressable>
        ))}
      </View>
      {restantes > 0 && (
        <Pressable accessibilityRole="button" onPress={() => ir({ cond: filtro })} style={[estilos.verTodos, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>Ver todos os {linhas.length + restantes} lotes</Text>
        </Pressable>
      )}
    </Widget>
  );
}

function RecentesWidget({ dash }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const icone = { Entrada: 'arrow-up', 'Saída': 'arrow-down', Interna: 'arrow-forward' };
  const idx = { Entrada: 0, 'Saída': 1, Interna: 2 };
  if (!dash.recentes.length) return <Widget titulo="Últimas movimentações"><Text style={{ color: colors.secondaryText }}>Nenhuma movimentação registrada.</Text></Widget>;
  return (
    <Widget titulo="Últimas movimentações">
      {dash.recentes.map(m => (
        <View key={m.id} style={estilos.recente}>
          <View style={[estilos.iconeMov, { backgroundColor: paleta.movimento[idx[m.tipo]] }]}>
            <Ionicons name={icone[m.tipo]} size={16} color="#fff" accessible={false} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{m.nome} · {m.tipo}</Text>
            <Text numberOfLines={1} style={[estilos.sub, { color: colors.secondaryText }]}>{m.rota}</Text>
          </View>
          <Text style={[estilos.sub, { color: colors.secondaryText }]}>{quando(m.dataHora)}</Text>
        </View>
      ))}
    </Widget>
  );
}

export function quando(iso, agora = new Date()) {
  const min = Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  const dias = Math.floor(min / 1440);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}

// Renderiza um widget pelo id. `ir` abre a lista de dormentes já filtrada.
export function Renderizar({ id, dash, ir }) {
  const { colors } = useTheme();
  switch (id) {
    case 'cond': return <CondicaoWidget dash={dash} ir={ir} />;
    case 'aval': return <Kpi titulo="Avaliados" valor={`${dash.avaliados.pct}%`} variacao={dash.avaliados.variacao} boaQuandoSobe
      sub={`${dash.avaliados.n} de ${dash.avaliados.total} dormentes`} aoPressionar={() => ir({ cond: 'nao' })} />;
    case 'perd': return <Kpi titulo="Taxa de perdas" valor={`${String(dash.perdas.taxa).replace('.', ',')}%`} variacao={dash.perdas.variacao}
      boaQuandoSobe={false} sub={`${dash.perdas.n} de ${dash.perdas.total} dormentes`} aoPressionar={() => ir({ cond: 'extraviados' })} />;
    case 'loc': return <Kpi titulo="Tempo de localização" valor={formatarSegundos(dash.localizacao.segundos)}
      variacao={dash.localizacao.variacao} boaQuandoSobe={false} sub="média por busca" />;
    case 'efi': return <Kpi titulo="Eficiência operacional" valor={dash.eficiencia.pct == null ? '—' : `${dash.eficiencia.pct}%`}
      variacao={dash.eficiencia.variacao} boaQuandoSobe sub="operações no prazo" />;
    case 'lotesk': return <Kpi titulo="Lotes" valor={String(dash.lotes.total)} sub={`${dash.lotes.pendentes} pendentes de aprovação`} />;
    case 'mov': return <MovimentacoesWidget dash={dash} />;
    case 'lote': return <CondicaoPorLoteWidget dash={dash} ir={ir} />;
    case 'apro': {
      const max = Math.max(1, ...dash.aprovacao.map(a => a.n));
      return <Widget titulo="Aprovação dos lotes">{dash.aprovacao.map(a => <LinhaTrilho key={a.nome} nome={a.nome} n={a.n} maximo={max} />)}</Widget>;
    }
    case 'local': return (
      <Widget titulo="Dormentes por local">
        {dash.locais.length ? <Colunas itens={dash.locais.map(l => ({ nome: `${l.patio} · ${l.setor}`, rotulo: `${l.patio}\nSetor ${l.setor}`, n: l.n }))} /> : <Text style={{ color: colors.secondaryText }}>Sem dormentes em estoque.</Text>}
      </Widget>
    );
    case 'esp': {
      const max = Math.max(1, ...dash.especies.map(e => e.n));
      return <Widget titulo="Dormentes por espécie">{dash.especies.length ? dash.especies.map(e => <LinhaTrilho key={e.nome} nome={e.nome} n={e.n} maximo={max} />) : <Text style={{ color: colors.secondaryText }}>Sem dormentes em estoque.</Text>}</Widget>;
    }
    case 'idade': return <Widget titulo="Tempo sem atualização"><Colunas itens={dash.idade} aoPressionar={item => ir(item.filtro)} /></Widget>;
    case 'recentes': return <RecentesWidget dash={dash} />;
    default: return null;
  }
}

const estilos = StyleSheet.create({
  roscaLinha: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  roscaTotal: { fontSize: 30, fontWeight: '700' },
  sub: { fontSize: 12 },
  legenda: { flex: 1, minWidth: 140, gap: 4 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
  legendaNome: { flex: 1, fontSize: 14 },
  legendaNumero: { fontSize: 14, fontWeight: '700' },
  legendaHorizontal: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  legendaMov: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quadrado: { width: 8, height: 8, borderRadius: 2 },
  movCabecalho: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, rowGap: 6 },
  movRotulo: { fontSize: 14 },
  segmentos: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 10 },
  segmento: { flex: 1, minWidth: 0, minHeight: 32, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  segmentoSel: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  linhaLote: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  loteNome: { width: 74, gap: 1 },
  trilhoLote: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden', justifyContent: 'center' },
  loteNumero: { width: 54, textAlign: 'right' },
  verTodos: { minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  kpiLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valorGrande: { fontSize: 30, fontWeight: '700' },
  colunasMov: { flexDirection: 'row', alignItems: 'flex-end', height: 132, borderBottomWidth: StyleSheet.hairlineWidth },
  colunaMov: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%' },
  colunaNumero: { fontSize: 13, fontWeight: '600' },
  rotulosMov: { flexDirection: 'row', paddingTop: 6 },
  rotuloMov: { flex: 1, textAlign: 'center', fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  recente: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  iconeMov: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
