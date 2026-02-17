import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Lock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { typography, spacing } from '../theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { apiFetch } from '../api/client';

export function ChangePasswordScreen() {
  const { colors, isDark } = useTheme();
  const { clearMustChangePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      await clearMustChangePassword();
      Alert.alert('Succès', 'Mot de passe modifié avec succès');
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
    <SafeAreaView style={[st.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={st.container}
        contentContainerStyle={st.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Warning banner */}
        <View style={[st.warningCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb' }]}>
          <Shield size={22} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={[st.warningTitle, { color: isDark ? '#fbbf24' : '#92400e' }]}>
              Changement de mot de passe obligatoire
            </Text>
            <Text style={[st.warningText, { color: isDark ? '#fcd34d' : '#a16207' }]}>
              Votre administrateur a demandé que vous changiez votre mot de passe avant de continuer.
            </Text>
          </View>
        </View>

        {/* Password form */}
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={st.fieldGroup}>
            <Input
              label="Mot de passe actuel"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Entrez votre mot de passe actuel"
              secureTextEntry
              icon={<Lock size={16} color={colors.textMuted} />}
            />
          </View>

          <View style={st.fieldGroup}>
            <Input
              label="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimum 8 caractères"
              secureTextEntry
              icon={<Lock size={16} color={colors.textMuted} />}
            />
          </View>

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
            secureTextEntry
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

        <Button
          title="Se déconnecter"
          onPress={logout}
          variant="outline"
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  warningCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.smd,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  warningTitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  warningText: {
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

  fieldGroup: { marginBottom: spacing.xs },

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

  saveBtn: { marginBottom: spacing.md },
});
