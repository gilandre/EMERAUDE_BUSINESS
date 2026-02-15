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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRoute, RouteProp } from '@react-navigation/native';
import {
  Calendar,
  Flag,
  ArrowDownLeft,
  CreditCard,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DatePickerInput } from '../components/DatePickerInput';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { SectionHeader } from '../components/SectionHeader';
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
import { formatMontant as fmtUtil, formatTimeAgo as fmtTimeAgoUtil } from '../utils/format';
import { ErrorState } from '../components/ErrorState';

type NavParams = { MarcheDetail: { id: string } };
type Section = 'apercu' | 'encaissements' | 'decaissements';

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
  const [section, setSection] = useState<Section>('apercu');

  // Accompte form
  const [accompteMontant, setAccompteMontant] = useState('');
  const [accompteDate, setAccompteDate] = useState(new Date().toISOString().slice(0, 10));
  const [accompteRef, setAccompteRef] = useState('');
  const [accompteDesc, setAccompteDesc] = useState('');
  const [accompteSubmitting, setAccompteSubmitting] = useState(false);

  // Decaissement form
  const [decMontant, setDecMontant] = useState('');
  const [decDate, setDecDate] = useState(new Date().toISOString().slice(0, 10));
  const [decRef, setDecRef] = useState('');
  const [decDesc, setDecDesc] = useState('');
  const [decMotif, setDecMotif] = useState('');
  const [decBeneficiaire, setDecBeneficiaire] = useState('');
  const [decModePaiement, setDecModePaiement] = useState('');
  const [decSource, setDecSource] = useState<'TRESORERIE' | 'PREFINANCEMENT'>('TRESORERIE');
  const [decSubmitting, setDecSubmitting] = useState(false);

  // Collapsible form states
  const [showEncForm, setShowEncForm] = useState(false);
  const [showDecForm, setShowDecForm] = useState(false);

  // Prefinancement form
  const [prefMontant, setPrefMontant] = useState('');
  const [prefSubmitting, setPrefSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await getMarche(id);
      setData(res);
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

  const formatMontant = (n: number, devise = 'XOF') => {
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
    return `${fmt} ${devise === 'XOF' ? 'FCFA' : devise}`;
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const formatTimeAgo = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return 'À l\'instant';
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getStatutVariant = (s: string) => {
    if (s === 'actif') return 'success' as const;
    if (s === 'termine') return 'neutral' as const;
    return 'warning' as const;
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
        <Text style={styles.errorText}>Marché introuvable</Text>
      </View>
    );
  }

  const syn = data.synthese ?? {
    totalEncaissements: 0, totalDecaissements: 0,
    totalEncaissementsXOF: 0, totalDecaissementsXOF: 0,
    solde: 0, soldeXOF: 0, prefinancementMax: 0, prefinancementUtilise: 0,
  };
  const soldeDisponible = (syn?.solde ?? 0) + (syn?.prefinancementMax ?? 0) - (syn?.prefinancementUtilise ?? 0);
  const encaissementProgress = (syn?.totalEncaissements ?? 0) / (data.montantTotalXOF ?? data.montantTotal ?? 1);

  const sections: { key: Section; label: string }[] = [
    { key: 'apercu', label: 'Aperçu' },
    { key: 'encaissements', label: 'Encaissements' },
    { key: 'decaissements', label: 'Décaissements' },
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
          <Badge label={data.statut} variant={getStatutVariant(data.statut)} />
        </View>
        <Text style={styles.code}>{data.code}</Text>

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

        {/* Aperçu Tab */}
        {section === 'apercu' && (
          <>
            <Card>
              <Text style={styles.cardLabel}>Montant total</Text>
              <Text style={styles.heroMontant}>
                {formatMontant(data.montantTotalXOF ?? data.montantTotal ?? 0, data.deviseCode)}
              </Text>

              {/* Circular Progress for Treasury Ratio */}
              {(() => {
                const totalMontant = data.montantTotalXOF ?? data.montantTotal ?? 1;
                const ratio = Math.min(1, Math.max(0, (syn.totalEncaissements ?? 0) / totalMontant));
                const svgSize = 140;
                const strokeWidth = 12;
                const radius = (svgSize - strokeWidth) / 2;
                const circumference = 2 * Math.PI * radius;
                return (
                  <View style={{ alignItems: 'center', marginVertical: 16 }}>
                    <Svg width={svgSize} height={svgSize}>
                      <Circle
                        cx={svgSize / 2}
                        cy={svgSize / 2}
                        r={radius}
                        stroke={colors.borderLight}
                        strokeWidth={strokeWidth}
                        fill="none"
                      />
                      <Circle
                        cx={svgSize / 2}
                        cy={svgSize / 2}
                        r={radius}
                        stroke={colors.primary}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={`${circumference}`}
                        strokeDashoffset={circumference * (1 - ratio)}
                        strokeLinecap="round"
                        rotation="-90"
                        origin={`${svgSize / 2}, ${svgSize / 2}`}
                      />
                    </Svg>
                    <Text style={{ position: 'absolute', top: svgSize / 2 - 20, fontSize: 28, fontWeight: '700', color: colors.text }}>
                      {Math.round(ratio * 100)}%
                    </Text>
                    <Text style={{ position: 'absolute', top: svgSize / 2 + 10, fontSize: 12, color: colors.textMuted }}>
                      Ratio Trésorerie
                    </Text>
                  </View>
                );
              })()}

              {/* Restant / Consommé side by side */}
              <View style={styles.sideBySide}>
                <View style={styles.sideBySideItem}>
                  <ArrowDownLeft size={14} color={colors.primary} />
                  <Text style={[styles.sideBySideLabel, { color: colors.textMuted }]}>Restant à encaisser</Text>
                  <Text style={[styles.sideBySideValue, { color: colors.primary }]}>
                    {formatMontant((data.montantTotalXOF ?? data.montantTotal ?? 0) - (syn.totalEncaissements ?? 0))}
                  </Text>
                </View>
                <View style={[styles.sideBySideItem, { borderLeftWidth: 1, borderLeftColor: colors.borderLight }]}>
                  <CreditCard size={14} color={colors.warning} />
                  <Text style={[styles.sideBySideLabel, { color: colors.textMuted }]}>Consommé</Text>
                  <Text style={[styles.sideBySideValue, { color: colors.warning }]}>
                    {formatMontant(syn.totalDecaissementsXOF ?? syn.totalDecaissements ?? 0)}
                  </Text>
                </View>
              </View>
            </Card>

            <Card>
              <Text style={styles.cardLabel}>Dates</Text>
              <View style={styles.dateRow}>
                <Calendar size={16} color={colors.primary} />
                <Text style={styles.dateText}>Début : {formatDate(data.dateDebut)}</Text>
              </View>
              <View style={styles.dateRow}>
                <Flag size={16} color={colors.warning} />
                <Text style={styles.dateText}>Fin : {formatDate(data.dateFin)}</Text>
              </View>
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

            {/* Derniers Mouvements */}
            {(() => {
              const mouvements = [
                ...(data.accomptes ?? []).map((a) => ({
                  id: a.id,
                  type: 'encaissement' as const,
                  label: a.reference || a.description || 'Encaissement',
                  montant: a.montant,
                  date: a.dateEncaissement,
                })),
                ...(data.decaissements ?? []).map((d) => ({
                  id: d.id,
                  type: 'decaissement' as const,
                  label: d.motif || d.beneficiaire || d.reference || 'Décaissement',
                  montant: d.montant,
                  date: d.dateDecaissement,
                })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);

              if (mouvements.length === 0) return null;

              return (
                <Card>
                  <View style={styles.mouvementsHeader}>
                    <Text style={[styles.cardLabel, { marginBottom: 0 }]}>Derniers Mouvements</Text>
                    <TouchableOpacity onPress={() => setSection('encaissements')}>
                      <Text style={styles.toutVoirLink}>Tout voir</Text>
                    </TouchableOpacity>
                  </View>
                  {mouvements.map((mv, idx) => {
                    const isEnc = mv.type === 'encaissement';
                    return (
                      <View
                        key={mv.id}
                        style={[
                          styles.mouvementRow,
                          idx < mouvements.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: colors.borderLight,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.txIconCircle,
                            {
                              backgroundColor: isEnc
                                ? 'rgba(16,183,127,0.1)'
                                : 'rgba(245,158,11,0.1)',
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                            },
                          ]}
                        >
                          {isEnc ? (
                            <ArrowDownLeft size={16} color={colors.primary} />
                          ) : (
                            <ArrowUpRight size={16} color={colors.warning} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.mouvementTitleRow}>
                            <Text style={[styles.mouvementLabel, { color: colors.text }]} numberOfLines={1}>
                              {mv.label}
                            </Text>
                            <Badge
                              label={isEnc ? 'Enc.' : 'Déc.'}
                              variant={isEnc ? 'success' : 'warning'}
                            />
                          </View>
                          <Text style={[styles.mouvementTime, { color: colors.textMuted }]}>
                            {formatTimeAgo(mv.date)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.mouvementAmount,
                            { color: isEnc ? colors.primary : colors.warning },
                          ]}
                        >
                          {isEnc ? '+' : '-'}{formatMontant(mv.montant, data.deviseCode)}
                        </Text>
                      </View>
                    );
                  })}
                </Card>
              );
            })()}

            {/* Prefinancement section */}
            {data.prefinancement ? (
              <Card>
                <SectionHeader title="Préfinancement" style={{ marginTop: 0 }} />
                <Text style={styles.synRow}>Plafond : {formatMontant(data.prefinancement.montant, data.deviseCode)}</Text>
                <Text style={styles.synRow}>Utilisé : {formatMontant(data.prefinancement.montantUtilise, data.deviseCode)}</Text>
                <Text style={styles.solde}>Restant : {formatMontant(data.prefinancement.montantRestant, data.deviseCode)}</Text>
              </Card>
            ) : null}

            <Card>
              <SectionHeader title="Modifier préfinancement" style={{ marginTop: 0 }} />
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

        {/* Encaissements Tab */}
        {section === 'encaissements' && (
          <>
            <SectionHeader title="Derniers encaissements" />
            {(data.accomptes ?? []).slice(0, 10).map((a: Accompte) => (
              <Card key={a.id}>
                <View style={styles.txRow}>
                  <View style={[styles.txIconCircle, { backgroundColor: 'rgba(16,183,127,0.1)' }]}>
                    <ArrowDownLeft size={18} color={colors.primary} />
                  </View>
                  <View style={styles.txContent}>
                    <Text style={styles.txMontant}>{formatMontant(a.montant, data.deviseCode)}</Text>
                    <Text style={styles.txDate}>{formatDate(a.dateEncaissement)}</Text>
                    {a.reference ? <Text style={styles.txRef}>{a.reference}</Text> : null}
                  </View>
                </View>
              </Card>
            ))}
            {(!data.accomptes || data.accomptes.length === 0) && (
              <Text style={styles.emptyList}>Aucun encaissement</Text>
            )}

            {/* Collapsible form */}
            <TouchableOpacity
              style={styles.addFormToggle}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowEncForm(!showEncForm);
              }}
              activeOpacity={0.7}
            >
              <Plus size={18} color={colors.primary} />
              <Text style={styles.addFormToggleText}>Nouvel encaissement</Text>
              {showEncForm ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
            </TouchableOpacity>

            {showEncForm && (
              <Card>
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
            )}
          </>
        )}

        {/* Décaissements Tab */}
        {section === 'decaissements' && (
          <>
            <SectionHeader title="Derniers décaissements" />
            {(data.decaissements ?? []).slice(0, 10).map((d: Decaissement) => (
              <Card key={d.id}>
                <View style={styles.txRow}>
                  <View style={[styles.txIconCircle, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                    <CreditCard size={18} color={colors.warning} />
                  </View>
                  <View style={styles.txContent}>
                    <View style={styles.txHeader}>
                      <Text style={styles.txMontant}>{formatMontant(d.montant, data.deviseCode)}</Text>
                      {d.source && (
                        <Badge
                          label={d.source === 'PREFINANCEMENT' ? 'Préfi' : 'Tréso'}
                          variant={d.source === 'PREFINANCEMENT' ? 'warning' : 'success'}
                        />
                      )}
                    </View>
                    {d.beneficiaire ? <Text style={styles.txBenef}>{d.beneficiaire}</Text> : null}
                    {d.motif ? <Text style={styles.txMotif}>{d.motif}</Text> : null}
                    <Text style={styles.txDate}>{formatDate(d.dateDecaissement)} · {d.statut}</Text>
                  </View>
                </View>
              </Card>
            ))}
            {(!data.decaissements || data.decaissements.length === 0) && (
              <Text style={styles.emptyList}>Aucun décaissement</Text>
            )}

            {/* Collapsible form */}
            <TouchableOpacity
              style={styles.addFormToggle}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowDecForm(!showDecForm);
              }}
              activeOpacity={0.7}
            >
              <Plus size={18} color={colors.primary} />
              <Text style={styles.addFormToggleText}>Nouveau décaissement</Text>
              {showDecForm ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
            </TouchableOpacity>

            {showDecForm && (
              <Card>
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

                <Text style={styles.fieldLabel}>SOURCE DES FONDS</Text>
                <View style={styles.segmentedSmall}>
                  {(['TRESORERIE', 'PREFINANCEMENT'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setDecSource(s)}
                      style={[styles.segmentSmallBtn, decSource === s && styles.segmentSmallActive]}
                    >
                      <Text style={[styles.segmentSmallText, decSource === s && styles.segmentSmallTextActive]}>
                        {SOURCE_LABELS[s]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>MODE DE PAIEMENT</Text>
                <View style={styles.segmentedSmall}>
                  {MODE_PAIEMENT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setDecModePaiement(decModePaiement === opt.value ? '' : opt.value)}
                      style={[styles.segmentSmallBtn, decModePaiement === opt.value && styles.segmentSmallActive]}
                    >
                      <Text style={[styles.segmentSmallText, decModePaiement === opt.value && styles.segmentSmallTextActive]}>
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
  code: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
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
    color: colors.primary,
  },
  progressSection: {
    marginTop: spacing.smd,
    gap: spacing.xs,
  },
  progressText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  dateIcon: {},
  dateText: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text,
  },
  synRow: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  solde: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.success,
    marginTop: spacing.sm,
  },

  // Forms
  hint: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 1.2,
  },

  // Small segmented (source/mode paiement)
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
  txIcon: { fontSize: 18 },
  txContent: { flex: 1 },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
  bottomPad: { height: spacing.xxl },

  // Side by side (Restant / Consommé)
  sideBySide: {
    flexDirection: 'row',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  sideBySideItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  sideBySideLabel: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  sideBySideValue: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
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
    flex: 1,
  },
  mouvementTime: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  mouvementAmount: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
});
