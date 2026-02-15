import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { Search, SlidersHorizontal, Building2, ChevronRight, Plus } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { apiFetch } from '../api/client';
import { Badge } from '../components/Badge';

interface BeneficiaireItem {
  id: string;
  code: string;
  nom: string;
  type: string;
  modePaiement: string | null;
  banque: string | null;
  actif: boolean;
  totalPaye: number;
}

export function BeneficiairesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [items, setItems] = useState<BeneficiaireItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (searchQuery = '') => {
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('page', '1');
      params.set('limit', '50');
      const res = await apiFetch<any>(`/api/beneficiaires?${params}`);
      setItems(res.beneficiaires || res.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(search); }, [fetchData, search]);

  const onRefresh = () => { setRefreshing(true); fetchData(search); };

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  const fmtShort = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  };

  const totalVolume = items.reduce((s, b) => s + (b.totalPaye || 0), 0);

  const renderItem = ({ item }: { item: BeneficiaireItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate('BeneficiaireDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: 'rgba(16,183,127,0.1)' }]}>
          <Building2 size={22} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.text }]}>{item.nom}</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            {item.modePaiement ? `${item.modePaiement}${item.banque ? ` ${item.banque}` : ''}` : 'Non renseigné'}
          </Text>
        </View>
        {item.actif && <Badge label="ACTIF" variant="success" />}
      </View>
      <View style={styles.cardBottom}>
        <View>
          <Text style={[styles.paidLabel, { color: colors.textMuted }]}>TOTAL PAYÉ À CE JOUR</Text>
          <Text style={[styles.paidValue, { color: colors.text }]}>{fmt(item.totalPaye)} FCFA</Text>
        </View>
        <TouchableOpacity style={[styles.payBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.payBtnText}>Payer</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={[styles.title, { color: colors.text }]}>Bénéficiaires</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Gestion de vos partenaires</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher un bénéficiaire..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.card }]}>
          <SlidersHorizontal size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: 'rgba(16,183,127,0.1)' }]}>
          <Text style={[styles.statLabel, { color: colors.primary }]}>TOTAL PARTENAIRES</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{items.length}</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>VOLUME MENSUEL</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{fmtShort(totalVolume)} FCFA</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucun bénéficiaire trouvé
          </Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: typography.fontSizes.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: typography.fontSizes.md,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  paidLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  paidValue: {
    fontSize: typography.fontSizes.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    marginTop: 2,
  },
  payBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  payBtnText: {
    color: '#fff',
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: typography.fontSizes.sm,
  },
});
