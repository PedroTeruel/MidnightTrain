import { Platform } from 'react-native';
import NfcManager, { Ndef, NfcError, NfcTech } from 'react-native-nfc-manager';
import { codigoDaEtiqueta } from './ndef.mjs';

export async function lerEtiqueta(sinal) {
  try {
    if (!(await NfcManager.isSupported(NfcTech.Ndef))) {
      throw new Error('NFC indisponível neste dispositivo');
    }
    await NfcManager.start();
    if (!(await NfcManager.isEnabled())) {
      throw new Error('Ative o NFC nas configurações do dispositivo.');
    }
    if (sinal.aborted) return null;
    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: Platform.OS === 'ios'
        ? 'Aproxime o iPhone da etiqueta NFC do lote.'
        : 'Aproxime o dispositivo da etiqueta NFC do lote.',
    });
    const etiqueta = await NfcManager.getTag();
    const codigo = codigoDaEtiqueta(etiqueta?.ndefMessage, Ndef);
    if (codigo) return codigo;
    throw new Error('Etiqueta sem identificador válido');
  } catch (erro) {
    if (erro instanceof NfcError.UserCancel) return null;
    throw erro;
  } finally {
    await cancelarLeitura();
  }
}

export async function cancelarLeitura() {
  try {
    await NfcManager.cancelTechnologyRequest();
  } catch {
    // A sessão pode já ter terminado no sistema.
  }
}
