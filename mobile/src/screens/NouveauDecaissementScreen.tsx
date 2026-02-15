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
import { CheckCircle, Wallet, Banknote, ChevronDown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SectionHeader } from '../components/SectionHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { apiFetch } from '../api/client';
import { formatMontant } from '../utils/format';

const SOURCE_OPTIONS = [
  { key: 'TRESORERIE', label: 'Trésorerie', icon: Wallet },
  { key: 'PREFINANCEMENT', label: 'Préfinancement', icon: Banknote },
] as const;

interface MarcheOption {
  id: string;
  code: string;
  libelle: string;
}

export function NouveauDecaissementScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [marches, setMarches] = useState<MarcheOption[]>([]);
  const [selectedMarche, setSelectedMarche] = useState<MarcheOption | null>(null);
  const [showMarchePicker, setShowMarchePicker] = useState(false);
  const [montant, setMontant] = useState('');
  const [beneficiaire, setBeneficiaire] = useState('');
  const [source, setSource] = useState<'TRESORERIE' | 'PREFINANCEMENT'>('TRESORERIE');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleSubmit = () => {
    if (!montant.trim()) {
      Alert.alert('Erreur', 'Le montant est requis');
      return;
    }
    if (!beneficiaire.trim()) {
      Alert.alert('Erreur', 'Le bénéficiaire est requis');
      return;
    }
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        montant: parseFloat(montant.replace(/\s/g, '').replace(',', '.')),
        beneficiaire: beneficiaire.trim(),
        source,
      };
      if (selectedMarche) {
        payload.marcheId = selectedMarche.id;
      }

      await apiFetch('/api/decaissements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowConfirm(false);
      Alert.alert('Succès', 'Décaissement enregistré avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setShowConfirm(false);
      Alert.alert('Erreur', err.message || 'Impossible d\'enregistrer le décaissement');
    } finally {
      setSubmitting(false);
    }
  };

  const parsedMontant = parseFloat(montant.replace(/\s/g, '').replace(',', '.')) || 0;
  const confirmLines = [
    { label: 'Marché', value: selectedMarche ? `${selectedMarche.code} - ${selectedMarche.libelle}` : 'Non spécifié' },
    { label: 'Montant', value: formatMontant(parsedMontant, 'XOF') },
    { label: 'Bénéficiaire', value: beneficiaire.trim() || '—' },
    { label: 'Source', value: source === 'TRESORERIE' ? 'Trésorerie' : 'Préfinancement' },
  ];

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
        {/* Info Banner */}
        <View style={[st.infoBanner, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#eff6ff' }]}>
          <CheckCircle size={18} color={isDark ? '#818cf8' : '#3b82f6'} />
          <Text style={[st.infoText, { color: isDark ? '#c7d2fe' : '#1e40af' }]}>
            Tout décaissement supérieur à 500 000 FCFA nécessitera un justificatif.
            Vous pourrez l'ajouter après l'enregistrement.
          </Text>
        </View>

        {/* Marché associé */}
        <SectionHeader title="Informations du décaissement" />

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

          {/* Montant */}
          <Input
            label="Montant"
            value={montant}
            onChangeText={setMontant}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          <View style={st.suffixHint}>
            <Text style={[st.suffixText, { color: colors.textMuted }]}>FCFA</Text>
          </View>

          {/* Bénéficiaire */}
          <Input
            label="Bénéficiaire"
            value={beneficiaire}
            onChangeText={setBeneficiaire}
            placeholder="Nom du bénéficiaire"
          />

          {/* Source Toggle */}
          <Text style={[st.fieldLabel, { color: colors.textMuted }]}>SOURCE DES FONDS</Text>
          <View style={[st.sourceToggle, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
            {SOURCE_OPTIONS.map((opt) => {
              const isActive = source === opt.key;
              const IconComp = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setSource(opt.key)}
                  style={[
                    st.sourceBtn,
                    isActive && { backgroundColor: colors.primary },
                  ]}
                >
                  <IconComp size={16} color={isActive ? '#fff' : colors.textSecondary} />
                  <Text
                    style={[
                      st.sourceBtnText,
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

        {/* Submit Button */}
        <Button
          title="Enregistrer le décaissement"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          size="lg"
          style={st.submitBtn}
          icon={<CheckCircle size={18} color="#fff" />}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={showConfirm}
        title="Confirmer le décaissement"
        lines={confirmLines}
        confirmLabel="Valider"
        loading={submitting}
        onConfirm={doSubmit}
        onCancel={() => setShowConfirm(false)}
        icon={<Wallet size={22} color={colors.primary} />}
      />

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

  // Info Banner
  infoBanner: {
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

  // Suffix
  suffixHint: {
    alignItems: 'flex-end',
    marginTop: -spacing.smd,
    marginBottom: spacing.sm,
  },
  suffixText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
  },

  // Source Toggle
  sourceToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: spacing.xs,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.smd,
    borderRadius: 8,
  },
  sourceBtnText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },

  // Submit
  submitBtn: {
    marginTop: spacing.lg,
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
