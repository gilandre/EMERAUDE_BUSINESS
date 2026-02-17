import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  Activity,
  CheckCircle,
  Archive,
  X,
} from 'lucide-react-native';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { FAB } from '../components/FAB';
import { SectionHeader } from '../components/SectionHeader';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { colors, typography, spacing } from '../theme';
import { useDebounce } from '../hooks/useDebounce';
import { formatMontant } from '../utils/format';
import { ErrorState } from '../components/ErrorState';
import { getActivites, type Activite, type ActivitesResponse } from '../api/activites';

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

const TYPE_OPTIONS = [
  { value: null, label: 'Tous' },
  { value: 'MISSION', label: 'Mission' },
  { value: 'EVENEMENT', label: 'Événement' },
  { value: 'PROJET', label: 'Projet' },
  { value: 'FORMATION', label: 'Formation' },
  { value: 'FONCTIONNEMENT', label: 'Fonctionnement' },
  { value: 'AUTRE', label: 'Autre' },
];

const STATUT_OPTIONS = [
  { value: null, label: 'Tous' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOTUREE', label: 'Clôturée' },
  { value: 'ARCHIVEE', label: 'Archivée' },
];

export function ActivitesScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<ActivitesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 400);
  const [error, setError] = useState(false);

  const load = useCallback(async (pageNum = 1) => {
    try {
      setError(false);
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('pageSize', '20');
      params.set('sortBy', 'updatedAt');
      params.set('sortOrder', 'desc');
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      if (filterType) params.set('type', filterType);
      if (filterStatut) params.set('statut', filterStatut);

      const res = await getActivites(params);
      setData(res);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, filterType, filterStatut]);

  useEffect(() => {
    load(1);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1);
  };

  const hasFilters = filterType || filterStatut;

  if (loading && !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md }]}>
        <Skeleton height={44} borderRadius={12} style={{ marginBottom: spacing.md }} />
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={80} height={12} />
              <Skeleton width={50} height={20} borderRadius={10} />
            </View>
            <Skeleton width="70%" height={16} />
            <Skeleton width={120} height={14} />
          </SkeletonCard>
        ))}
      </View>
    );
  }

  if (error) return <ErrorState onRetry={() => load(1)} />;

  const items = data?.data ?? [];
  const totalCount = data?.total ?? items.length;
  const actives = items.filter((a) => a.statut === 'ACTIVE').length;
  const soldeGlobal = items.reduce((sum, a) => sum + (a.soldeXOF ?? a.solde ?? 0), 0);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Stats Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <View style={styles.chip}>
            <Activity size={16} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.chipValue}>{totalCount}</Text>
            <Text style={styles.chipLabel}>Total</Text>
          </View>
          <View style={styles.chip}>
            <CheckCircle size={16} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={[styles.chipValue, { color: colors.primary }]}>{actives}</Text>
            <Text style={styles.chipLabel}>Actives</Text>
          </View>
          <View style={styles.chip}>
            <Archive size={16} color={colors.textMuted} style={{ marginBottom: 4 }} />
            <Text style={styles.chipValue}>{formatMontant(soldeGlobal)}</Text>
            <Text style={styles.chipLabel}>Solde global</Text>
          </View>
        </ScrollView>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={styles.search}
              placeholder="Rechercher une activité..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, hasFilters ? styles.filterBtnActive : undefined]}
            activeOpacity={0.7}
            onPress={() => setShowFilters(true)}
          >
            <SlidersHorizontal size={20} color={hasFilters ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <SectionHeader title="Toutes les activités" />

        {items.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Aucune activité</Text>
          </Card>
        ) : (
          items.map((a) => (
            <TouchableOpacity
              key={a.id}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ActiviteDetail', { id: a.id })}
            >
              <Card>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardLibelle} numberOfLines={2}>
                    {a.libelle}
                  </Text>
                  <Badge label={a.statut} variant={STATUT_VARIANTS[a.statut] ?? 'neutral'} />
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardCode}>{a.code}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[a.type] ?? TYPE_COLORS.AUTRE) + '20' }]}>
                    <Text style={[styles.typeBadgeText, { color: TYPE_COLORS[a.type] ?? TYPE_COLORS.AUTRE }]}>
                      {a.type}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.cardSolde,
                    { color: a.solde >= 0 ? colors.primary : colors.error },
                  ]}
                >
                  {formatMontant(a.solde, a.deviseCode)}
                </Text>
                <View style={styles.cardFooter}>
                  {a._count && (
                    <Text style={styles.cardFooterMeta}>
                      {a._count.mouvements} mouvement{a._count.mouvements !== 1 ? 's' : ''}
                    </Text>
                  )}
                  <ChevronRight size={18} color={colors.textMuted} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <FAB onPress={() => navigation.navigate('CreateActivite')} />

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Type</Text>
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.filterOption, filterType === opt.value && styles.filterOptionActive]}
                onPress={() => setFilterType(opt.value)}
              >
                <Text style={[styles.filterOptionText, filterType === opt.value && styles.filterOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.filterSectionTitle, { marginTop: spacing.md }]}>Statut</Text>
            {STATUT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.filterOption, filterStatut === opt.value && styles.filterOptionActive]}
                onPress={() => setFilterStatut(opt.value)}
              >
                <Text style={[styles.filterOptionText, filterStatut === opt.value && styles.filterOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.filterApplyBtn}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.filterApplyText}>Appliquer</Text>
            </TouchableOpacity>

            {hasFilters && (
              <TouchableOpacity
                style={styles.filterResetBtn}
                onPress={() => { setFilterType(null); setFilterStatut(null); setShowFilters(false); }}
              >
                <Text style={styles.filterResetText}>Réinitialiser</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl + 80 },

  // Chips
  chipsScroll: { marginBottom: spacing.md },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    minWidth: 110,
  },
  chipValue: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.text,
  },
  chipLabel: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  search: {
    flex: 1,
    paddingVertical: spacing.smd,
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text,
  },

  emptyText: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },

  // Card
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLibelle: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.medium,
    fontWeight: typography.fontWeights.medium as '500',
    color: colors.text,
    marginRight: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cardCode: {
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
  cardSolde: {
    fontSize: typography.fontSizes.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
    marginTop: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.smd,
  },
  cardFooterMeta: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.text,
  },
  filterSectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as '600',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  filterOption: {
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
    backgroundColor: colors.borderLight,
  },
  filterOptionActive: {
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as '600',
  },
  filterApplyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  filterApplyText: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as '600',
    color: '#fff',
  },
  filterResetBtn: {
    paddingVertical: spacing.smd,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  filterResetText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.error,
  },
});
