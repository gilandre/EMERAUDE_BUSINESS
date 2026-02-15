import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { CheckCircle, Calendar, ChevronDown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DatePickerInput } from '../components/DatePickerInput';
import { SectionHeader } from '../components/SectionHeader';
import { apiFetch } from '../api/client';

const DEVISES = ['XOF', 'EUR', 'USD'];

const MODE_REGLEMENT_OPTIONS = [
  { key: 'especes', label: 'Espèces' },
  { key: 'cheque', label: 'Chèque' },
  { key: 'virement', label: 'Virement' },
] as const;

interface MarcheOption {
  id: string;
  code: string;
  libelle: string;
}

export function NouvelEncaissementScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [marches, setMarches] = useState<MarcheOption[]>([]);
  const [selectedMarche, setSelectedMarche] = useState<MarcheOption | null>(null);
  const [showMarchePicker, setShowMarchePicker] = useState(false);
  const [montant, setMontant] = useState('');
  const [devise, setDevise] = useState('XOF');
  const [dateReception, setDateReception] = useState(new Date().toISOString().slice(0, 10));
  const [modeReglement, setModeReglement] = useState('especes');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const fetchMarches = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/api/marches?pageSize=100&sortBy=updatedAt&sortOrder=desc');
      const data = res.data || res.marches || [];
      setMarches(data.map((m: any) => ({
        id: m.id,
        code: m.code,
        libelle: m.libelle,
      })));
    } catch {
      setMarches([]);
    }
  }, []);

  useEffect(() => { fetchMarches(); }, [fetchMarches]);

  const handleSubmit = async () => {
    if (!montant.trim()) {
      Alert.alert('Erreur', 'Le montant est requis');
      return;
    }
    if (!selectedMarche) {
      Alert.alert('Erreur', 'Veuillez sélectionner un marché');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        marcheId: selectedMarche.id,
        montant: parseFloat(montant.replace(/\s/g, '').replace(',', '.')),
        deviseCode: devise,
        dateReception,
        modeReglement,
      };

      await apiFetch('/api/accomptes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      Alert.alert('Succès', 'Encaissement confirmé avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d\'enregistrer l\'encaissement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[st.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
      >
        {/* Marché associé */}
        <SectionHeader title="Informations de l'encaissement" />

        <View style={[st.formCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {/* Dropdown - Marché associé */}
          <Text style={[st.fieldLabel, { color: colors.textMuted }]}>MARCHÉ ASSOCIÉ</Text>
          <TouchableOpacity
            style={[st.dropdown, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}
            activeOpacity={0.7}
            onPress={() => setShowMarchePicker(true)}
          >
            <Text style={[st.dropdownText, { color: selectedMarche ? colors.text : colors.textMuted }]}>
              {selectedMarche ? `${selectedMarche.code} - ${selectedMarche.libelle}` : 'Sélectionner un marché...'}
            </Text>
            <ChevronDown size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Montant with Currency Selector */}
          <Input
            label="Montant"
            value={montant}
            onChangeText={setMontant}
            placeholder="0"
            keyboardType="decimal-pad"
          />

          <Text style={[st.fieldLabel, { color: colors.textMuted }]}>DEVISE</Text>
          <View style={[st.segmented, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
            {DEVISES.map((d) => {
              const isActive = devise === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDevise(d)}
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
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date de réception */}
          <DatePickerInput
            label="Date de réception"
            value={dateReception}
            onChange={setDateReception}
          />

          {/* Mode de règlement */}
          <Text style={[st.fieldLabel, { color: colors.textMuted }]}>MODE DE RÈGLEMENT</Text>
          <View style={[st.segmented, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
            {MODE_REGLEMENT_OPTIONS.map((opt) => {
              const isActive = modeReglement === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setModeReglement(opt.key)}
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

        {/* Confirmation */}
        <SectionHeader title="Confirmation" />
        <TouchableOpacity
          style={[st.signatureZone, { backgroundColor: colors.card, borderColor: confirmed ? colors.primary : colors.borderLight }]}
          onPress={() => setConfirmed(!confirmed)}
          activeOpacity={0.7}
        >
          <View style={st.confirmRow}>
            <View style={[st.checkbox, confirmed && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              {confirmed && <CheckCircle size={16} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.signatureText, { color: colors.text }]}>
                Je confirme l'exactitude de cet encaissement
              </Text>
              <Text style={[st.signatureHint, { color: colors.textMuted }]}>
                Signature non requise sur mobile
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Submit Button */}
        <Button
          title="Confirmer l'encaissement"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          size="lg"
          style={st.submitBtn}
          icon={<CheckCircle size={18} color="#fff" />}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Marché Picker Modal */}
      <Modal visible={showMarchePicker} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.card }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>Sélectionner un marché</Text>
              <TouchableOpacity onPress={() => setShowMarchePicker(false)}>
                <Text style={[st.modalClose, { color: colors.primary }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={marches}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    st.modalItem,
                    selectedMarche?.id === item.id && { backgroundColor: colors.primaryTint },
                  ]}
                  onPress={() => {
                    setSelectedMarche(item);
                    setShowMarchePicker(false);
                  }}
                >
                  <Text style={[st.modalItemCode, { color: colors.primary }]}>{item.code}</Text>
                  <Text style={[st.modalItemLabel, { color: colors.text }]}>{item.libelle}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[st.emptyModal, { color: colors.textMuted }]}>Aucun marché disponible</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Form Card
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },

  // Dropdown
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dropdownText: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.regular,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: typography.fontSizes.sm,
  },

  // Segmented
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: spacing.xs,
    marginBottom: spacing.md,
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

  // Signature
  signatureZone: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  signatureHint: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
  },

  // Submit
  submitBtn: {
    marginTop: spacing.sm,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: typography.fontSizes.md,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  modalItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalItemCode: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalItemLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  emptyModal: {
    textAlign: 'center',
    padding: spacing.xl,
    fontSize: typography.fontSizes.sm,
  },
});
