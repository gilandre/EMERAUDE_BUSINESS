import React, { useState, useEffect } from 'react';
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
import {
  AtSign,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Wallet,
  ScanFace,
  Fingerprint,
  KeyRound,
} from 'lucide-react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors, typography, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/client';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const {
    login,
    saveBiometricCredentials,
    loginWithBiometrics,
    checkBiometricAvailability,
    hasBiometricCredentials,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [biometricType, setBiometricType] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { available, type } = await checkBiometricAvailability();
      if (available) {
        setBiometricType(type);
      }
    })();
  }, []);

  // Auto-trigger biometric login if credentials are saved
  useEffect(() => {
    if (biometricType && hasBiometricCredentials) {
      handleBiometricLogin();
    }
  }, [biometricType, hasBiometricCredentials]);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const success = await loginWithBiometrics();
      if (!success) {
        // Silent fail - user can use email/password
      }
    } catch {
      // Silent fail
    } finally {
      setBiometricLoading(false);
    }
  };

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
      let data: { token?: string; user?: any; error?: string };
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        const msg =
          res.ok
            ? 'Réponse invalide du serveur.'
            : `Le serveur a renvoyé une erreur (${res.status}). Vérifiez que l'API est démarrée sur le bon port (ex. 3000) et que l'URL dans .env est correcte.`;
        throw new Error(msg);
      }

      if (!res.ok) {
        if (res.status === 403) {
          Alert.alert(
            'Accès non autorisé',
            data.error || 'Accès mobile non autorisé. Contactez votre administrateur pour activer l\'accès mobile sur votre compte.',
          );
          return;
        }
        throw new Error(data.error || 'Connexion échouée');
      }

      if (!data.token || !data.user) {
        throw new Error('Réponse de connexion incomplète (token ou user manquant).');
      }

      await login(data.token, data.user);

      // Propose biometric save if available and not already saved
      if (biometricType && !hasBiometricCredentials) {
        Alert.alert(
          `Activer ${biometricType}`,
          `Voulez-vous utiliser ${biometricType} pour vos prochaines connexions ?`,
          [
            { text: 'Plus tard', style: 'cancel' },
            {
              text: 'Activer',
              onPress: () => saveBiometricCredentials(email.trim(), password),
            },
          ]
        );
      }
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricType === 'Face ID') return <ScanFace size={24} color={colors.primary} />;
    if (biometricType === 'Empreinte digitale') return <Fingerprint size={24} color={colors.primary} />;
    return <KeyRound size={24} color={colors.primary} />;
  };
  const biometricLabel = biometricType || 'Biométrie';

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
        {/* Branding */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Wallet size={44} color={colors.primary} />
          </View>
          <Text style={styles.title}>Emeraude Business</Text>
          <Text style={styles.subtitle}>Bienvenue sur votre espace de gestion</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>E-MAIL PROFESSIONNEL</Text>
            <View style={[styles.inputRow, errors.email ? styles.inputRowError : undefined]}>
              <AtSign size={20} color={colors.textMuted} />
              <Input
                placeholder="nom@entreprise.fr"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={styles.inputContainer}
                wrapperStyle={styles.inputNaked}
                style={styles.inputText}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.fieldLabel}>MOT DE PASSE</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotLink}>Oublié ?</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputRow, errors.password ? styles.inputRowError : undefined]}>
              <Lock size={20} color={colors.textMuted} />
              <Input
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                containerStyle={styles.inputContainer}
                wrapperStyle={styles.inputNaked}
                style={styles.inputText}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textMuted} />
                ) : (
                  <Eye size={20} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Submit */}
          <Button
            title="Se connecter"
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
            icon={!loading ? <ArrowRight size={20} color="#fff" /> : undefined}
          />

          {/* Biometric login */}
          {biometricType && (
            <>
              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>OU AVEC</Text>
                <View style={styles.separatorLine} />
              </View>

              <TouchableOpacity
                style={styles.faceIdBtn}
                activeOpacity={0.7}
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
              >
                {getBiometricIcon()}
                <Text style={styles.faceIdText}>{biometricLabel}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Create account link */}
        <View style={styles.createAccountRow}>
          <Text style={styles.createAccountText}>Nouveau ici ? </Text>
          <TouchableOpacity onPress={() => Alert.alert('Création de compte', 'Contactez votre administrateur pour obtenir un accès à l\'application.')}>
            <Text style={styles.createAccountLink}>Créer un compte</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.sslBadge}>
            <Shield size={14} color={colors.primary} />
            <Text style={styles.sslText}>CONNEXION SÉCURISÉE SSL 256-BIT</Text>
          </View>
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

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: 'rgba(16, 183, 127, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoIcon: {
    fontSize: 44,
  },
  title: {
    fontSize: typography.fontSizes.xxxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  // Form
  form: {
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  forgotLink: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingLeft: spacing.md,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  inputIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  inputNaked: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
  },
  inputText: {
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  eyeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  eyeIcon: {
    fontSize: 18,
    opacity: 0.4,
  },

  // Submit
  submitBtn: {
    marginTop: spacing.lg,
  },
  btnArrow: {
    fontSize: 18,
    color: '#fff',
    marginLeft: spacing.sm,
  },

  // Separator
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.medium,
    fontWeight: typography.fontWeights.medium,
    color: colors.textMuted,
    letterSpacing: 2,
  },

  // Biometric
  faceIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  faceIdIcon: {},
  faceIdText: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600' as '600',
    color: colors.primary,
  },

  // Create account
  createAccountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createAccountText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  createAccountLink: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600' as '600',
    color: colors.primary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  sslIcon: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: '700',
  },
  sslText: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
});
