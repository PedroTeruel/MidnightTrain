import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePaleta } from './cores';

// Cabeçalho de seção + cartão, igual aos demais widgets.
export function Widget({ titulo, children, aoPressionar }) {
  const { colors } = useTheme();
  return (
    <View style={estilos.widget}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: colors.secondaryText }]}>{titulo}</Text>
      <Pressable disabled={!aoPressionar} onPress={aoPressionar} accessibilityRole={aoPressionar ? 'button' : undefined}
        style={[estilos.cartao, { backgroundColor: colors.card }]}>{children}</Pressable>
    </View>
  );
}

// Variação ▲▼ padronizada: ícone + percentual em pílula, sem texto auxiliar.
// boaQuandoSobe: true = subir é bom, false = subir é ruim, null = neutro.
export function Delta({ valor, boaQuandoSobe }) {
  const paleta = usePaleta();
  if (valor == null) return null;
  const sobe = valor >= 0;
  const cor = boaQuandoSobe == null || valor === 0 ? paleta.neutro : sobe === boaQuandoSobe ? paleta.bom : paleta.ruim;
  return (
    <View accessible accessibilityLabel={`${sobe ? 'Aumento' : 'Queda'} de ${Math.abs(valor)}% em relação ao período anterior`}
      style={[estilos.delta, { backgroundColor: cor.bg }]}>
      <Ionicons name={sobe ? 'caret-up' : 'caret-down'} size={10} color={cor.fg} accessible={false} />
      <Text style={[estilos.deltaTexto, { color: cor.fg }]}>{Math.abs(valor)}%</Text>
    </View>
  );
}

export function Kpi({ titulo, valor, variacao, boaQuandoSobe, sub, aoPressionar }) {
  const { colors } = useTheme();
  return (
    <Pressable disabled={!aoPressionar} onPress={aoPressionar} accessibilityRole={aoPressionar ? 'button' : undefined}
      style={[estilos.kpi, { backgroundColor: colors.card }]}>
      <Text style={[estilos.kpiTitulo, { color: colors.secondaryText }]}>{titulo}</Text>
      <View style={estilos.kpiLinha}>
        <Text style={[estilos.kpiValor, { color: colors.text }]}>{valor}</Text>
        <Delta valor={variacao} boaQuandoSobe={boaQuandoSobe} />
      </View>
      <Text style={[estilos.sub, { color: colors.secondaryText }]}>{sub}</Text>
    </Pressable>
  );
}

// Linha com trilho cinza e preenchimento azul: padrão das listas comparativas.
export function LinhaTrilho({ nome, n, maximo, rotuloNumero, aoPressionar }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  return (
    <Pressable disabled={!aoPressionar} onPress={aoPressionar} accessibilityRole={aoPressionar ? 'button' : undefined}
      style={estilos.linhaTrilho}>
      <Text numberOfLines={1} style={[estilos.linhaNome, { color: colors.text }]}>{nome}</Text>
      <View style={[estilos.trilho, { backgroundColor: paleta.trilho }]}>
        <View style={[estilos.preenchimento, { backgroundColor: colors.primary, width: `${maximo ? Math.round((n / maximo) * 100) : 0}%` }]} />
      </View>
      <Text style={[estilos.linhaNumero, { color: colors.text }]}>{rotuloNumero ?? n}</Text>
    </Pressable>
  );
}

// Colunas verticais de uma cor só; cada coluna pode ser tocável.
export function Colunas({ itens, aoPressionar, altura = 92 }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  const maximo = Math.max(1, ...itens.map(i => i.n));
  return (
    <View>
      <View style={[estilos.colunas, { borderBottomColor: paleta.borda, height: altura + 40 }]}>
        {itens.map(item => (
          <Pressable key={item.nome} disabled={!aoPressionar} onPress={() => aoPressionar?.(item)}
            accessibilityRole={aoPressionar ? 'button' : undefined} accessibilityLabel={`${item.nome}: ${item.n}`}
            style={estilos.coluna}>
            <Text style={[estilos.colunaNumero, { color: colors.text }]}>{item.n}</Text>
            <View style={{ width: 40, height: Math.max(3, Math.round((item.n / maximo) * altura)), backgroundColor: colors.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          </Pressable>
        ))}
      </View>
      <View style={estilos.rotulos}>
        {itens.map(item => (
          <Text key={item.nome} style={[estilos.rotulo, { color: colors.secondaryText }]}>{item.rotulo ?? item.nome}</Text>
        ))}
      </View>
    </View>
  );
}

// Rosca feita só com Views (sem módulo nativo extra): anel de pequenos segmentos coloridos.
export function Rosca({ partes, tamanho = 150, espessura = 18, children }) {
  const total = partes.reduce((a, p) => a + p.n, 0);
  const passos = 90, raio = tamanho / 2 - espessura / 2;
  const largura = Math.ceil((2 * Math.PI * raio) / passos) + 1;
  const marcas = [];
  let acumulado = 0, indice = 0;
  for (let i = 0; i < passos; i++) {
    const meio = ((i + 0.5) / passos) * (total || 1);
    while (indice < partes.length - 1 && meio >= acumulado + partes[indice].n) { acumulado += partes[indice].n; indice++; }
    const cor = total ? partes[indice].cor : '#c3c7d0';
    marcas.push(
      <View key={i} style={{
        position: 'absolute', left: tamanho / 2 - largura / 2, top: tamanho / 2 - espessura / 2,
        width: largura, height: espessura, backgroundColor: cor,
        transform: [{ rotate: `${(i * 360) / passos}deg` }, { translateY: -raio }],
      }} />,
    );
  }
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityRole="image"
      accessibilityLabel={partes.map(p => `${p.nome} ${p.n}`).join(', ')}>
      {marcas}
      <View style={estilos.centroRosca}>{children}</View>
    </View>
  );
}

// Menu flutuante ancorado (popover): fica sobre a própria tela, sem abrir outra página.
// `ancora` posiciona o cartão: { top, right } ou { top, left }.
export function Popover({ aoFechar, ancora, largura = 260, children }) {
  const { colors } = useTheme();
  const paleta = usePaleta();
  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={aoFechar}>
      <Pressable accessibilityLabel="Fechar menu" style={StyleSheet.absoluteFill} onPress={aoFechar} />
      <View accessibilityViewIsModal style={[estilos.popover, { backgroundColor: colors.card, borderColor: paleta.borda, width: largura }, ancora]}>
        {children}
      </View>
    </Modal>
  );
}

export function ItemPopover({ icone, texto, marcado, aoPressionar }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="menuitem" accessibilityState={{ selected: !!marcado }} onPress={aoPressionar}
      style={({ pressed }) => [estilos.itemPopover, pressed && { backgroundColor: colors.background }]}>
      {icone && <Ionicons name={icone} size={22} color={colors.primary} accessible={false} />}
      <Text style={[estilos.itemPopoverTexto, { color: colors.text }]}>{texto}</Text>
      {marcado && <Ionicons name="checkmark" size={22} color={colors.primary} accessible={false} />}
    </Pressable>
  );
}

export function Pilula({ texto, cor }) {
  return <View style={[estilos.pilula, { backgroundColor: cor.bg }]}><Text style={[estilos.pilulaTexto, { color: cor.fg }]}>{texto}</Text></View>;
}

const estilos = StyleSheet.create({
  widget: { gap: 8 },
  titulo: { fontSize: 13, fontWeight: '600', paddingHorizontal: 4, textTransform: 'uppercase' },
  cartao: { borderRadius: 20, padding: 16, gap: 14 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingLeft: 6, paddingRight: 8, borderRadius: 10 },
  deltaTexto: { fontSize: 12, fontWeight: '600' },
  kpi: { flexGrow: 1, flexBasis: '47%', borderRadius: 20, padding: 14, gap: 8 },
  kpiTitulo: { fontSize: 13 },
  kpiLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  kpiValor: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 12 },
  linhaTrilho: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  linhaNome: { width: 104, fontSize: 13 },
  trilho: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  preenchimento: { height: 12, borderRadius: 6 },
  linhaNumero: { minWidth: 34, textAlign: 'right', fontSize: 14, fontWeight: '700' },
  colunas: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth },
  coluna: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  colunaNumero: { fontSize: 13, fontWeight: '600' },
  rotulos: { flexDirection: 'row', paddingTop: 6 },
  rotulo: { flex: 1, textAlign: 'center', fontSize: 12 },
  centroRosca: { alignItems: 'center', justifyContent: 'center' },
  popover: { position: 'absolute', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 6, elevation: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  itemPopover: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48, paddingHorizontal: 18 },
  itemPopoverTexto: { flex: 1, fontSize: 16 },
  pilula: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  pilulaTexto: { fontSize: 12, fontWeight: '600' },
});
