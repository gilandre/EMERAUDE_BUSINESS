import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Activity } from 'lucide-react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DatePickerInput } from '../components/DatePickerInput';
import { SectionHeader } from '../components/SectionHeader';
import { colors, typography, spacing } from '../theme';
import { createActivite } from '../api/activites';

const TYPES = ['MISSION', 'EVENEMENT', 'PROJET', 'FORMATION', 'FONCTIONNEMENT', 'AUTRE'] as const;
const DEVISES = ['XOF', 'EUR', 'USD'];

export function CreateActiviteScreen() {
  const navigation = useNavigation<any>();
  const [libelle, setLibelle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('AUTRE');
  const [budget, setBudget] = useState('');
  const [deviseCode, setDeviseCode] = useState('XOF');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!libelle.trim()) {
      Alert.alert('Erreur', 'Le libellé est requis');
      return;
    }

    const budgetNum = budget ? parseFloat(budget.replace(/\s/g, '').replace(',', '.')) : undefined;
    if (budgetNum !== undefined && (isNaN(budgetNum) || budgetNum < 0)) {
      Alert.alert('Erreur', 'Le budget doit être un nombre positif ou nul');
      return;
    }

    if (dateDebut && dateFin && new Date(dateFin) < new Date(dateDebut)) {
      Alert.alert('Erreur', 'La date de fin doit être postérieure à la date de début');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createActivite({
        libelle: libelle.trim(),
        description: description.trim() || undefined,
        type,
        budgetPrevisionnel: budgetNum,
        deviseCode: deviseCode || 'XOF',
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      });
      Alert.alert('Succès', `Activité "${result.libelle}" créée`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Activity size={24} color={colors.primary} />
          <View>
            <Text style={styles.bannerTitle}>Emeraude Business</Text>
            <Text style={styles.bannerSubtitle}>Nouvelle activité</Text>
          </View>
        </View>

        {/* Identification */}
        <SectionHeader title="Identification" />
        <Card>
          <Input
            label="Libellé *"
            value={libelle}
            onChangeText={setLibelle}
            placeholder="Nom de l'activité"
          />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Description de l'activité"
            multiline
          />
        </Card>

        {/* Type */}
        <SectionHeader title="Type d'activité" />
        <Card>
          <View style={styles.typeGrid}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[styles.typeBtn, type === t && styles.typeActive]}
              >
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Budget */}
        <SectionHeader title="Budget" />
        <Card>
          <Input
            label="Budget prévisionnel (optionnel)"
            value={budget}
            onChangeText={setBudget}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          <Text style={styles.fieldLabel}>DEVISE</Text>
          <View style={styles.segmented}>
            {DEVISES.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDeviseCode(d)}
                style={[styles.segmentBtn, deviseCode === d && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, deviseCode === d && styles.segmentTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Calendrier */}
        <SectionHeader title="Calendrier" />
        <Card>
          <DatePickerInput
            label="Date de début"
            value={dateDebut}
            onChange={setDateDebut}
          />
          <DatePickerInput
            label="Date de fin"
            value={dateFin}
            onChange={setDateFin}
          />
        </Card>

        <Button
          title="Créer l'activité"
          onPress={handleCreate}
          loading={submitting}
          disabled={submitting}
          size="lg"
          style={styles.createBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.smd,
    marginBottom: spacing.sm,
  },
  bannerTitle: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.primary,
  },
  bannerSubtitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },

  fieldLabel: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
  },

  // Type grid (2 rows x 3 cols)
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeBtn: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.smd,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
  },
  typeActive: {
    backgroundColor: colors.primary,
  },
  typeText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  typeTextActive: {
    color: '#fff',
    fontFamily: typography.fontFamily.semibold,
  },

  // Segmented
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
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
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: '#fff',
    fontFamily: typography.fontFamily.semibold,
  },

  createBtn: {
    marginTop: spacing.lg,
  },
});
