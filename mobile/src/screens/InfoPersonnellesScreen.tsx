import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { UserCircle, Mail, Phone, Save } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { typography, spacing } from '../theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SectionHeader } from '../components/SectionHeader';
import { apiFetch } from '../api/client';

interface UserProfile {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  name: string | null;
  telephone?: string | null;
  profil?: { code: string; libelle: string } | null;
}

export function InfoPersonnellesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [profilLabel, setProfilLabel] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const profile = await apiFetch<UserProfile>('/api/users/me');
        setNom(profile.nom ?? '');
        setPrenom(profile.prenom ?? '');
        setEmail(profile.email);
        setProfilLabel(profile.profil?.libelle ?? '—');
      } catch {
        // Use auth context data as fallback
        setNom(user?.nom ?? '');
        setPrenom(user?.prenom ?? '');
        setEmail(user?.email ?? '');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!nom.trim() && !prenom.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner au moins le nom ou le prénom');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ nom: nom.trim(), prenom: prenom.trim() }),
      });
      Alert.alert('Succès', 'Informations mises à jour');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de mettre à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[st.container, { backgroundColor: colors.background }]}
      contentContainerStyle={st.content}
    >
      {/* Avatar */}
      <View style={st.avatarSection}>
        <View style={[st.avatar, { backgroundColor: colors.primaryTint }]}>
          <Text style={[st.avatarText, { color: colors.primary }]}>
            {(prenom || nom || email).charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Form */}
      <SectionHeader title="Informations" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Input
          label="Prénom"
          value={prenom}
          onChangeText={setPrenom}
          placeholder="Votre prénom"
          icon={<UserCircle size={18} color={colors.textMuted} />}
        />
        <Input
          label="Nom"
          value={nom}
          onChangeText={setNom}
          placeholder="Votre nom"
          icon={<UserCircle size={18} color={colors.textMuted} />}
        />

        {/* Email (read-only) */}
        <View style={st.readOnlyField}>
          <Text style={[st.readOnlyLabel, { color: colors.textMuted }]}>EMAIL</Text>
          <View style={[st.readOnlyValue, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
            <Mail size={16} color={colors.textMuted} />
            <Text style={[st.readOnlyText, { color: colors.textSecondary }]}>{email}</Text>
          </View>
          <Text style={[st.readOnlyHint, { color: colors.textMuted }]}>
            L'email ne peut pas être modifié depuis le mobile
          </Text>
        </View>
      </View>

      {/* Profil / Role */}
      <SectionHeader title="Rôle" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={[st.roleChip, { backgroundColor: colors.primaryTint }]}>
          <Text style={[st.roleText, { color: colors.primary }]}>{profilLabel}</Text>
        </View>
        <Text style={[st.roleHint, { color: colors.textMuted }]}>
          Les rôles sont gérés par l'administrateur
        </Text>
      </View>

      {/* Save */}
      <Button
        title="Enregistrer"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        size="lg"
        style={st.saveBtn}
        icon={!saving ? <Save size={18} color="#fff" /> : undefined}
      />

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  readOnlyField: { marginBottom: spacing.md },
  readOnlyLabel: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  readOnlyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    padding: spacing.md,
  },
  readOnlyText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  readOnlyHint: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
  },

  roleChip: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  roleText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  roleHint: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
  },

  saveBtn: { marginTop: spacing.lg },
});
