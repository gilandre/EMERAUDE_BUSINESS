import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import {
  LayoutDashboard, Briefcase, Activity, Wallet, User,
} from 'lucide-react-native';

// Screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { MarchesScreen } from '../screens/MarchesScreen';
import { MarcheDetailScreen } from '../screens/MarcheDetailScreen';
import { CreateMarcheScreen } from '../screens/CreateMarcheScreen';
import { AlertesScreen } from '../screens/AlertesScreen';
import { ProfilScreen } from '../screens/ProfilScreen';
import { TresorerieScreen } from '../screens/TresorerieScreen';
import { DecaissementsAJustifierScreen } from '../screens/DecaissementsAJustifierScreen';
import { BeneficiairesScreen } from '../screens/BeneficiairesScreen';
import { BeneficiaireDetailScreen } from '../screens/BeneficiaireDetailScreen';
import { FraisDeplacementScreen } from '../screens/FraisDeplacementScreen';
import { DecaissementDetailScreen } from '../screens/DecaissementDetailScreen';
import { AjouterJustificatifScreen } from '../screens/AjouterJustificatifScreen';
import { NouveauDecaissementScreen } from '../screens/NouveauDecaissementScreen';
import { NouvelEncaissementScreen } from '../screens/NouvelEncaissementScreen';
import { DeclarationUsageScreen } from '../screens/DeclarationUsageScreen';
import { DiscussionMarcheScreen } from '../screens/DiscussionMarcheScreen';
import { ConfigurationRappelsScreen } from '../screens/ConfigurationRappelsScreen';
import { ParametresNotificationsScreen } from '../screens/ParametresNotificationsScreen';
import { InfoPersonnellesScreen } from '../screens/InfoPersonnellesScreen';
import { SecuriteScreen } from '../screens/SecuriteScreen';
import { ActivitesScreen } from '../screens/ActivitesScreen';
import { ActiviteDetailScreen } from '../screens/ActiviteDetailScreen';
import { CreateActiviteScreen } from '../screens/CreateActiviteScreen';

import { typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const MarchesStack = createNativeStackNavigator();
const ActivitesStack = createNativeStackNavigator();
const TresorerieStack = createNativeStackNavigator();
const ProfilStack = createNativeStackNavigator();

function useStackScreenOptions() {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: {
      fontFamily: typography.fontFamily.bold,
      fontWeight: typography.fontWeights.bold as '700',
      fontSize: typography.fontSizes.lg,
    },
    headerShadowVisible: false,
  };
}

// ─── Dashboard Stack ──────────────────────────────────────────────
function DashboardStackScreen() {
  const screenOptions = useStackScreenOptions();
  return (
    <DashboardStack.Navigator screenOptions={screenOptions}>
      <DashboardStack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ title: 'Emeraude Business' }}
      />
      <DashboardStack.Screen
        name="MarcheDetail"
        component={MarcheDetailScreen}
        options={{ title: 'Détail marché' }}
      />
      <DashboardStack.Screen
        name="AlertesList"
        component={AlertesScreen}
        options={{ title: 'Alertes' }}
      />
    </DashboardStack.Navigator>
  );
}

// ─── Marchés Stack ────────────────────────────────────────────────
function MarchesStackScreen() {
  const screenOptions = useStackScreenOptions();
  return (
    <MarchesStack.Navigator screenOptions={screenOptions}>
      <MarchesStack.Screen
        name="MarchesList"
        component={MarchesScreen}
        options={{ title: 'Marchés' }}
      />
      <MarchesStack.Screen
        name="MarcheDetail"
        component={MarcheDetailScreen}
        options={{ title: 'Détail marché' }}
      />
      <MarchesStack.Screen
        name="CreateMarche"
        component={CreateMarcheScreen}
        options={{ title: 'Nouveau marché' }}
      />
      <MarchesStack.Screen
        name="DeclarationUsage"
        component={DeclarationUsageScreen}
        options={{ title: 'Déclaration d\'usage' }}
      />
      <MarchesStack.Screen
        name="DiscussionMarche"
        component={DiscussionMarcheScreen}
        options={{ title: 'Discussion' }}
      />
      <MarchesStack.Screen
        name="DecaissementDetail"
        component={DecaissementDetailScreen}
        options={{ title: 'Détail décaissement' }}
      />
      <MarchesStack.Screen
        name="AjouterJustificatif"
        component={AjouterJustificatifScreen}
        options={{ title: 'Ajouter un justificatif' }}
      />
    </MarchesStack.Navigator>
  );
}

// ─── Activités Stack ─────────────────────────────────────────────
function ActivitesStackScreen() {
  const screenOptions = useStackScreenOptions();
  return (
    <ActivitesStack.Navigator screenOptions={screenOptions}>
      <ActivitesStack.Screen
        name="ActivitesList"
        component={ActivitesScreen}
        options={{ title: 'Activités' }}
      />
      <ActivitesStack.Screen
        name="ActiviteDetail"
        component={ActiviteDetailScreen}
        options={{ title: 'Détail activité' }}
      />
      <ActivitesStack.Screen
        name="CreateActivite"
        component={CreateActiviteScreen}
        options={{ title: 'Nouvelle activité' }}
      />
    </ActivitesStack.Navigator>
  );
}

// ─── Trésorerie Stack ────────────────────────────────────────────
function TresorerieStackScreen() {
  const screenOptions = useStackScreenOptions();
  return (
    <TresorerieStack.Navigator screenOptions={screenOptions}>
      <TresorerieStack.Screen
        name="TresorerieHome"
        component={TresorerieScreen}
        options={{ title: 'Trésorerie' }}
      />
      <TresorerieStack.Screen
        name="DecaissementsAJustifier"
        component={DecaissementsAJustifierScreen}
        options={{ title: 'À justifier' }}
      />
      <TresorerieStack.Screen
        name="AjouterJustificatif"
        component={AjouterJustificatifScreen}
        options={{ title: 'Ajouter un justificatif' }}
      />
      <TresorerieStack.Screen
        name="Beneficiaires"
        component={BeneficiairesScreen}
        options={{ title: 'Bénéficiaires', headerShown: false }}
      />
      <TresorerieStack.Screen
        name="BeneficiaireDetail"
        component={BeneficiaireDetailScreen}
        options={{ title: 'Détails du bénéficiaire' }}
      />
      <TresorerieStack.Screen
        name="FraisDeplacement"
        component={FraisDeplacementScreen}
        options={{ title: 'Frais de déplacement' }}
      />
      <TresorerieStack.Screen
        name="NouveauDecaissement"
        component={NouveauDecaissementScreen}
        options={{ title: 'Nouveau décaissement' }}
      />
      <TresorerieStack.Screen
        name="NouvelEncaissement"
        component={NouvelEncaissementScreen}
        options={{ title: 'Nouvel encaissement' }}
      />
      <TresorerieStack.Screen
        name="DecaissementDetail"
        component={DecaissementDetailScreen}
        options={{ title: 'Détail décaissement' }}
      />
    </TresorerieStack.Navigator>
  );
}

// ─── Profil Stack ─────────────────────────────────────────────────
function ProfilStackScreen() {
  const screenOptions = useStackScreenOptions();
  return (
    <ProfilStack.Navigator screenOptions={screenOptions}>
      <ProfilStack.Screen
        name="ProfilHome"
        component={ProfilScreen}
        options={{ title: 'Profil' }}
      />
      <ProfilStack.Screen
        name="ConfigurationRappels"
        component={ConfigurationRappelsScreen}
        options={{ title: 'Rappels' }}
      />
      <ProfilStack.Screen
        name="ParametresNotifications"
        component={ParametresNotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <ProfilStack.Screen
        name="InfoPersonnelles"
        component={InfoPersonnellesScreen}
        options={{ title: 'Informations personnelles' }}
      />
      <ProfilStack.Screen
        name="Securite"
        component={SecuriteScreen}
        options={{ title: 'Sécurité' }}
      />
    </ProfilStack.Navigator>
  );
}

// ─── Main Tab Navigator ───────────────────────────────────────────
export function BottomTabNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.medium,
          fontSize: 10,
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(22, 44, 37, 0.95)' : 'rgba(255,255,255,0.95)',
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 88 : 68,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size ?? 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Marches"
        component={MarchesStackScreen}
        options={{
          tabBarLabel: 'Marchés',
          tabBarIcon: ({ color, size }) => <Briefcase size={size ?? 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Activites"
        component={ActivitesStackScreen}
        options={{
          tabBarLabel: 'Activités',
          tabBarIcon: ({ color, size }) => <Activity size={size ?? 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Tresorerie"
        component={TresorerieStackScreen}
        options={{
          tabBarLabel: 'Trésorerie',
          tabBarIcon: ({ color, size }) => <Wallet size={size ?? 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfilStackScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => <User size={size ?? 22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

