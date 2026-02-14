import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors, typography, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/client';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async () => {
    const err: typeof errors = {};
    if (!email.trim()) err.email = 'Email requis';
    if (!password) err.password = 'Mot de passe requis';
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/auth/mobile/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        }
      );
      const raw = await res.text();
      let data: { token?: string; user?: object; error?: string };
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        const msg =
          res.ok
            ? 'Réponse invalide du serveur.'
            : `Le serveur a renvoyé une erreur (${res.status}). Vérifiez que l’API est démarrée sur le bon port (ex. 3001) et que l’URL dans .env est correcte.`;
        throw new Error(msg);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Connexion échouée');
      }

      if (!data.token || !data.user) {
        throw new Error('Réponse de connexion incomplète (token ou user manquant).');
      }

      await login(data.token, data.user);
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
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
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Text style={styles.logoEmoji}>📋</Text>
          </View>
          <Text style={styles.title}>Emeraude Business</Text>
          <Text style={styles.subtitle}>Gestion de marchés BTP</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="votre@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />
          <Input
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />
          <Button
            title="Se connecter"
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />
        </View>
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
    paddingTop: spacing.xxl * 2,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});
