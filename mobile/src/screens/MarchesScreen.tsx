import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  Wallet,
  CheckCircle,
  Archive,
} from 'lucide-react-native';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { FAB } from '../components/FAB';
import { SectionHeader } from '../components/SectionHeader';
import { colors, typography, spacing } from '../theme';
import { apiFetch } from '../api/client';

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

  const load = async (pageNum = 1) => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('pageSize', '20');
      params.set('sortBy', 'updatedAt');
      params.set('sortOrder', 'desc');
      if (search.trim()) params.set('q', search.trim());

      const res = await apiFetch<MarchesResponse>(`/api/marches?${params}`);
      setData(res);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1);
  };

  const formatMontant = (n: number, devise = 'XOF') => {
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
    return `${fmt} ${devise === 'XOF' ? 'FCFA' : devise}`;
  };

  const getStatutVariant = (s: string) => {
    if (s === 'actif') return 'success' as const;
    if (s === 'termine') return 'neutral' as const;
    return 'warning' as const;
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Chargement...</Text>
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
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
            <SlidersHorizontal size={20} color={colors.textSecondary} />
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
});
