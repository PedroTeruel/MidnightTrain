import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { topLotesPorCondicao } from '../../models/dashboard.mjs';
import { corDaCondicao, formatarSegundos, nomesCondicao, usePaleta } from './cores';
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
  const { serie, tipos, total, variacao } = dash.movimentacoes;
  const maximo = Math.max(1, ...serie.map(s => s.total));
  const ordem = ['Entrada', 'Saída', 'Interna'];
  return (
    <Widget titulo="Movimentações">
      <View style={estilos.kpiLinha}>
        <Text style={[estilos.valorGrande, { color: colors.text }]}>{total}</Text>
        <Delta valor={variacao} boaQuandoSobe={null} />
      </View>
      <View accessible accessibilityLabel={`Movimentações por período: ${serie.map(s => `${s.rotulo} ${s.total}`).join(', ')}`}>
        <View style={[estilos.colunasMov, { borderBottomColor: paleta.borda }]}>
          {serie.map(s => (
            <View key={s.rotulo + s.ini} style={estilos.colunaMov}>
              <Text style={[estilos.colunaNumero, { color: colors.text }]}>{s.total}</Text>
              <View style={{ width: 28 }}>
                {[...ordem].reverse().map((tipo, k) => {
                  const idx = ordem.indexOf(tipo);
                  const h = s[tipo] ? Math.max(3, Math.round((s[tipo] / maximo) * 92)) : 0;
                  return h ? <View key={tipo} style={{ height: h, backgroundColor: paleta.movimento[idx], marginTop: k ? 1 : 0, borderTopLeftRadius: k === 0 ? 4 : 0, borderTopRightRadius: k === 0 ? 4 : 0 }} /> : null;
                })}
              </View>
            </View>
          ))}
        </View>
        <View style={estilos.rotulosMov}>
          {serie.map(s => <Text key={s.rotulo + s.ini} style={[estilos.rotuloMov, { color: colors.secondaryText }]}>{s.rotulo}</Text>)}
        </View>
      </View>
      <View style={estilos.legendaHorizontal}>
        {tipos.map((t, i) => (
          <View key={t.nome} style={estilos.legendaItem}>
            <View style={[estilos.ponto, { backgroundColor: paleta.movimento[i] }]} />
            <Text style={[estilos.sub, { color: colors.text }]}>{t.nome} {t.n}</Text>
          </View>
        ))}
      </View>
    </Widget>
  );
}

function CondicaoPorLoteWidget({ dash, ir }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const [cond, setCond] = useState('Ruim');
  const { linhas, restantes } = topLotesPorCondicao(dash.condicaoPorLote, cond, 5);
  const filtro = { 'Não avaliada': 'nao', Boa: 'boa', 'Atenção': 'atencao', Ruim: 'ruim' }[cond];
  return (
    <Widget titulo="Condição por lote">
      <View style={estilos.chips}>
        {nomesCondicao.map(nome => {
          const sel = nome === cond;
          return (
            <Pressable key={nome} accessibilityRole="button" accessibilityState={{ selected: sel }} onPress={() => setCond(nome)}
              style={[estilos.chip, { backgroundColor: sel ? colors.primary : colors.background, borderColor: paleta.borda }]}>
              <View style={[estilos.ponto, { backgroundColor: sel ? '#fff' : corDaCondicao(paleta, nome) }]} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#fff' : colors.text }}>{nome}</Text>
            </Pressable>
          );
        })}
      </View>
      {linhas.length === 0 && <Text style={[estilos.sub, { color: colors.secondaryText }]}>Nenhum lote com dormentes.</Text>}
      {linhas.map(l => (
        <LinhaTrilho key={l.chave} nome={`Lote ${l.id}`} n={l[cond]} maximo={l.total}
          rotuloNumero={`${l[cond]}/${l.total}`} aoPressionar={() => ir({ cond: filtro, lote: l.chave })} />
      ))}
      {restantes > 0 && (
        <Pressable accessibilityRole="button" onPress={() => ir({ cond: filtro })}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Ver todos os {linhas.length + restantes} lotes</Text>
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
  legendaHorizontal: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  kpiLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valorGrande: { fontSize: 34, fontWeight: '700' },
  colunasMov: { flexDirection: 'row', alignItems: 'flex-end', height: 132, borderBottomWidth: StyleSheet.hairlineWidth },
  colunaMov: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%' },
  colunaNumero: { fontSize: 12, fontWeight: '600' },
  rotulosMov: { flexDirection: 'row', paddingTop: 6 },
  rotuloMov: { flex: 1, textAlign: 'center', fontSize: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  recente: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  iconeMov: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
