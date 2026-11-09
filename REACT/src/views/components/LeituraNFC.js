import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform } from 'react-native';
import { cancelarLeitura, lerEtiqueta } from '../../services/nfc';
import { Acao, Formulario, Texto } from './Interface';

export default function LeituraNFC({ titulo, onCodigo, destaque }) {
  const [lendo, setLendo] = useState(false);
  const sessao = useRef(null);

  async function ler() {
    if (sessao.current) return;
    const controlador = new AbortController();
    sessao.current = controlador;
    setLendo(true);
    let codigo;
    let erro;
    try {
      codigo = await lerEtiqueta(controlador.signal);
    } catch (falha) {
      erro = falha;
    } finally {
      sessao.current = null;
      setLendo(false);
    }
    if (controlador.signal.aborted) return;
    if (erro) {
      Alert.alert('Não foi possível ler a etiqueta', erro.message);
    } else if (codigo) {
      onCodigo(codigo);
    }
  }

  function cancelar() {
    sessao.current?.abort();
    cancelarLeitura();
  }

  return (
    <>
      <Acao titulo={titulo} icone="radio-outline" onPress={ler} disabled={lendo} destaque={destaque} />
      {lendo && Platform.OS === 'android' && (
        <Formulario titulo="Ler etiqueta NFC" fechar={cancelar}>
          <Texto>Aproxime o dispositivo da etiqueta NFC do lote.</Texto>
          <ActivityIndicator />
          <Acao titulo="Cancelar" onPress={cancelar} />
        </Formulario>
      )}
    </>
  );
}
