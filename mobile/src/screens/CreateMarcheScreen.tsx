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
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Briefcase } from 'lucide-react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DatePickerInput } from '../components/DatePickerInput';
import { SectionHeader } from '../components/SectionHeader';
import { colors, typography, spacing } from '../theme';
import { createMarche } from '../api/marches';

export function CreateMarcheScreen() {
  const navigation = useNavigation<any>();
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState('');
  const [deviseCode, setDeviseCode] = useState('XOF');
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10));
  const [dateFin, setDateFin] = useState('');
  const [prefinancement, setPrefinancement] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!libelle.trim()) {
      Alert.alert('Erreur', 'Le libellé est requis');
      return;
    }
    const montantNum = parseFloat(montant.replace(/\s/g, '').replace(',', '.'));
    if (!montantNum || montantNum <= 0) {
      Alert.alert('Erreur', 'Le montant doit être supérieur à 0');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createMarche({
        libelle: libelle.trim(),
        montant: montantNum,
        deviseCode: deviseCode || 'XOF',
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      });
      Alert.alert('Succès', `Marché "${result.libelle}" créé (${result.code})`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const devises = ['XOF', 'EUR', 'USD'];

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
          <Briefcase size={24} color={colors.primary} />
          <View>
            <Text style={styles.bannerTitle}>Emeraude Business</Text>
            <Text style={styles.bannerSubtitle}>Nouveau marché</Text>
          </View>
        </View>

        {/* Identification */}
        <SectionHeader title="Identification" />
        <Card>
          <Input
            label="Libellé *"
            value={libelle}
            onChangeText={setLibelle}
            placeholder="Nom du marché"
          />
          <Input
            label="Montant *"
            value={montant}
            onChangeText={setMontant}
            placeholder="0"
            keyboardType="decimal-pad"
          />
        </Card>

        {/* Économie */}
        <SectionHeader title="Économie" />
        <Card>
          <Text style={styles.fieldLabel}>DEVISE</Text>
          <View style={styles.segmented}>
            {devises.map((d) => (
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

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Pré-financement</Text>
              <Text style={styles.toggleDesc}>Activer le préfinancement pour ce marché</Text>
            </View>
            <Switch
              value={prefinancement}
              onValueChange={setPrefinancement}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={prefinancement ? colors.primary : '#f4f3f4'}
            />
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
          title="Créer le marché"
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
  bannerIcon: { fontSize: 28 },
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

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: { flex: 1, marginRight: spacing.md },
  toggleLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  toggleDesc: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },

  createBtn: {
    marginTop: spacing.lg,
  },
});
