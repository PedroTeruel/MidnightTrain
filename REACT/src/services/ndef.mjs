// NDEF Text can use UTF-16 as well as the usual UTF-8.
function decodificarUTF16(bytes) {
  const temBOM = (bytes[0] === 0xfe && bytes[1] === 0xff)
    || (bytes[0] === 0xff && bytes[1] === 0xfe);
  const littleEndian = bytes[0] === 0xff && bytes[1] === 0xfe;
  let texto = '';
  for (let i = temBOM ? 2 : 0; i + 1 < bytes.length; i += 2) {
    const unidade = littleEndian ? bytes[i] + bytes[i + 1] * 256 : bytes[i] * 256 + bytes[i + 1];
    texto += String.fromCharCode(unidade);
  }
  return texto;
}

export function codigoDaEtiqueta(registros, ndef) {
  for (const registro of registros ?? []) {
    if (registro.tnf !== ndef.TNF_WELL_KNOWN) continue;
    const tipo = String.fromCharCode(...registro.type);
    const payload = registro.payload;
    if (tipo === 'T') {
      if (payload.length === 0 || (payload[0] & 0x3f) + 1 > payload.length) continue;
      const texto = payload[0] & 0x80
        ? decodificarUTF16(payload.slice((payload[0] & 0x3f) + 1))
        : ndef.text.decodePayload(payload);
      return texto?.trim() || null;
    }
    if (tipo === 'U' && payload.length > 0) {
      return ndef.uri.decodePayload(payload)?.trim() || null;
    }
  }
  return null;
}
