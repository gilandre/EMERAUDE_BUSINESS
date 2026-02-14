import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { MarchesScreen } from './src/screens/MarchesScreen';
import { MarcheDetailScreen } from './src/screens/MarcheDetailScreen';
import { CreateMarcheScreen } from './src/screens/CreateMarcheScreen';

const Stack = createNativeStackNavigator();

function HeaderLogoutButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
      <Text style={styles.logoutText}>Déconnexion</Text>
    </TouchableOpacity>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0066cc' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Emeraude Business', headerRight: () => <HeaderLogoutButton /> }}
      />
      <Stack.Screen name="Marches" component={MarchesScreen} options={{ title: 'Marchés' }} />
      <Stack.Screen
        name="MarcheDetail"
        component={MarcheDetailScreen}
        options={({ route }) => ({ title: route.params?.id ? 'Détail marché' : 'Marché' })}
      />
      <Stack.Screen
        name="CreateMarche"
        component={CreateMarcheScreen}
        options={{ title: 'Nouveau marché' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { color: '#fff', fontSize: 14 },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
