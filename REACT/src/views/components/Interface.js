import React, { useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

export const azul = '#0052C2';

export function Acao({ titulo, icone, onPress, disabled, destaque = false }) {
  const { colors } = useTheme();
  const cor = destaque ? '#fff' : colors.primary;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={titulo} disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.acao,
        destaque && { backgroundColor: azul, borderRadius: 32, paddingHorizontal: 20 },
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      {icone && <Ionicons name={icone} size={20} color={cor} accessible={false} />}
      <Text style={[styles.acaoTexto, { color: cor }]}>{titulo}</Text>
    </Pressable>
  );
}

export function IconeBotao({ titulo, icone, onPress, valor, circular }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={titulo}
      accessibilityValue={valor ? { text: valor } : undefined} onPress={onPress}
      style={[styles.iconeBotao, circular && { backgroundColor: colors.card, borderRadius: 26 }]}
    >
      <Ionicons name={icone} size={23} color={colors.primary} accessible={false} />
    </Pressable>
  );
}

export function Titulo({ children }) {
  const { colors } = useTheme();
  return <Text accessibilityRole="header" style={[styles.titulo, { color: colors.text }]}>{children}</Text>;
}

export function Texto({ children, secundario = false }) {
  const { colors } = useTheme();
  return <Text style={[styles.texto, { color: secundario ? colors.secondaryText : colors.text }]}>{children}</Text>;
}

export function Secao({ titulo, children }) {
  const { colors } = useTheme();
  return (
    <View style={styles.secao}>
      {titulo && <Text accessibilityRole="header" style={[styles.cabecalho, { color: colors.secondaryText }]}>{titulo}</Text>}
      {children}
    </View>
  );
}

export function Cartao({ children }) {
  const { colors } = useTheme();
  return <View style={[styles.cartao, { backgroundColor: colors.card }]}>{children}</View>;
}

export function Linha({ titulo, valor, onPress }) {
  const { colors } = useTheme();
  const conteudo = (
    <>
      <Text style={[styles.rotulo, { color: colors.text }]}>{titulo}</Text>
      <Text style={[styles.valor, { color: colors.secondaryText }]}>{valor}</Text>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} accessible={false} />}
    </>
  );
  const estilo = [styles.linha, { borderBottomColor: colors.border }];
  if (onPress) {
    return <Pressable accessibilityRole="button" style={estilo} onPress={onPress}>{conteudo}</Pressable>;
  }
  return <View style={estilo}>{conteudo}</View>;
}

export function Campo({ titulo, valor, onChangeText, ...opcoes }) {
  const { colors } = useTheme();
  return (
    <View style={styles.campo}>
      <Text style={{ color: colors.secondaryText, fontSize: 14 }}>{titulo}</Text>
      <TextInput
        accessibilityLabel={titulo} placeholder={titulo} placeholderTextColor={colors.secondaryText}
        style={[styles.entrada, { color: colors.text, backgroundColor: colors.background }]}
        value={valor} onChangeText={onChangeText} {...opcoes}
      />
    </View>
  );
}

export function MenuOpcoes({ titulo, opcoes, selecionado, aoEscolher, aoFechar }) {
  return (
    <Formulario titulo={titulo} fechar={aoFechar}>
      <Cartao>
        {opcoes.map(opcao => (
          <Linha key={opcao} titulo={opcao} valor={opcao === selecionado ? 'Selecionado' : ''}
            onPress={() => aoEscolher(opcao)} />
        ))}
      </Cartao>
    </Formulario>
  );
}

export function Escolha({ titulo, opcoes, valor, aoEscolher }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Linha titulo={titulo} valor={valor} onPress={() => setAberto(true)} />
      {aberto && (
        <MenuOpcoes titulo={titulo} opcoes={opcoes} selecionado={valor}
          aoFechar={() => setAberto(false)}
          aoEscolher={opcao => { aoEscolher(opcao); setAberto(false); }} />
      )}
    </>
  );
}

export function Formulario({ titulo, fechar, salvar, ocupado, acao = 'Salvar', itens, renderItem, children }) {
  const { colors } = useTheme();
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={fechar}>
      <SafeAreaView style={[styles.tela, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <IconeBotao titulo="Cancelar" icone="close" onPress={fechar} />
            <Text accessibilityRole="header" style={[styles.toolbarTitulo, { color: colors.text }]}>{titulo}</Text>
            {salvar && <Acao titulo={acao} onPress={salvar} disabled={ocupado} />}
          </View>
          {itens ? (
            <FlatList
              data={itens} keyExtractor={item => String(item)} renderItem={renderItem}
              ListHeaderComponent={<View style={styles.secao}>{children}</View>}
              keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
              contentContainerStyle={styles.conteudo}
            />
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
              contentContainerStyle={styles.conteudo}>
              {children}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { padding: 16, paddingBottom: 28, gap: 16 },
  titulo: { fontSize: 32, fontWeight: '700' },
  texto: { fontSize: 16 },
  acao: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 8, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  acaoTexto: { fontSize: 16, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  iconeBotao: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secao: { gap: 8 },
  cabecalho: { fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
  cartao: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  linha: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, minHeight: 48, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rotulo: { fontSize: 16, fontWeight: '600', flexGrow: 1 },
  valor: { fontSize: 16, flexShrink: 1 },
  campo: { gap: 5, paddingVertical: 7 },
  entrada: { minHeight: 44, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 16 },
  toolbar: { minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  toolbarTitulo: { flex: 1, fontSize: 17, fontWeight: '600', paddingVertical: 8 },
});
