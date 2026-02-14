import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DatePickerInput } from '../components/DatePickerInput';
import { colors, typography, spacing } from '../theme';
import { createMarche } from '../api/marches';

export function CreateMarcheScreen() {
  const navigation = useNavigation<{ navigate: (s: string, p?: { id: string }) => void; goBack: () => void }>();
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState('');
  const [deviseCode, setDeviseCode] = useState('XOF');
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10));
  const [dateFin, setDateFin] = useState('');
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
        <Text style={styles.title}>Nouveau marché</Text>

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

          <Text style={styles.fieldLabel}>Devise</Text>
          <View style={styles.deviseRow}>
            {devises.map((d) => (
              <Button
                key={d}
                title={d}
                variant={deviseCode === d ? 'primary' : 'outline'}
                onPress={() => setDeviseCode(d)}
                style={styles.deviseBtn}
              />
            ))}
          </View>

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

          <Button
            title="Créer le marché"
            onPress={handleCreate}
            loading={submitting}
            disabled={submitting}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  deviseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  deviseBtn: {
    flex: 1,
  },
});
