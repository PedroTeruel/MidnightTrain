import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StorageView from '../views/screens/StorageView';
import LoteView from '../views/screens/LoteView';
import EachDormenteView from '../views/screens/EachDormenteView';
import { IconeBotao } from '../views/components/Interface';

const Stack = createNativeStackNavigator();

export default function EstoqueNavigation({  lotes,token,onSalvarLote,onSalvarDormente, onRegistrarEntrada, onRegistrarTransferencia, onRegistrarSaida, onSair,}) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Estoque" options={{
        headerLargeTitle: Platform.OS === 'ios',
        headerLeft: () => <IconeBotao titulo="Sair da conta" icone="log-out-outline" onPress={onSair} />,
      }}>
        {props => <StorageView {...props} lotes={lotes} onSalvarLote={onSalvarLote} />}
      </Stack.Screen>
      <Stack.Screen name="Lote">
        {props => <LoteView {...props} lote={lotes.find(lote => lote.chave === props.route.params.chave)}
          onSalvarLote={onSalvarLote} />}
      </Stack.Screen>
      <Stack.Screen name="Dormente">
        {props => {
          const lote = lotes.find(item => item.chave === props.route.params.chave);
          const dormente = lote?.dormentes.find(item => item.id === props.route.params.id);
          return <EachDormenteView {...props}lote={lote}dormente={dormente} token={token} onSalvarDormente={onSalvarDormente} onRegistrarEntrada={onRegistrarEntrada} onRegistrarTransferencia={onRegistrarTransferencia} onRegistrarSaida={onRegistrarSaida}/>;
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
