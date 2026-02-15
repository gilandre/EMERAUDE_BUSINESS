import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { Search, SlidersHorizontal, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { apiFetch } from '../api/client';

interface DecaissementItem {
  id: string;
  beneficiaire: string;
  montant: number;
  dateDecaissement: string;
  marcheLibelle?: string;
  statut: string;
}

export function DecaissementsAJustifierScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [items, setItems] = useState<DecaissementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/api/decaissements?sansJustificatif=true');
      setItems(res.decaissements || res.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const filtered = items.filter(i =>
    i.beneficiaire.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: DecaissementItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate('AjouterJustificatif', { decaissementId: item.id })}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {item.beneficiaire}
        </Text>
        <Text style={[styles.cardAmount, { color: colors.text }]}>
          {fmt(item.montant)} FCFA
        </Text>
      </View>
      <Text style={[styles.cardDate, { color: colors.textMuted }]}>
        {fmtDate(item.dateDecaissement)}
      </Text>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <AlertTriangle size={12} color="#f59e0b" />
          <Text style={styles.badgeText}>JUSTIFICATIF MANQUANT</Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
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
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.card }]}>
          <SlidersHorizontal size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Counter banner */}
      <View style={[styles.banner, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
        <AlertTriangle size={20} color="#f59e0b" />
        <View style={{ marginLeft: spacing.sm }}>
          <Text style={[styles.bannerTitle, { color: colors.text }]}>
            {filtered.length} décaissement{filtered.length > 1 ? 's' : ''}
          </Text>
          <Text style={[styles.bannerSub, { color: colors.textMuted }]}>
            En attente de justificatifs
          </Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucun décaissement à justifier
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  bannerTitle: {
    fontSize: typography.fontSizes.md,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  bannerSub: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  card: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    flex: 1,
  },
  cardAmount: {
    fontSize: typography.fontSizes.md,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: typography.fontSizes.sm,
  },
});
