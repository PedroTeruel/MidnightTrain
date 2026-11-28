import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import GestorScreen from '../views/screens/GestorScreen';
import DashboardView from '../views/dashboard/DashboardView';
import DormentesFiltradosView from '../views/dashboard/DormentesFiltradosView';

const Stack = createNativeStackNavigator();

export default function GestorNavigation({ usuario, onSair }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Gestão">
        {props => (
          <GestorScreen
            {...props}
            usuario={usuario}
            onAbrirDashboard={() => props.navigation.navigate('Dashboard')}
            onSair={onSair}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Dashboard">
        {props => (
          <DashboardView
            {...props}
            usuario={usuario}
            token={usuario.token}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Dormentes">
        {props => (
          <DormentesFiltradosView
            {...props}
            token={usuario.token}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}