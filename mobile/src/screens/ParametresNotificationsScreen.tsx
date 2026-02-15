import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { CheckCircle, XCircle, AlertCircle, Mail, Bell } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { apiFetch } from '../api/client';

export function ParametresNotificationsScreen() {
  const { colors, isDark } = useTheme();

  // Validation alerts toggles
  const [approvedAlert, setApprovedAlert] = useState(true);
  const [rejectedAlert, setRejectedAlert] = useState(true);
  const [infoNeededAlert, setInfoNeededAlert] = useState(true);

  // Email template
  const [emailSubject, setEmailSubject] = useState('Notification - Emeraude Business');
  const [emailBody, setEmailBody] = useState(
    'Bonjour {{nom}},\n\nVotre décaissement {{reference}} a été {{statut}}.\n\nCordialement,\nEmeraude Business'
  );

  // Push template
  const [pushTitle, setPushTitle] = useState('Mise à jour décaissement');
  const [pushBody, setPushBody] = useState(
    '{{reference}} - {{statut}} ({{montant}} FCFA)'
  );

  const [saving, setSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await apiFetch<any>('/api/users/me/preferences');
      if (prefs.notifications) {
        const n = prefs.notifications;
        if (n.approvedAlert !== undefined) setApprovedAlert(n.approvedAlert);
        if (n.rejectedAlert !== undefined) setRejectedAlert(n.rejectedAlert);
        if (n.infoNeededAlert !== undefined) setInfoNeededAlert(n.infoNeededAlert);
        if (n.emailSubject) setEmailSubject(n.emailSubject);
        if (n.emailBody) setEmailBody(n.emailBody);
        if (n.pushTitle) setPushTitle(n.pushTitle);
        if (n.pushBody) setPushBody(n.pushBody);
      }
    } catch {
      // Use defaults
    }
  }, []);

  useEffect(() => { loadPreferences(); }, [loadPreferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          notifications: {
            approvedAlert,
            rejectedAlert,
            infoNeededAlert,
            emailSubject,
            emailBody,
            pushTitle,
            pushBody,
          },
        }),
      });
      Alert.alert('Succès', 'Réglages de notifications enregistrés');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder les réglages');
    } finally {
      setSaving(false);
    }
  };

  const alertTypes = [
    {
      key: 'approved',
      label: 'Approuvé',
      description: 'Notifier quand un décaissement est approuvé',
      icon: CheckCircle,
      iconColor: colors.primary,
      iconBg: colors.primaryTint,
      enabled: approvedAlert,
      toggle: setApprovedAlert,
    },
    {
      key: 'rejected',
      label: 'Rejeté',
      description: 'Notifier quand un décaissement est rejeté',
      icon: XCircle,
      iconColor: colors.error,
      iconBg: 'rgba(239, 68, 68, 0.1)',
      enabled: rejectedAlert,
      toggle: setRejectedAlert,
    },
    {
      key: 'infoNeeded',
      label: 'Complément requis',
      description: 'Notifier quand des informations supplémentaires sont demandées',
      icon: AlertCircle,
      iconColor: colors.warning,
      iconBg: 'rgba(245, 158, 11, 0.1)',
      enabled: infoNeededAlert,
      toggle: setInfoNeededAlert,
    },
  ];

  return (
    <ScrollView
      style={[st.container, { backgroundColor: colors.background }]}
      contentContainerStyle={st.content}
    >
      {/* Validation Alerts */}
      <SectionHeader title="Alertes de validation" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        {alertTypes.map((alert, idx) => {
          const IconComp = alert.icon;
          return (
            <View
              key={alert.key}
              style={[
                st.alertRow,
                idx < alertTypes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
              ]}
            >
              <View style={[st.alertIconCircle, { backgroundColor: alert.iconBg }]}>
                <IconComp size={18} color={alert.iconColor} />
              </View>
              <View style={st.alertInfo}>
                <Text style={[st.alertLabel, { color: colors.text }]}>{alert.label}</Text>
                <Text style={[st.alertDesc, { color: colors.textMuted }]}>{alert.description}</Text>
              </View>
              <Switch
                value={alert.enabled}
                onValueChange={alert.toggle}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={alert.enabled ? colors.primary : '#f4f3f4'}
              />
            </View>
          );
        })}
      </View>

      {/* Email Template */}
      <SectionHeader title="Modèle email" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={st.templateHeader}>
          <Mail size={18} color={colors.primary} />
          <Text style={[st.templateTitle, { color: colors.text }]}>Template Email</Text>
        </View>

        <Text style={[st.inputLabel, { color: colors.textMuted }]}>SUJET</Text>
        <View style={[st.inputWrapper, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
          <TextInput
            style={[st.textInput, { color: colors.text }]}
            value={emailSubject}
            onChangeText={setEmailSubject}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Text style={[st.inputLabel, { color: colors.textMuted }]}>CORPS DU MESSAGE</Text>
        <View style={[st.inputWrapper, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
          <TextInput
            style={[st.textArea, { color: colors.text }]}
            value={emailBody}
            onChangeText={setEmailBody}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={[st.variablesHint, { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : '#f0f4ff' }]}>
          <Text style={[st.variablesTitle, { color: isDark ? '#818cf8' : '#4f46e5' }]}>
            Variables disponibles
          </Text>
          <Text style={[st.variablesText, { color: isDark ? '#a5b4fc' : '#6366f1' }]}>
            {'{{nom}} {{reference}} {{statut}} {{montant}} {{date}}'}
          </Text>
        </View>
      </View>

      {/* Push Template */}
      <SectionHeader title="Modèle notification push" />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={st.templateHeader}>
          <Bell size={18} color={colors.primary} />
          <Text style={[st.templateTitle, { color: colors.text }]}>Template Push</Text>
        </View>

        <Text style={[st.inputLabel, { color: colors.textMuted }]}>TITRE</Text>
        <View style={[st.inputWrapper, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
          <TextInput
            style={[st.textInput, { color: colors.text }]}
            value={pushTitle}
            onChangeText={setPushTitle}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Text style={[st.inputLabel, { color: colors.textMuted }]}>MESSAGE</Text>
        <View style={[st.inputWrapper, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
          <TextInput
            style={[st.textInput, { color: colors.text }]}
            value={pushBody}
            onChangeText={setPushBody}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Push Preview */}
        <View style={[st.pushPreview, { backgroundColor: isDark ? colors.background : '#f8fafc', borderColor: colors.borderLight }]}>
          <View style={st.pushPreviewHeader}>
            <View style={[st.pushPreviewIcon, { backgroundColor: colors.primary }]}>
              <Bell size={12} color="#fff" />
            </View>
            <Text style={[st.pushPreviewApp, { color: colors.textMuted }]}>Emeraude Business</Text>
            <Text style={[st.pushPreviewTime, { color: colors.textMuted }]}>maintenant</Text>
          </View>
          <Text style={[st.pushPreviewTitle, { color: colors.text }]}>{pushTitle}</Text>
          <Text style={[st.pushPreviewBody, { color: colors.textSecondary }]}>
            {pushBody.replace('{{reference}}', 'DEC-2026-0047').replace('{{statut}}', 'Approuvé').replace('{{montant}}', '2 450 000')}
          </Text>
        </View>
      </View>

      {/* Save Button */}
      <Button
        title="Enregistrer les réglages"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        size="lg"
        style={st.submitBtn}
        icon={!saving ? <CheckCircle size={18} color="#fff" /> : undefined}
      />

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  // Alert Rows
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.smd,
    gap: spacing.smd,
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: {
    flex: 1,
  },
  alertLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  alertDesc: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },

  // Template
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  templateTitle: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },

  // Input
  inputLabel: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    borderRadius: 12,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  textInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  textArea: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    minHeight: 120,
  },

  // Variables hint
  variablesHint: {
    borderRadius: 10,
    padding: spacing.smd,
    gap: spacing.xs,
  },
  variablesTitle: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  variablesText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
  },

  // Push Preview
  pushPreview: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.smd,
    gap: spacing.xs,
  },
  pushPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pushPreviewIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushPreviewApp: {
    flex: 1,
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.medium,
  },
  pushPreviewTime: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.regular,
  },
  pushPreviewTitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  pushPreviewBody: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 16,
  },

  // Submit
  submitBtn: {
    marginTop: spacing.lg,
  },
});
