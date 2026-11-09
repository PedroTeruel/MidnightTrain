import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { codigoDaEtiqueta } from '../src/services/ndef.mjs';

const ndef = {
  TNF_WELL_KNOWN: 1,
  text: { decodePayload: bytes => Buffer.from(bytes.slice((bytes[0] & 63) + 1)).toString() },
  uri: { decodePayload: bytes => 'https://' + Buffer.from(bytes.slice(1)).toString() },
};

test('leitura NDEF aceita texto UTF-8, texto UTF-16 e URI', () => {
  const texto = { tnf: 1, type: [84], payload: [2, 112, 116, ...Buffer.from(' LOTE-42 ')] };
  const utf16 = { tnf: 1, type: [84], payload: [130, 112, 116, 255, 254, 65, 0, 231, 0] };
  const uri = { tnf: 1, type: [85], payload: [4, ...Buffer.from('exemplo.com/42')] };
  assert.equal(codigoDaEtiqueta([{ tnf: 2, type: [], payload: [] }, texto], ndef), 'LOTE-42');
  assert.equal(codigoDaEtiqueta([utf16], ndef), 'Aç');
  assert.equal(codigoDaEtiqueta([uri], ndef), 'https://exemplo.com/42');
  assert.equal(codigoDaEtiqueta([{ ...texto, payload: [2, 112] }], ndef), null);
  assert.equal(codigoDaEtiqueta([], ndef), null);
});
