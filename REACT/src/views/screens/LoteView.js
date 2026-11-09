import React, { useLayoutEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Acao, Cartao, Linha, Secao, Texto, Titulo, styles } from '../components/Interface';
import DormenteMenu from '../components/DormenteMenu';
import LoteEditSheet from '../components/LoteEditSheet';

export default function LoteView({ navigation, lote, onSalvarLote }) {
  const [editando, setEditando] = useState(false);
  const { colors } = useTheme();
  const titulo = lote ? `Lote ${lote.id}` : 'Lote não encontrado';
  useLayoutEffect(() => { navigation.setOptions({ title: titulo }); }, [navigation, titulo]);

  if (!lote) return <View style={styles.conteudo}><Titulo>{titulo}</Titulo></View>;
  const dormentes = [...lote.dormentes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));

  return (
    <>
      <FlatList
        contentContainerStyle={styles.conteudo}
        data={dormentes} keyExtractor={dormente => dormente.id}
        ListHeaderComponent={
          <View style={styles.secao}>
            <Secao>
              <Ionicons name="cube" size={36} color={colors.primary} accessible={false} />
              <Titulo>{titulo}</Titulo>
              <Texto secundario>Setor {lote.setor} · {lote.dormentes.length} dormentes</Texto>
              <Acao titulo="Editar lote" icone="pencil-outline" onPress={() => setEditando(true)} />
            </Secao>
            <Secao titulo="Informações">
              <Cartao>
                <Linha titulo="Condição" valor={lote.condicao} />
                {!!lote.patio && <Linha titulo="Pátio" valor={lote.patio} />}
                <Linha titulo="Tamanho" valor={lote.tamanho} />
                <Linha titulo="Espécies" valor={lote.especies} />
                {!!lote.codigoNFC && <Linha titulo="Etiqueta NFC" valor={lote.codigoNFC} />}
                {!!lote.descricao && <Texto>{lote.descricao}</Texto>}
              </Cartao>
            </Secao>
            <Secao titulo="Dormentes" />
          </View>
        }
        renderItem={({ item }) => (
          <Cartao><DormenteMenu dormente={item}
            abrir={() => navigation.navigate('Dormente', { id: item.id, chave: lote.chave })} /></Cartao>
        )}
      />
      {editando && <LoteEditSheet lote={lote} fechar={() => setEditando(false)} onSalvar={onSalvarLote} />}
    </>
  );
}
