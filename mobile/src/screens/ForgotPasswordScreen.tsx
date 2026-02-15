import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors, typography, spacing } from '../theme';
import { API_BASE } from '../api/client';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre email');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      // The backend always returns success for security
      setSent(true);
    } catch (e) {
      Alert.alert(
        'Erreur',
        'Impossible de contacter le serveur. Vérifiez votre connexion.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>🔑</Text>
          </View>
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            {sent
              ? 'Si un compte existe avec cette adresse, vous recevrez un email avec les instructions de réinitialisation.'
              : 'Entrez votre adresse email professionnelle et nous vous enverrons un lien de réinitialisation.'}
          </Text>
        </View>

        {!sent ? (
          <View style={styles.form}>
            <Input
              label="E-mail professionnel"
              placeholder="nom@entreprise.fr"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Text style={styles.inputIcon}>@</Text>}
            />
            <Button
              title="Envoyer le lien"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
              icon={!loading ? <Text style={styles.btnIcon}>✉️</Text> : undefined}
            />
          </View>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Text style={styles.successEmoji}>✅</Text>
            </View>
            <Text style={styles.successTitle}>Email envoyé !</Text>
            <Text style={styles.successText}>
              Consultez votre boîte de réception et suivez les instructions pour réinitialiser votre mot de passe.
            </Text>
            <Button
              title="Retour à la connexion"
              onPress={() => navigation.goBack()}
              size="lg"
              style={styles.submitBtn}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  backIcon: {
    fontSize: 20,
    color: colors.primary,
  },
  backText: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  icon: { fontSize: 36 },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.smd,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  form: {},
  inputIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  btnIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },

  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successEmoji: { fontSize: 28 },
  successTitle: {
    fontSize: typography.fontSizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
