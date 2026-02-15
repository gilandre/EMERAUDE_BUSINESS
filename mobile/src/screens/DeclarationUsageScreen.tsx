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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Plus, Trash2, FileText, Send } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ProgressBar } from '../components/ProgressBar';
import { SectionHeader } from '../components/SectionHeader';
import { apiFetch } from '../api/client';

type NavParams = { DeclarationUsage: { id?: string; marcheId?: string } };

interface ExpenseLine {
  id: string;
  libelle: string;
  montant: string;
  hasJustificatif: boolean;
  isNew?: boolean;
}

interface DeclarationData {
  id: string;
  statut: string;
  montantRecu: number;
  dateReception: string;
  contratRef: string;
  marcheId: string;
  lignes: ExpenseLine[];
}

export function DeclarationUsageScreen() {
  const route = useRoute<RouteProp<NavParams, 'DeclarationUsage'>>();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const declarationId = route.params?.id;
  const marcheId = route.params?.marcheId;

  const [declaration, setDeclaration] = useState<DeclarationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [lines, setLines] = useState<ExpenseLine[]>([]);
  const [montantRecu, setMontantRecu] = useState(0);
  const [dateReception, setDateReception] = useState('');
  const [contratRef, setContratRef] = useState('');
  const [statut, setStatut] = useState('BROUILLON');

  const fetchData = useCallback(async () => {
    try {
      if (declarationId) {
        const res = await apiFetch<any>(`/api/declarations-usage/${declarationId}`);
        const d = res.declaration || res;
        setDeclaration(d);
        setMontantRecu(d.montantRecu || d.montant || 0);
        setDateReception(d.dateReception || d.date || d.createdAt || '');
        setContratRef(d.marche?.code || d.marcheCode || d.contratRef || '');
        setStatut(d.statut || 'BROUILLON');

        const lignes = d.lignes || d.lines || [];
        setLines(lignes.map((l: any) => ({
          id: l.id,
          libelle: l.libelle || l.description || '',
          montant: String(l.montant || 0),
          hasJustificatif: l.hasJustificatif || !!l.justificatifId,
          isNew: false,
        })));
      } else {
        // Creating a new declaration
        setLines([{ id: String(Date.now()), libelle: '', montant: '', hasJustificatif: false, isNew: true }]);
      }
    } catch {
      setDeclaration(null);
      setLines([{ id: String(Date.now()), libelle: '', montant: '', hasJustificatif: false, isNew: true }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [declarationId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const formatMontant = (n: number) => {
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
    return `${fmt} FCFA`;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const totalJustifie = lines.reduce((sum, l) => {
    const val = parseFloat(l.montant.replace(/\s/g, '').replace(',', '.')) || 0;
    return sum + val;
  }, 0);

  const progressRatio = montantRecu > 0 ? Math.min(1, totalJustifie / montantRecu) : 0;

  const addLine = () => {
    const newId = String(Date.now());
    setLines([...lines, { id: newId, libelle: '', montant: '', hasJustificatif: false, isNew: true }]);
  };

  const removeLine = async (lineId: string) => {
    if (lines.length <= 1) {
      Alert.alert('Attention', 'Au moins une ligne est requise');
      return;
    }

    const line = lines.find(l => l.id === lineId);
    if (line && !line.isNew && declarationId) {
      try {
        await apiFetch(`/api/declarations-usage/${declarationId}/lignes`, {
          method: 'DELETE',
          body: JSON.stringify({ ligneId: lineId }),
        });
      } catch {
        Alert.alert('Erreur', 'Impossible de supprimer la ligne');
        return;
      }
    }
    setLines(lines.filter((l) => l.id !== lineId));
  };

  const updateLine = (id: string, field: keyof ExpenseLine, value: string | boolean) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSaveDraft = async () => {
    const emptyLines = lines.filter((l) => !l.libelle.trim() || !l.montant.trim());
    if (emptyLines.length > 0) {
      Alert.alert('Erreur', 'Veuillez remplir toutes les lignes de dépenses');
      return;
    }

    setSubmitting(true);
    try {
      const lignesPayload = lines.map(l => ({
        libelle: l.libelle.trim(),
        montant: parseFloat(l.montant.replace(/\s/g, '').replace(',', '.')),
      }));

      if (declarationId) {
        // Update existing + sync lines
        await apiFetch(`/api/declarations-usage/${declarationId}`, {
          method: 'PUT',
          body: JSON.stringify({ statut: 'BROUILLON' }),
        });

        // Add new lines
        const newLines = lines.filter(l => l.isNew);
        if (newLines.length > 0) {
          await apiFetch(`/api/declarations-usage/${declarationId}/lignes`, {
            method: 'POST',
            body: JSON.stringify({
              lignes: newLines.map(l => ({
                libelle: l.libelle.trim(),
                montant: parseFloat(l.montant.replace(/\s/g, '').replace(',', '.')),
              })),
            }),
          });
        }
      } else {
        // Create new declaration
        const payload: Record<string, any> = {
          lignes: lignesPayload,
        };
        if (marcheId) payload.marcheId = marcheId;

        await apiFetch('/api/declarations-usage', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      Alert.alert('Succès', 'Brouillon enregistré', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d\'enregistrer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const emptyLines = lines.filter((l) => !l.libelle.trim() || !l.montant.trim());
    if (emptyLines.length > 0) {
      Alert.alert('Erreur', 'Veuillez remplir toutes les lignes de dépenses');
      return;
    }

    setSubmitting(true);
    try {
      if (declarationId) {
        // Submit existing: change statut to SOUMIS
        await apiFetch(`/api/declarations-usage/${declarationId}`, {
          method: 'PUT',
          body: JSON.stringify({ statut: 'SOUMIS' }),
        });
      } else {
        // Create and submit
        const payload: Record<string, any> = {
          statut: 'SOUMIS',
          lignes: lines.map(l => ({
            libelle: l.libelle.trim(),
            montant: parseFloat(l.montant.replace(/\s/g, '').replace(',', '.')),
          })),
        };
        if (marcheId) payload.marcheId = marcheId;

        await apiFetch('/api/declarations-usage', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      Alert.alert('Succès', 'Compte-rendu soumis avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de soumettre');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatutVariant = (s: string) => {
    const lower = (s || '').toLowerCase();
    if (lower === 'approuve' || lower === 'approuvé') return 'success' as const;
    if (lower === 'soumis') return 'warning' as const;
    if (lower === 'rejete' || lower === 'rejeté') return 'error' as const;
    return 'neutral' as const;
  };

  const getStatutLabel = (s: string) => {
    const lower = (s || '').toLowerCase();
    if (lower === 'brouillon') return 'Brouillon';
    if (lower === 'soumis') return 'Soumis';
    if (lower === 'approuve' || lower === 'approuvé') return 'Approuvé';
    if (lower === 'rejete' || lower === 'rejeté') return 'Rejeté';
    return s || 'En cours';
  };

  const isEditable = !statut || statut === 'BROUILLON' || statut === 'REJETE';

  if (loading) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[st.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Reference Header */}
        <View style={[st.refCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={st.refHeader}>
            <Text style={[st.refCode, { color: colors.text }]}>
              {contratRef ? `Contrat ${contratRef}` : 'Nouvelle déclaration'}
            </Text>
            <Badge label={getStatutLabel(statut)} variant={getStatutVariant(statut)} />
          </View>
          <View style={[st.refDivider, { backgroundColor: colors.borderLight }]} />
          <View style={st.refRow}>
            <Text style={[st.refLabel, { color: colors.textMuted }]}>Montant reçu</Text>
            <Text style={[st.refValue, { color: colors.primary }]}>{formatMontant(montantRecu)}</Text>
          </View>
          {dateReception ? (
            <View style={st.refRow}>
              <Text style={[st.refLabel, { color: colors.textMuted }]}>Date de réception</Text>
              <Text style={[st.refValue, { color: colors.text }]}>{formatDate(dateReception)}</Text>
            </View>
          ) : null}
        </View>

        {/* Expense Lines */}
        <SectionHeader title="Lignes de dépenses" />

        {lines.map((line, idx) => (
          <View
            key={line.id}
            style={[st.lineCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
          >
            <View style={st.lineHeader}>
              <Text style={[st.lineNumber, { color: colors.textMuted }]}>Ligne {idx + 1}</Text>
              {isEditable && (
                <TouchableOpacity onPress={() => removeLine(line.id)} style={st.removeBtn}>
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>

            <Input
              label="Libellé"
              value={line.libelle}
              onChangeText={(v) => updateLine(line.id, 'libelle', v)}
              placeholder="Description de la dépense"
              editable={isEditable}
            />
            <Input
              label="Montant"
              value={line.montant}
              onChangeText={(v) => updateLine(line.id, 'montant', v)}
              placeholder="0"
              keyboardType="decimal-pad"
              editable={isEditable}
            />

            {/* Justificatif thumbnail */}
            <TouchableOpacity
              style={[
                st.justifThumb,
                {
                  backgroundColor: line.hasJustificatif
                    ? colors.primaryTint
                    : isDark ? colors.surface : colors.borderLight,
                  borderColor: line.hasJustificatif ? colors.primary : colors.border,
                },
              ]}
            >
              <FileText
                size={16}
                color={line.hasJustificatif ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  st.justifThumbText,
                  { color: line.hasJustificatif ? colors.primary : colors.textMuted },
                ]}
              >
                {line.hasJustificatif ? 'Justificatif ajouté' : 'Ajouter un justificatif'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Line Button */}
        {isEditable && (
          <TouchableOpacity
            onPress={addLine}
            style={[st.addLineBtn, { borderColor: colors.primary }]}
            activeOpacity={0.7}
          >
            <Plus size={18} color={colors.primary} />
            <Text style={[st.addLineText, { color: colors.primary }]}>Ajouter une ligne</Text>
          </TouchableOpacity>
        )}

        {/* Progress Section */}
        <SectionHeader title="Progression" />
        <View style={[st.progressCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={st.progressHeader}>
            <Text style={[st.progressLabel, { color: colors.textMuted }]}>Total justifié</Text>
            <Text style={[st.progressValue, { color: colors.text }]}>
              {formatMontant(totalJustifie)}{montantRecu > 0 ? ` / ${formatMontant(montantRecu)}` : ''}
            </Text>
          </View>
          <ProgressBar
            progress={progressRatio}
            color={progressRatio >= 1 ? colors.primary : colors.warning}
            trackColor={isDark ? '#1e3a31' : colors.borderLight}
          />
          <Text style={[st.progressPct, { color: colors.textMuted }]}>
            {(progressRatio * 100).toFixed(0)}% justifié
          </Text>
        </View>

        {/* Action Buttons */}
        {isEditable && (
          <>
            <Button
              title="Soumettre le compte-rendu"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              size="lg"
              style={st.submitBtn}
              icon={<Send size={18} color="#fff" />}
            />
            <Button
              title="Enregistrer en brouillon"
              onPress={handleSaveDraft}
              loading={submitting}
              disabled={submitting}
              variant="outline"
              size="lg"
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Reference Card
  refCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  refHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.smd,
  },
  refCode: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  refDivider: {
    height: 1,
    marginBottom: spacing.smd,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  refLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  refValue: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },

  // Line Card
  lineCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.smd,
  },
  lineNumber: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  removeBtn: {
    padding: spacing.xs,
  },

  // Justificatif thumbnail
  justifThumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  justifThumbText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
  },

  // Add Line
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  addLineText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },

  // Progress
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  progressValue: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  progressPct: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'right',
  },

  // Submit
  submitBtn: {
    marginTop: spacing.sm,
  },
});
