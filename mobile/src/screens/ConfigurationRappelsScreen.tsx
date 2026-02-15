import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Bell, Mail, Smartphone, Clock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SectionHeader } from '../components/SectionHeader';

const FREQUENCY_OPTIONS = [
  { key: 'quotidien', label: 'Quotidien' },
  { key: 'hebdo', label: 'Hebdo' },
  { key: 'mensuel', label: 'Mensuel' },
] as const;

export function ConfigurationRappelsScreen() {
  const { colors, isDark } = useTheme();

  const [autoReminders, setAutoReminders] = useState(true);
  const [frequency, setFrequency] = useState<string>('hebdo');
  const [gracePeriod, setGracePeriod] = useState('7');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const handleSave = () => {
    Alert.alert('Succès', 'Réglages de rappels appliqués avec succès');
  };

  const channels = [
    { key: 'push', label: 'Notifications push', icon: Bell, enabled: pushEnabled, toggle: setPushEnabled },
    { key: 'email', label: 'Email', icon: Mail, enabled: emailEnabled, toggle: setEmailEnabled },
    { key: 'sms', label: 'SMS', icon: Smartphone, enabled: smsEnabled, toggle: setSmsEnabled },
  ];

  return (
    <ScrollView
      style={[st.container, { backgroundColor: colors.background }]}
      contentContainerStyle={st.content}
    >
      {/* Main Toggle */}
      <View style={[st.mainToggleCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={st.mainToggleRow}>
          <View style={[st.toggleIconCircle, { backgroundColor: colors.primaryTint }]}>
            <Bell size={22} color={colors.primary} />
          </View>
          <View style={st.toggleInfo}>
            <Text style={[st.toggleLabel, { color: colors.text }]}>Rappels automatiques</Text>
            <Text style={[st.toggleDesc, { color: colors.textMuted }]}>
              Envoyer des rappels aux bénéficiaires pour les justificatifs manquants
            </Text>
          </View>
          <Switch
            value={autoReminders}
            onValueChange={setAutoReminders}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={autoReminders ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Frequency */}
      <SectionHeader title="Fréquence des rappels" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={[st.segmented, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
          {FREQUENCY_OPTIONS.map((opt) => {
            const isActive = frequency === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setFrequency(opt.key)}
                style={[
                  st.segmentBtn,
                  isActive && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    st.segmentText,
                    { color: isActive ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Grace Period */}
      <SectionHeader title="Délai de grâce" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={st.graceRow}>
          <Clock size={18} color={colors.textMuted} />
          <Text style={[st.graceLabel, { color: colors.text }]}>
            Jours après le paiement
          </Text>
        </View>
        <Input
          value={gracePeriod}
          onChangeText={setGracePeriod}
          placeholder="7"
          keyboardType="number-pad"
          containerStyle={st.graceInput}
        />
        <Text style={[st.graceHint, { color: colors.textMuted }]}>
          Le premier rappel sera envoyé {gracePeriod || '0'} jour(s) après le décaissement
        </Text>
      </View>

      {/* Channels */}
      <SectionHeader title="Canaux de notification" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        {channels.map((ch, idx) => {
          const IconComp = ch.icon;
          return (
            <View
              key={ch.key}
              style={[
                st.channelRow,
                idx < channels.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
              ]}
            >
              <View style={st.channelLeft}>
                <IconComp size={18} color={ch.enabled ? colors.primary : colors.textMuted} />
                <Text style={[st.channelLabel, { color: colors.text }]}>{ch.label}</Text>
              </View>
              <Switch
                value={ch.enabled}
                onValueChange={ch.toggle}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={ch.enabled ? colors.primary : '#f4f3f4'}
              />
            </View>
          );
        })}
      </View>

      {/* Preview Card */}
      <SectionHeader title="Aperçu du rappel" />
      <View style={[st.previewCard, { backgroundColor: isDark ? colors.surface : colors.primaryTint, borderColor: colors.borderLight }]}>
        <View style={st.previewHeader}>
          <Bell size={16} color={colors.primary} />
          <Text style={[st.previewTitle, { color: colors.primary }]}>Rappel justificatif</Text>
        </View>
        <Text style={[st.previewBody, { color: colors.text }]}>
          Bonjour, le justificatif pour le décaissement DEC-2026-0047 d'un montant de 2 450 000 FCFA
          est attendu depuis {gracePeriod || '7'} jour(s). Merci de le soumettre dans les plus brefs délais.
        </Text>
        <Text style={[st.previewFooter, { color: colors.textMuted }]}>
          Fréquence : {FREQUENCY_OPTIONS.find((f) => f.key === frequency)?.label ?? frequency}
          {' | '}Canaux : {channels.filter((c) => c.enabled).map((c) => c.label).join(', ') || 'Aucun'}
        </Text>
      </View>

      {/* Apply Button */}
      <Button
        title="Appliquer les réglages"
        onPress={handleSave}
        size="lg"
        style={st.submitBtn}
        icon={<Bell size={18} color="#fff" />}
      />

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Main Toggle
  mainToggleCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  mainToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  toggleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  toggleDesc: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  // Segmented
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.smd,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },

  // Grace Period
  graceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.smd,
  },
  graceLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  graceInput: {
    marginBottom: spacing.sm,
  },
  graceHint: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 16,
  },

  // Channels
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.smd,
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  channelLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },

  // Preview
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.smd,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewTitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  previewBody: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
  },
  previewFooter: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 14,
  },

  // Submit
  submitBtn: {
    marginTop: spacing.sm,
  },
});
