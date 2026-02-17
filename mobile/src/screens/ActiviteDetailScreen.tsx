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
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useRoute, RouteProp } from '@react-navigation/native';
import {
  Calendar,
  Flag,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Plus,
  UserCircle,
} from 'lucide-react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DatePickerInput } from '../components/DatePickerInput';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { SectionHeader } from '../components/SectionHeader';
import { colors, typography, spacing } from '../theme';
import {
  getActivite,
  getMouvements,
  createMouvement,
  type Activite,
  type MouvementActivite,
} from '../api/activites';
import { formatMontant, formatTimeAgo } from '../utils/format';
import { ErrorState } from '../components/ErrorState';

type NavParams = { ActiviteDetail: { id: string } };
type Section = 'apercu' | 'entrees' | 'sorties';

const TYPE_COLORS: Record<string, string> = {
  MISSION: '#3b82f6',
  EVENEMENT: '#8b5cf6',
  PROJET: '#10b77f',
  FORMATION: '#f59e0b',
  FONCTIONNEMENT: '#6b7280',
  AUTRE: '#64748b',
};

const STATUT_VARIANTS: Record<string, 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  CLOTUREE: 'neutral',
  ARCHIVEE: 'warning',
};

const MODE_PAIEMENT_OPTIONS = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

export function ActiviteDetailScreen() {
  const route = useRoute<RouteProp<NavParams, 'ActiviteDetail'>>();
  const id = route.params?.id ?? '';
  const [data, setData] = useState<Activite | null>(null);
  const [mouvements, setMouvements] = useState<MouvementActivite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState<Section>('apercu');
  const [error, setError] = useState(false);

  // Entrée form
  const [entMontant, setEntMontant] = useState('');
  const [entDate, setEntDate] = useState(new Date().toISOString().slice(0, 10));
  const [entCategorie, setEntCategorie] = useState('');
  const [entRef, setEntRef] = useState('');
  const [entDesc, setEntDesc] = useState('');
  const [entModePaiement, setEntModePaiement] = useState('');
  const [entSubmitting, setEntSubmitting] = useState(false);
  const [showEntForm, setShowEntForm] = useState(false);

  // Sortie form
  const [sorMontant, setSorMontant] = useState('');
  const [sorDate, setSorDate] = useState(new Date().toISOString().slice(0, 10));
  const [sorBeneficiaire, setSorBeneficiaire] = useState('');
  const [sorMotif, setSorMotif] = useState('');
  const [sorCategorie, setSorCategorie] = useState('');
  const [sorRef, setSorRef] = useState('');
  const [sorDesc, setSorDesc] = useState('');
  const [sorModePaiement, setSorModePaiement] = useState('');
  const [sorSubmitting, setSorSubmitting] = useState(false);
  const [showSorForm, setShowSorForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [activite, mvts] = await Promise.all([
        getActivite(id),
        getMouvements(id, new URLSearchParams({ pageSize: '50', sortBy: 'dateMouvement', sortOrder: 'desc' })),
      ]);
      setData(activite);
      setMouvements(mvts.data);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const fmtMontant = (n: number, devise = 'XOF') => formatMontant(n, devise);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const isActive = data?.statut === 'ACTIVE';

  const handleAddEntree = async () => {
    const montant = parseFloat(entMontant.replace(/\s/g, '').replace(',', '.'));
    if (!montant || montant <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    setEntSubmitting(true);
    try {
      await createMouvement(id, {
        sens: 'ENTREE',
        montant,
        dateMouvement: entDate,
        categorie: entCategorie || undefined,
        reference: entRef || undefined,
        description: entDesc || undefined,
        modePaiement: entModePaiement || undefined,
      });
      setEntMontant('');
      setEntCategorie('');
      setEntRef('');
      setEntDesc('');
      setEntModePaiement('');
      load();
      Alert.alert('Succès', 'Entrée enregistrée.');
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setEntSubmitting(false);
    }
  };

  const handleAddSortie = async () => {
    const montant = parseFloat(sorMontant.replace(/\s/g, '').replace(',', '.'));
    if (!montant || montant <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    setSorSubmitting(true);
    try {
      await createMouvement(id, {
        sens: 'SORTIE',
        montant,
        dateMouvement: sorDate,
        beneficiaire: sorBeneficiaire || undefined,
        motif: sorMotif || undefined,
        categorie: sorCategorie || undefined,
        reference: sorRef || undefined,
        description: sorDesc || undefined,
        modePaiement: sorModePaiement || undefined,
      });
      setSorMontant('');
      setSorBeneficiaire('');
      setSorMotif('');
      setSorCategorie('');
      setSorRef('');
      setSorDesc('');
      setSorModePaiement('');
      load();
      Alert.alert('Succès', 'Sortie enregistrée.');
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setSorSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) return <ErrorState onRetry={load} />;

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Activité introuvable</Text>
      </View>
    );
  }

  const entrees = mouvements.filter((m) => m.sens === 'ENTREE');
  const sorties = mouvements.filter((m) => m.sens === 'SORTIE');
  const derniersMouvements = [...mouvements]
    .sort((a, b) => new Date(b.dateMouvement).getTime() - new Date(a.dateMouvement).getTime())
    .slice(0, 5);

  const budgetProgress = data.budgetPrevisionnel && data.budgetPrevisionnel > 0
    ? Math.min(1, data.totalSorties / data.budgetPrevisionnel)
    : null;

  const sections: { key: Section; label: string }[] = [
    { key: 'apercu', label: 'Aperçu' },
    { key: 'entrees', label: 'Entrées' },
    { key: 'sorties', label: 'Sorties' },
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
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.libelle}>{data.libelle}</Text>
          <Badge label={data.statut} variant={STATUT_VARIANTS[data.statut] ?? 'neutral'} />
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.code}>{data.code}</Text>
          <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[data.type] ?? TYPE_COLORS.AUTRE) + '20' }]}>
            <Text style={[styles.typeBadgeText, { color: TYPE_COLORS[data.type] ?? TYPE_COLORS.AUTRE }]}>
              {data.type}
            </Text>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmented}>
          {sections.map((s) => (
            <TouchableOpacity
              key={s.key}
              onPress={() => setSection(s.key)}
              style={[styles.segmentBtn, section === s.key && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, section === s.key && styles.segmentTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ════ Aperçu Tab ════ */}
        {section === 'apercu' && (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              <Card style={styles.kpiCard}>
                <ArrowDownLeft size={18} color={colors.primary} />
                <Text style={styles.kpiLabel}>Total Entrées</Text>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  {fmtMontant(data.totalEntrees, data.deviseCode)}
                </Text>
              </Card>
              <Card style={styles.kpiCard}>
                <ArrowUpRight size={18} color={colors.warning} />
                <Text style={styles.kpiLabel}>Total Sorties</Text>
                <Text style={[styles.kpiValue, { color: colors.warning }]}>
                  {fmtMontant(data.totalSorties, data.deviseCode)}
                </Text>
              </Card>
            </View>
            <Card>
              <Text style={styles.cardLabel}>Solde</Text>
              <Text style={[styles.heroMontant, { color: data.solde >= 0 ? colors.primary : colors.error }]}>
                {fmtMontant(data.solde, data.deviseCode)}
              </Text>
            </Card>

            {/* Budget progress */}
            {budgetProgress !== null && data.budgetPrevisionnel && (
              <Card>
                <Text style={styles.cardLabel}>Budget prévisionnel</Text>
                <View style={styles.progressSection}>
                  <ProgressBar progress={budgetProgress} />
                  <View style={styles.budgetRow}>
                    <Text style={styles.budgetText}>
                      {fmtMontant(data.totalSorties, data.deviseCode)} dépensé
                    </Text>
                    <Text style={styles.budgetText}>
                      sur {fmtMontant(data.budgetPrevisionnel, data.deviseCode)}
                    </Text>
                  </View>
                  <Text style={styles.budgetPercent}>
                    {(budgetProgress * 100).toFixed(0)}% consommé
                  </Text>
                </View>
              </Card>
            )}

            {/* Infos */}
            <Card>
              <Text style={styles.cardLabel}>Informations</Text>
              <Text style={styles.infoRow}>Code : {data.code}</Text>
              <Text style={styles.infoRow}>Type : {data.type}</Text>
              <Text style={styles.infoRow}>Statut : {data.statut}</Text>
              <Text style={styles.infoRow}>Devise : {data.deviseCode}</Text>
              <View style={styles.dateRow}>
                <Calendar size={16} color={colors.primary} />
                <Text style={styles.dateText}>Début : {formatDate(data.dateDebut ?? null)}</Text>
              </View>
              <View style={styles.dateRow}>
                <Flag size={16} color={colors.warning} />
                <Text style={styles.dateText}>Fin : {formatDate(data.dateFin ?? null)}</Text>
              </View>
              {data.responsable && (
                <View style={styles.dateRow}>
                  <UserCircle size={16} color={colors.primary} />
                  <Text style={styles.dateText}>{data.responsable.name}</Text>
                </View>
              )}
            </Card>

            {/* Derniers mouvements */}
            {derniersMouvements.length > 0 && (
              <Card>
                <View style={styles.mouvementsHeader}>
                  <Text style={[styles.cardLabel, { marginBottom: 0 }]}>Derniers Mouvements</Text>
                  <TouchableOpacity onPress={() => setSection('entrees')}>
                    <Text style={styles.toutVoirLink}>Tout voir</Text>
                  </TouchableOpacity>
                </View>
                {derniersMouvements.map((mv, idx) => {
                  const isEntree = mv.sens === 'ENTREE';
                  return (
                    <View
                      key={mv.id}
                      style={[
                        styles.mouvementRow,
                        idx < derniersMouvements.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.borderLight,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.txIconCircle,
                          {
                            backgroundColor: isEntree
                              ? 'rgba(16,183,127,0.1)'
                              : 'rgba(245,158,11,0.1)',
                          },
                        ]}
                      >
                        {isEntree ? (
                          <ArrowDownLeft size={16} color={colors.primary} />
                        ) : (
                          <ArrowUpRight size={16} color={colors.warning} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.mouvementTitleRow}>
                          <Text style={styles.mouvementLabel} numberOfLines={1}>
                            {mv.categorie || mv.reference || mv.beneficiaire || (isEntree ? 'Entrée' : 'Sortie')}
                          </Text>
                          <Badge
                            label={isEntree ? 'Entrée' : 'Sortie'}
                            variant={isEntree ? 'success' : 'warning'}
                          />
                        </View>
                        <Text style={styles.mouvementTime}>
                          {formatTimeAgo(mv.dateMouvement)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.mouvementAmount,
                          { color: isEntree ? colors.primary : colors.warning },
                        ]}
                      >
                        {isEntree ? '+' : '-'}{fmtMontant(mv.montant, data.deviseCode)}
                      </Text>
                    </View>
                  );
                })}
              </Card>
            )}
          </>
        )}

        {/* ════ Entrées Tab ════ */}
        {section === 'entrees' && (
          <>
            <SectionHeader title="Entrées" />
            {entrees.length === 0 ? (
              <Text style={styles.emptyList}>Aucune entrée</Text>
            ) : (
              entrees.map((mv) => (
                <Card key={mv.id}>
                  <View style={styles.txRow}>
                    <View style={[styles.txIconCircle, { backgroundColor: 'rgba(16,183,127,0.1)' }]}>
                      <ArrowDownLeft size={18} color={colors.primary} />
                    </View>
                    <View style={styles.txContent}>
                      <Text style={styles.txMontant}>{fmtMontant(mv.montant, data.deviseCode)}</Text>
                      <Text style={styles.txDate}>{formatDate(mv.dateMouvement)}</Text>
                      {mv.categorie ? <Text style={styles.txRef}>{mv.categorie}</Text> : null}
                      {mv.reference ? <Text style={styles.txRef}>Réf: {mv.reference}</Text> : null}
                    </View>
                  </View>
                </Card>
              ))
            )}

            {/* Collapsible form */}
            {isActive && (
              <>
                <TouchableOpacity
                  style={styles.addFormToggle}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowEntForm(!showEntForm);
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color={colors.primary} />
                  <Text style={styles.addFormToggleText}>Nouvelle entrée</Text>
                  {showEntForm ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
                </TouchableOpacity>

                {showEntForm && (
                  <Card>
                    <Input
                      label="Montant *"
                      value={entMontant}
                      onChangeText={setEntMontant}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                    <DatePickerInput
                      label="Date"
                      value={entDate}
                      onChange={setEntDate}
                    />
                    <Input label="Catégorie" value={entCategorie} onChangeText={setEntCategorie} placeholder="Ex: Subvention" />
                    <Input label="Référence" value={entRef} onChangeText={setEntRef} />
                    <Input label="Description" value={entDesc} onChangeText={setEntDesc} />

                    <Text style={styles.fieldLabel}>MODE DE PAIEMENT</Text>
                    <View style={styles.segmentedSmall}>
                      {MODE_PAIEMENT_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setEntModePaiement(entModePaiement === opt.value ? '' : opt.value)}
                          style={[styles.segmentSmallBtn, entModePaiement === opt.value && styles.segmentSmallActive]}
                        >
                          <Text style={[styles.segmentSmallText, entModePaiement === opt.value && styles.segmentSmallTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Button
                      title="Enregistrer l'entrée"
                      onPress={handleAddEntree}
                      loading={entSubmitting}
                      disabled={entSubmitting}
                    />
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* ════ Sorties Tab ════ */}
        {section === 'sorties' && (
          <>
            <SectionHeader title="Sorties" />
            {sorties.length === 0 ? (
              <Text style={styles.emptyList}>Aucune sortie</Text>
            ) : (
              sorties.map((mv) => (
                <Card key={mv.id}>
                  <View style={styles.txRow}>
                    <View style={[styles.txIconCircle, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                      <ArrowUpRight size={18} color={colors.warning} />
                    </View>
                    <View style={styles.txContent}>
                      <Text style={styles.txMontant}>{fmtMontant(mv.montant, data.deviseCode)}</Text>
                      {mv.beneficiaire ? <Text style={styles.txBenef}>{mv.beneficiaire}</Text> : null}
                      {mv.motif ? <Text style={styles.txMotif}>{mv.motif}</Text> : null}
                      <Text style={styles.txDate}>{formatDate(mv.dateMouvement)}</Text>
                      {mv.categorie ? <Text style={styles.txRef}>{mv.categorie}</Text> : null}
                    </View>
                  </View>
                </Card>
              ))
            )}

            {/* Collapsible form */}
            {isActive && (
              <>
                <TouchableOpacity
                  style={styles.addFormToggle}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowSorForm(!showSorForm);
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color={colors.primary} />
                  <Text style={styles.addFormToggleText}>Nouvelle sortie</Text>
                  {showSorForm ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
                </TouchableOpacity>

                {showSorForm && (
                  <Card>
                    <Input
                      label="Montant *"
                      value={sorMontant}
                      onChangeText={setSorMontant}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                    <Input
                      label="Bénéficiaire"
                      value={sorBeneficiaire}
                      onChangeText={setSorBeneficiaire}
                      placeholder="Nom du bénéficiaire"
                    />
                    <Input
                      label="Motif"
                      value={sorMotif}
                      onChangeText={setSorMotif}
                      placeholder="Raison de la sortie"
                    />
                    <DatePickerInput
                      label="Date"
                      value={sorDate}
                      onChange={setSorDate}
                    />
                    <Input label="Catégorie" value={sorCategorie} onChangeText={setSorCategorie} placeholder="Ex: Fournitures" />
                    <Input label="Référence" value={sorRef} onChangeText={setSorRef} />
                    <Input label="Description" value={sorDesc} onChangeText={setSorDesc} />

                    <Text style={styles.fieldLabel}>MODE DE PAIEMENT</Text>
                    <View style={styles.segmentedSmall}>
                      {MODE_PAIEMENT_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setSorModePaiement(sorModePaiement === opt.value ? '' : opt.value)}
                          style={[styles.segmentSmallBtn, sorModePaiement === opt.value && styles.segmentSmallActive]}
                        >
                          <Text style={[styles.segmentSmallText, sorModePaiement === opt.value && styles.segmentSmallTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Button
                      title="Enregistrer la sortie"
                      onPress={handleAddSortie}
                      loading={sorSubmitting}
                      disabled={sorSubmitting}
                    />
                  </Card>
                )}
              </>
            )}
          </>
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
  errorText: { color: colors.error, fontFamily: typography.fontFamily.regular },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  libelle: {
    flex: 1,
    fontSize: typography.fontSizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  code: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as '600',
  },

  // Segmented Control
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.smd,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.text,
    fontFamily: typography.fontFamily.semibold,
  },

  // KPIs
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    gap: spacing.xs,
  },
  kpiLabel: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  kpiValue: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
  },

  // Aperçu
  cardLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  heroMontant: {
    fontSize: typography.fontSizes.hero,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
  },
  progressSection: {
    gap: spacing.xs,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  budgetText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  budgetPercent: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },

  // Info
  infoRow: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  dateText: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text,
  },

  // Mouvements
  mouvementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.smd,
  },
  toutVoirLink: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    color: colors.primary,
  },
  mouvementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.smd,
  },
  mouvementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mouvementLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
    flex: 1,
  },
  mouvementTime: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  mouvementAmount: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },

  // Transaction rows
  txRow: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  txIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContent: { flex: 1 },
  txMontant: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as '600',
    color: colors.text,
  },
  txBenef: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  txMotif: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text,
    marginTop: spacing.xs,
  },
  txDate: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  txRef: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  emptyList: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Collapsible form toggle
  addFormToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryTint,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,183,127,0.2)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  addFormToggleText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as '600',
    color: colors.primary,
  },

  // Form fields
  fieldLabel: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 1.2,
  },
  segmentedSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    padding: spacing.xs,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  segmentSmallBtn: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  segmentSmallActive: {
    backgroundColor: colors.primary,
  },
  segmentSmallText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  segmentSmallTextActive: {
    color: '#fff',
    fontFamily: typography.fontFamily.semibold,
  },

  bottomPad: { height: spacing.xxl },
});
