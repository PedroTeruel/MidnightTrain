import React from 'react';
import { Linha } from './Interface';

export default function DormenteMenu({ dormente, abrir }) {
  return <Linha titulo={dormente.nome} valor={dormente.condicao} onPress={abrir} />;
}
