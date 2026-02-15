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
  Wallet,
  CheckCircle,
  Archive,
  X,
} from 'lucide-react-native';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { FAB } from '../components/FAB';
import { SectionHeader } from '../components/SectionHeader';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { colors, typography, spacing } from '../theme';
import { apiFetch } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { formatMontant } from '../utils/format';

interface MarcheItem {
  id: string;
  code: string;
  libelle: string;
  montant: number;
  montantXOF?: number;
  deviseCode: string;
  statut: string;
  updatedAt?: string;
  _count?: { accomptes: number; decaissements: number };
  synthese?: { totalEncaissements?: number };
}

interface MarchesResponse {
  data: MarcheItem[];
  total: number;
  page: number;
  totalPages: number;
}

export function MarchesScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<MarchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string | null>(null);
  const [filterSort, setFilterSort] = useState<'updatedAt' | 'montant'>('updatedAt');
  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async (pageNum = 1) => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('pageSize', '20');
      params.set('sortBy', filterSort);
      params.set('sortOrder', 'desc');
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      if (filterStatut) params.set('statut', filterStatut);

      const res = await apiFetch<MarchesResponse>(`/api/marches?${params}`);
      setData(res);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, filterStatut, filterSort]);

  useEffect(() => {
    load(1);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1);
  };

  const getStatutVariant = (s: string) => {
    if (s === 'actif') return 'success' as const;
    if (s === 'termine') return 'neutral' as const;
    return 'warning' as const;
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md }]}>
        {/* Skeleton search bar */}
        <Skeleton height={44} borderRadius={12} style={{ marginBottom: spacing.md }} />
        {/* Skeleton cards */}
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={80} height={12} />
              <Skeleton width={50} height={20} borderRadius={10} />
            </View>
            <Skeleton width="70%" height={16} />
            <Skeleton width={120} height={14} />
            <Skeleton height={6} borderRadius={3} />
          </SkeletonCard>
        ))}
      </View>
    );
  }

  const items = data?.data ?? [];
  const totalValue = items.reduce((sum, m) => sum + (m.montantXOF ?? m.montant), 0);
  const actifs = items.filter((m) => m.statut === 'actif').length;
  const termines = items.filter((m) => m.statut === 'termine').length;

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
            <Wallet size={16} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.chipValue}>{formatMontant(totalValue)}</Text>
            <Text style={styles.chipLabel}>Total Valeur</Text>
          </View>
          <View style={styles.chip}>
            <CheckCircle size={16} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={[styles.chipValue, { color: colors.primary }]}>{actifs}</Text>
            <Text style={styles.chipLabel}>Actifs</Text>
          </View>
          <View style={styles.chip}>
            <Archive size={16} color={colors.textMuted} style={{ marginBottom: 4 }} />
            <Text style={styles.chipValue}>{termines}</Text>
            <Text style={styles.chipLabel}>Terminés</Text>
          </View>
        </ScrollView>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={styles.search}
              placeholder="Rechercher un marché..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={[styles.filterBtn, filterStatut ? styles.filterBtnActive : undefined]} activeOpacity={0.7} onPress={() => setShowFilters(true)}>
            <SlidersHorizontal size={20} color={filterStatut ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <SectionHeader title="Tous les marchés" />

        {items.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Aucun marché</Text>
          </Card>
        ) : (
          items.map((m) => {
            const encaissementProgress = m.synthese?.totalEncaissements
              ? (m.synthese.totalEncaissements / (m.montantXOF ?? m.montant))
              : 0;
            return (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('MarcheDetail', { id: m.id })}
              >
                <Card>
                  <View style={styles.marcheHeader}>
                    <Text style={styles.marcheLibelle} numberOfLines={2}>
                      {m.libelle}
                    </Text>
                    <Badge label={m.statut} variant={getStatutVariant(m.statut)} />
                  </View>
                  <Text style={styles.marcheCode}>{m.code}</Text>
                  <Text style={styles.marcheMontant}>
                    {formatMontant(m.montantXOF ?? m.montant, m.deviseCode)}
                  </Text>
                  <View style={styles.progressRow}>
                    <ProgressBar progress={encaissementProgress} />
                    <Text style={styles.progressLabel}>
                      {(encaissementProgress * 100).toFixed(0)}% encaissé
                    </Text>
                  </View>
                  {m.updatedAt && (
                    <Text style={styles.updatedAt}>
                      Dernière mise à jour : {new Date(m.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                  <View style={styles.marcheFooter}>
                    {m._count && (
                      <Text style={styles.marcheMeta}>
                        {m._count.accomptes} enc. · {m._count.decaissements} déc.
                      </Text>
                    )}
                    <ChevronRight size={18} color={colors.textMuted} />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <FAB onPress={() => navigation.navigate('CreateMarche')} />

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

            <Text style={styles.filterSectionTitle}>Statut</Text>
            {[
              { value: null, label: 'Tous' },
              { value: 'actif', label: 'Actif' },
              { value: 'termine', label: 'Terminé' },
              { value: 'suspendu', label: 'Suspendu' },
            ].map((opt) => (
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

            <Text style={[styles.filterSectionTitle, { marginTop: spacing.md }]}>Trier par</Text>
            {[
              { value: 'updatedAt' as const, label: 'Date de mise à jour' },
              { value: 'montant' as const, label: 'Montant' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterOption, filterSort === opt.value && styles.filterOptionActive]}
                onPress={() => setFilterSort(opt.value)}
              >
                <Text style={[styles.filterOptionText, filterSort === opt.value && styles.filterOptionTextActive]}>
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

            {filterStatut && (
              <TouchableOpacity
                style={styles.filterResetBtn}
                onPress={() => { setFilterStatut(null); setFilterSort('updatedAt'); setShowFilters(false); }}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },

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

  marcheHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  marcheLibelle: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.medium,
    fontWeight: typography.fontWeights.medium as '500',
    color: colors.text,
    marginRight: spacing.sm,
  },
  marcheCode: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  marcheMontant: {
    fontSize: typography.fontSizes.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  progressRow: {
    marginTop: spacing.smd,
    gap: spacing.xs,
  },
  progressLabel: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  marcheFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.smd,
  },
  marcheMeta: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  updatedAt: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },

  // Filter button active
  filterBtnActive: {
    backgroundColor: colors.primary,
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
