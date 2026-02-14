import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DatePickerInput } from '../components/DatePickerInput';
import { colors, typography, spacing } from '../theme';
import {
  getMarche,
  createAccompte,
  createDecaissement,
  createOrUpdatePrefinancement,
  type MarcheDetail,
  type Accompte,
  type Decaissement,
} from '../api/marches';

type NavParams = { MarcheDetail: { id: string } };
type Section = 'vue-ensemble' | 'accomptes' | 'decaissements' | 'prefinancement' | 'pieces';

const SOURCE_LABELS: Record<string, string> = {
  TRESORERIE: 'Trésorerie',
  PREFINANCEMENT: 'Préfinancement',
};

const MODE_PAIEMENT_OPTIONS = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

export function MarcheDetailScreen() {
  const route = useRoute<RouteProp<NavParams, 'MarcheDetail'>>();
  const id = route.params?.id ?? '';
  const [data, setData] = useState<MarcheDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState<Section>('vue-ensemble');

  // Accompte form states
  const [accompteMontant, setAccompteMontant] = useState('');
  const [accompteDate, setAccompteDate] = useState(new Date().toISOString().slice(0, 10));
  const [accompteRef, setAccompteRef] = useState('');
  const [accompteDesc, setAccompteDesc] = useState('');
  const [accompteSubmitting, setAccompteSubmitting] = useState(false);

  // Decaissement form states
  const [decMontant, setDecMontant] = useState('');
  const [decDate, setDecDate] = useState(new Date().toISOString().slice(0, 10));
  const [decRef, setDecRef] = useState('');
  const [decDesc, setDecDesc] = useState('');
  const [decMotif, setDecMotif] = useState('');
  const [decBeneficiaire, setDecBeneficiaire] = useState('');
  const [decModePaiement, setDecModePaiement] = useState('');
  const [decSource, setDecSource] = useState<'TRESORERIE' | 'PREFINANCEMENT'>('TRESORERIE');
  const [decSubmitting, setDecSubmitting] = useState(false);

  // Prefinancement form states
  const [prefMontant, setPrefMontant] = useState('');
  const [prefSubmitting, setPrefSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getMarche(id);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const formatMontant = (n: number, devise = 'XOF') => {
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
    return `${fmt} ${devise === 'XOF' ? 'FCFA' : devise}`;
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const getStatutColor = (s: string) => {
    if (s === 'actif') return colors.success;
    if (s === 'termine') return colors.textSecondary;
    return colors.warning;
  };

  const handleEncaisserAccompte = async () => {
    const montant = parseFloat(accompteMontant.replace(/\s/g, '').replace(',', '.'));
    if (!montant || montant <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    setAccompteSubmitting(true);
    try {
      await createAccompte({
        marcheId: id,
        montant,
        dateEncaissement: accompteDate,
        reference: accompteRef || undefined,
        description: accompteDesc || undefined,
      });
      setAccompteMontant('');
      setAccompteRef('');
      setAccompteDesc('');
      load();
      Alert.alert('Succès', 'Accompte enregistré.');
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setAccompteSubmitting(false);
    }
  };

  const handleDecaisser = async () => {
    const montant = parseFloat(decMontant.replace(/\s/g, '').replace(',', '.'));
    if (!montant || montant <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    if (!decMotif.trim()) {
      Alert.alert('Erreur', 'Le motif est requis');
      return;
    }
    if (!decBeneficiaire.trim()) {
      Alert.alert('Erreur', 'Le bénéficiaire est requis');
      return;
    }
    const syn = data?.synthese;
    const soldeDispo = (syn?.solde ?? 0) + (syn?.prefinancementMax ?? 0) - (syn?.prefinancementUtilise ?? 0);
    if (montant > soldeDispo) {
      Alert.alert('Erreur', `Trésorerie insuffisante. Disponible: ${formatMontant(soldeDispo, data?.deviseCode)}`);
      return;
    }
    setDecSubmitting(true);
    try {
      await createDecaissement({
        marcheId: id,
        montant,
        dateDecaissement: decDate,
        statut: 'VALIDE',
        reference: decRef || undefined,
        description: decDesc || undefined,
        motif: decMotif.trim(),
        beneficiaire: decBeneficiaire.trim(),
        modePaiement: decModePaiement || undefined,
        source: decSource,
      });
      setDecMontant('');
      setDecRef('');
      setDecDesc('');
      setDecMotif('');
      setDecBeneficiaire('');
      setDecModePaiement('');
      setDecSource('TRESORERIE');
      load();
      Alert.alert('Succès', 'Décaissement enregistré.');
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setDecSubmitting(false);
    }
  };

  const handlePrefinancement = async () => {
    const montant = parseFloat(prefMontant.replace(/\s/g, '').replace(',', '.'));
    if (montant === undefined || montant < 0) {
      Alert.alert('Erreur', 'Plafond invalide');
      return;
    }
    setPrefSubmitting(true);
    try {
      await createOrUpdatePrefinancement({ marcheId: id, montant, active: true });
      setPrefMontant('');
      load();
      Alert.alert('Succès', 'Préfinancement enregistré ou mis à jour.');
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setPrefSubmitting(false);
    }
  };

  const showPiecesInfo = () => {
    Alert.alert(
      'Pièces justificatives',
      'Vous pourrez bientôt ajouter des pièces (photo, vidéo ou fichier) depuis cette section.',
      [{ text: 'OK' }]
    );
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Marché introuvable</Text>
      </View>
    );
  }

  const syn = data.synthese ?? {};
  const soldeDisponible = (syn.solde ?? 0) + (syn.prefinancementMax ?? 0) - (syn.prefinancementUtilise ?? 0);
  const sections: { key: Section; label: string }[] = [
    { key: 'vue-ensemble', label: 'Vue d\'ensemble' },
    { key: 'accomptes', label: 'Encaisser' },
    { key: 'decaissements', label: 'Décaisser' },
    { key: 'prefinancement', label: 'Préfinancement' },
    { key: 'pieces', label: 'Pièces' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
        <Text style={styles.libelle}>{data.libelle}</Text>
        <View style={[styles.statutBadge, { backgroundColor: getStatutColor(data.statut) + '20' }]}>
          <Text style={[styles.statutText, { color: getStatutColor(data.statut) }]}>
            {data.statut}
          </Text>
        </View>
      </View>
      <Text style={styles.code}>{data.code}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {sections.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setSection(s.key)}
            style={[styles.tab, section === s.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, section === s.key && styles.tabTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {section === 'vue-ensemble' && (
        <>
          <Card>
            <Text style={styles.cardLabel}>Montant total</Text>
            <Text style={styles.montant}>
              {formatMontant(data.montantTotalXOF ?? data.montantTotal ?? 0, data.deviseCode)}
            </Text>
          </Card>
          <Card>
            <Text style={styles.cardLabel}>Dates</Text>
            <Text style={styles.dateText}>Début : {formatDate(data.dateDebut)}</Text>
            <Text style={styles.dateText}>Fin : {formatDate(data.dateFin)}</Text>
          </Card>
          <Card>
            <Text style={styles.cardLabel}>Synthèse</Text>
            <Text style={styles.synRow}>
              Encaissements : {formatMontant(syn.totalEncaissementsXOF ?? syn.totalEncaissements ?? 0)}
            </Text>
            <Text style={styles.synRow}>
              Décaissements : {formatMontant(syn.totalDecaissementsXOF ?? syn.totalDecaissements ?? 0)}
            </Text>
            <Text style={[styles.synRow, styles.solde]}>
              Solde : {formatMontant(syn.soldeXOF ?? syn.solde ?? 0)}
            </Text>
            {((syn.prefinancementMax ?? 0) > 0) && (
              <Text style={styles.synRow}>
                Préfinancement (plafond) : {formatMontant(syn.prefinancementMax ?? 0)}
              </Text>
            )}
          </Card>
        </>
      )}

      {section === 'accomptes' && (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Encaisser un accompte</Text>
            <Input
              label="Montant *"
              value={accompteMontant}
              onChangeText={setAccompteMontant}
              placeholder="0"
              keyboardType="decimal-pad"
            />
            <DatePickerInput
              label="Date d'encaissement"
              value={accompteDate}
              onChange={setAccompteDate}
            />
            <Input label="Référence (optionnel)" value={accompteRef} onChangeText={setAccompteRef} />
            <Input label="Description (optionnel)" value={accompteDesc} onChangeText={setAccompteDesc} />
            <Button
              title="Enregistrer l'accompte"
              onPress={handleEncaisserAccompte}
              loading={accompteSubmitting}
              disabled={accompteSubmitting}
            />
          </Card>
          <Text style={styles.listTitle}>Derniers accomptes</Text>
          {(data.accomptes ?? []).slice(0, 10).map((a: Accompte) => (
            <Card key={a.id}>
              <Text style={styles.rowMontant}>{formatMontant(a.montant, data.deviseCode)}</Text>
              <Text style={styles.rowDate}>{formatDate(a.dateEncaissement)}</Text>
              {a.reference ? <Text style={styles.rowRef}>{a.reference}</Text> : null}
            </Card>
          ))}
          {(!data.accomptes || data.accomptes.length === 0) && (
            <Text style={styles.emptyList}>Aucun accompte</Text>
          )}
        </>
      )}

      {section === 'decaissements' && (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Décaisser</Text>
            <Text style={styles.hint}>Disponible : {formatMontant(soldeDisponible, data.deviseCode)}</Text>
            <Input
              label="Montant *"
              value={decMontant}
              onChangeText={setDecMontant}
              placeholder="0"
              keyboardType="decimal-pad"
            />
            <Input
              label="Bénéficiaire *"
              value={decBeneficiaire}
              onChangeText={setDecBeneficiaire}
              placeholder="Nom du bénéficiaire"
            />
            <Input
              label="Motif *"
              value={decMotif}
              onChangeText={setDecMotif}
              placeholder="Raison du décaissement"
            />

            <Text style={styles.fieldLabel}>Source des fonds</Text>
            <View style={styles.toggleRow}>
              {(['TRESORERIE', 'PREFINANCEMENT'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setDecSource(s)}
                  style={[styles.toggleBtn, decSource === s && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, decSource === s && styles.toggleTextActive]}>
                    {SOURCE_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Mode de paiement</Text>
            <View style={styles.toggleRow}>
              {MODE_PAIEMENT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setDecModePaiement(decModePaiement === opt.value ? '' : opt.value)}
                  style={[styles.toggleBtn, decModePaiement === opt.value && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, decModePaiement === opt.value && styles.toggleTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <DatePickerInput
              label="Date de décaissement"
              value={decDate}
              onChange={setDecDate}
            />
            <Input label="Référence (optionnel)" value={decRef} onChangeText={setDecRef} />
            <Input label="Description (optionnel)" value={decDesc} onChangeText={setDecDesc} />
            <Button
              title="Enregistrer le décaissement"
              onPress={handleDecaisser}
              loading={decSubmitting}
              disabled={decSubmitting}
            />
          </Card>
          <Text style={styles.listTitle}>Derniers décaissements</Text>
          {(data.decaissements ?? []).slice(0, 10).map((d: Decaissement) => (
            <Card key={d.id}>
              <View style={styles.decRow}>
                <Text style={styles.rowMontant}>{formatMontant(d.montant, data.deviseCode)}</Text>
                {d.source && (
                  <View style={[styles.sourceBadge, d.source === 'PREFINANCEMENT' && styles.sourceBadgePrefi]}>
                    <Text style={styles.sourceBadgeText}>
                      {d.source === 'PREFINANCEMENT' ? 'Préfi' : 'Tréso'}
                    </Text>
                  </View>
                )}
              </View>
              {d.beneficiaire ? <Text style={styles.rowBenef}>{d.beneficiaire}</Text> : null}
              {d.motif ? <Text style={styles.rowMotif}>{d.motif}</Text> : null}
              <Text style={styles.rowDate}>{formatDate(d.dateDecaissement)} · {d.statut}</Text>
            </Card>
          ))}
          {(!data.decaissements || data.decaissements.length === 0) && (
            <Text style={styles.emptyList}>Aucun décaissement</Text>
          )}
        </>
      )}

      {section === 'prefinancement' && (
        <>
          {data.prefinancement ? (
            <Card>
              <Text style={styles.cardLabel}>Préfinancement actuel</Text>
              <Text style={styles.montant}>{formatMontant(data.prefinancement.montant, data.deviseCode)}</Text>
              <Text style={styles.synRow}>Utilisé : {formatMontant(data.prefinancement.montantUtilise, data.deviseCode)}</Text>
              <Text style={styles.solde}>Restant : {formatMontant(data.prefinancement.montantRestant, data.deviseCode)}</Text>
            </Card>
          ) : (
            <Card>
              <Text style={styles.cardLabel}>Aucun préfinancement pour ce marché</Text>
            </Card>
          )}
          <Card>
            <Text style={styles.sectionTitle}>Ajouter ou modifier le préfinancement</Text>
            <Input
              label="Plafond (montant autorisé)"
              value={prefMontant}
              onChangeText={setPrefMontant}
              placeholder="0"
              keyboardType="decimal-pad"
            />
            <Button
              title="Enregistrer / Autoriser"
              onPress={handlePrefinancement}
              loading={prefSubmitting}
              disabled={prefSubmitting}
            />
          </Card>
        </>
      )}

      {section === 'pieces' && (
        <Card>
          <Text style={styles.sectionTitle}>Pièces justificatives</Text>
          <Text style={styles.hint}>Ajoutez des preuves (photo, vidéo ou document).</Text>
          <View style={styles.piecesRow}>
            <Button title="Photo" onPress={showPiecesInfo} variant="outline" style={styles.pieceBtn} />
            <Button title="Vidéo" onPress={showPiecesInfo} variant="outline" style={styles.pieceBtn} />
            <Button title="Fichier" onPress={showPiecesInfo} variant="outline" style={styles.pieceBtn} />
          </View>
          <Text style={styles.optionalLabel}>(Optionnel - fonctionnalité à venir)</Text>
        </Card>
      )}

      <View style={styles.bottomPad} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.error },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  libelle: { flex: 1, fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold as '700', color: colors.text },
  statutBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8 },
  statutText: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold as '600' },
  code: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.lg },
  tabs: { marginBottom: spacing.md },
  tabsContent: { gap: spacing.sm, paddingVertical: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 10, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: typography.fontSizes.sm, color: colors.text },
  tabTextActive: { color: '#fff', fontWeight: typography.fontWeights.semibold as '600' },
  cardLabel: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  montant: { fontSize: typography.fontSizes.xxl, fontWeight: typography.fontWeights.bold as '700', color: colors.primary },
  dateText: { fontSize: typography.fontSizes.base, color: colors.text, marginBottom: spacing.xs },
  synRow: { fontSize: typography.fontSizes.base, color: colors.text, marginBottom: spacing.xs },
  solde: { fontWeight: typography.fontWeights.bold as '700', color: colors.success, marginTop: spacing.sm },
  sectionTitle: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.semibold as '600', marginBottom: spacing.sm },
  hint: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  fieldLabel: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium as '500', color: colors.textSecondary, marginBottom: spacing.xs },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  toggleBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontSize: typography.fontSizes.sm, color: colors.text },
  toggleTextActive: { color: '#fff', fontWeight: typography.fontWeights.semibold as '600' },
  listTitle: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.semibold as '600', marginTop: spacing.md, marginBottom: spacing.sm },
  decRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowMontant: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.semibold as '600', color: colors.text },
  rowBenef: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium as '500', color: colors.primary, marginTop: spacing.xs },
  rowMotif: { fontSize: typography.fontSizes.sm, color: colors.text, marginTop: spacing.xs },
  rowDate: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xs },
  rowRef: { fontSize: typography.fontSizes.sm, color: colors.textMuted, marginTop: spacing.xs },
  sourceBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.surface },
  sourceBadgePrefi: { backgroundColor: '#fef3c7' },
  sourceBadgeText: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.medium as '500', color: colors.textSecondary },
  emptyList: { fontSize: typography.fontSizes.sm, color: colors.textMuted, fontStyle: 'italic' },
  piecesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  pieceBtn: { flex: 1, minWidth: 100 },
  optionalLabel: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: spacing.sm },
  bottomPad: { height: spacing.xxl },
});
