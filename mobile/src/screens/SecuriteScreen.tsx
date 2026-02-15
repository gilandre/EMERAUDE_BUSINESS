import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Shield, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { typography, spacing } from '../theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SectionHeader } from '../components/SectionHeader';
import { apiFetch } from '../api/client';

export function SecuriteScreen() {
  const { colors, isDark } = useTheme();
  const { hasBiometricCredentials } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Erreur', 'Le mot de passe actuel est requis');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      Alert.alert('Succès', 'Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de modifier le mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const passwordStrength = (() => {
    if (newPassword.length === 0) return null;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 2) return { label: 'Faible', color: '#ef4444', ratio: 0.33 };
    if (score <= 3) return { label: 'Moyen', color: '#f59e0b', ratio: 0.66 };
    return { label: 'Fort', color: '#22c55e', ratio: 1 };
  })();

  return (
    <ScrollView
      style={[st.container, { backgroundColor: colors.background }]}
      contentContainerStyle={st.content}
    >
      {/* Security Info */}
      <View style={[st.infoCard, { backgroundColor: isDark ? 'rgba(16,183,127,0.1)' : '#ecfdf5' }]}>
        <Shield size={20} color={colors.primary} />
        <Text style={[st.infoText, { color: isDark ? '#6ee7b7' : '#065f46' }]}>
          Protégez votre compte avec un mot de passe fort et unique.
        </Text>
      </View>

      {/* Change Password */}
      <SectionHeader title="Changer le mot de passe" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={st.passwordField}>
          <Input
            label="Mot de passe actuel"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Entrez votre mot de passe actuel"
            secureTextEntry={!showCurrent}
            icon={<Lock size={16} color={colors.textMuted} />}
          />
        </View>

        <View style={st.passwordField}>
          <Input
            label="Nouveau mot de passe"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Minimum 8 caractères"
            secureTextEntry={!showNew}
            icon={<Lock size={16} color={colors.textMuted} />}
          />
        </View>

        {/* Strength indicator */}
        {passwordStrength && (
          <View style={st.strengthRow}>
            <View style={[st.strengthTrack, { backgroundColor: colors.borderLight }]}>
              <View style={[st.strengthFill, { width: `${passwordStrength.ratio * 100}%`, backgroundColor: passwordStrength.color }]} />
            </View>
            <Text style={[st.strengthLabel, { color: passwordStrength.color }]}>
              {passwordStrength.label}
            </Text>
          </View>
        )}

        <Input
          label="Confirmer le nouveau mot de passe"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Répétez le nouveau mot de passe"
          secureTextEntry={!showNew}
          icon={<Lock size={16} color={colors.textMuted} />}
        />

        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
          <Text style={st.mismatch}>Les mots de passe ne correspondent pas</Text>
        )}
      </View>

      <Button
        title="Modifier le mot de passe"
        onPress={handleChangePassword}
        loading={saving}
        disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
        size="lg"
        style={st.saveBtn}
        icon={!saving ? <Lock size={18} color="#fff" /> : undefined}
      />

      {/* Biometric status */}
      <SectionHeader title="Authentification biométrique" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={st.bioRow}>
          <View style={[st.bioIcon, { backgroundColor: colors.primaryTint }]}>
            <Fingerprint size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.bioLabel, { color: colors.text }]}>
              {hasBiometricCredentials ? 'Activée' : 'Non configurée'}
            </Text>
            <Text style={[st.bioHint, { color: colors.textMuted }]}>
              {hasBiometricCredentials
                ? 'La connexion biométrique est active sur cet appareil'
                : 'Connectez-vous avec vos identifiants pour activer la biométrie'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.smd,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 18,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  passwordField: { marginBottom: spacing.xs },

  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },

  mismatch: {
    color: '#ef4444',
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
  },

  saveBtn: { marginBottom: spacing.lg },

  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  bioIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  bioHint: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },
});
