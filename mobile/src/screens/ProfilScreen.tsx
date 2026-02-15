import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  UserCircle,
  Shield,
  Mail,
  Building2,
  Users,
  DollarSign,
  Globe,
  Moon,
  Pencil,
  ChevronRight,
  Bell,
} from 'lucide-react-native';
import { typography, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SectionHeader } from '../components/SectionHeader';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}

export function ProfilScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();

  const displayName = user?.name || [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Utilisateur';

  const accountItems: MenuItem[] = [
    { icon: <UserCircle size={20} color={colors.primary} />, label: 'Informations personnelles', onPress: () => navigation.navigate('InfoPersonnelles') },
    { icon: <Shield size={20} color={colors.primary} />, label: 'Sécurité & mot de passe', onPress: () => navigation.navigate('Securite') },
    { icon: <Mail size={20} color={colors.primary} />, label: 'Notifications email', onPress: () => navigation.navigate('ParametresNotifications') },
  ];

  const companyItems: MenuItem[] = [
    { icon: <Building2 size={20} color={colors.primary} />, label: 'Informations entreprise', onPress: () => Alert.alert('Informations entreprise', 'Cette fonctionnalité sera disponible prochainement.') },
    { icon: <Users size={20} color={colors.primary} />, label: 'Équipe & permissions', onPress: () => Alert.alert('Équipe & permissions', 'Gérez votre équipe et les permissions depuis le portail web.') },
  ];

  const preferenceItems: MenuItem[] = [
    { icon: <DollarSign size={20} color={colors.primary} />, label: 'Devise par défaut' },
    { icon: <Globe size={20} color={colors.primary} />, label: 'Langue' },
    { icon: <Bell size={20} color={colors.primary} />, label: 'Rappels', onPress: () => navigation.navigate('ConfigurationRappels') },
  ];

  const renderMenuItem = (item: MenuItem, index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: colors.primaryTint }]}>
        {item.icon}
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Avatar section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryTint }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={[styles.editAvatarBtn, { borderColor: colors.background }]} onPress={() => Alert.alert('Photo de profil', 'Cette fonctionnalité sera disponible prochainement.')}>
            <Pencil size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
        <Text style={[styles.userRole, { color: colors.textSecondary }]}>
          {user?.email || 'Gestionnaire'}
        </Text>
      </View>

      {/* Account section */}
      <SectionHeader title="Compte" />
      <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        {accountItems.map(renderMenuItem)}
      </View>

      {/* Company section */}
      <SectionHeader title="Entreprise" />
      <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        {companyItems.map(renderMenuItem)}
      </View>

      {/* Preferences section */}
      <SectionHeader title="Préférences" />
      <View style={[styles.menuGroup, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        {preferenceItems.map(renderMenuItem)}
        <View style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
          <View style={[styles.menuIconCircle, { backgroundColor: colors.primaryTint }]}>
            <Moon size={20} color={colors.primary} />
          </View>
          <Text style={[styles.menuLabel, { flex: 1, color: colors.text }]}>Mode sombre</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={isDark ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.smd,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSizes.xxxl,
    fontFamily: typography.fontFamily.bold,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b77f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  editAvatarIcon: { fontSize: 12 },
  userName: {
    fontSize: typography.fontSizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xxs,
  },
  userRole: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
  },

  menuGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.smd,
  },
  menuIcon: { fontSize: 16 },
  menuLabel: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  chevron: {
    fontSize: typography.fontSizes.xl,
  },

  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 20,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutText: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold,
    color: '#ef4444',
  },
});
