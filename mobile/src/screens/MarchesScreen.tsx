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
import { Card } from '../components/Card';
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
  _count?: { accomptes: number; decaissements: number };
}

interface MarchesResponse {
  data: MarcheItem[];
  total: number;
  page: number;
  totalPages: number;
}

export function MarchesScreen() {
  const navigation = useNavigation<{ navigate: (s: string, p?: { id: string }) => void }>();
  const [data, setData] = useState<MarchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = async (pageNum = 1, append = false) => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('pageSize', '20');
      params.set('sortBy', 'updatedAt');
      params.set('sortOrder', 'desc');
      if (search.trim()) params.set('q', search.trim());

      const res = await apiFetch<MarchesResponse>(`/api/marches?${params}`);
      setData((prev) =>
        append && prev ? { ...res, data: [...prev.data, ...res.data] } : res
      );
      setPage(pageNum);
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

  const getStatutColor = (s: string) => {
    if (s === 'actif') return colors.success;
    if (s === 'termine') return colors.textSecondary;
    return colors.warning;
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const items = data?.data ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <Text style={styles.title}>Marchés</Text>

      <TextInput
        style={styles.search}
        placeholder="Rechercher..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {items.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Aucun marché</Text>
        </Card>
      ) : (
        items.map((m) => (
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
                <View style={[styles.statutBadge, { backgroundColor: getStatutColor(m.statut) + '20' }]}>
                  <Text style={[styles.statutText, { color: getStatutColor(m.statut) }]}>
                    {m.statut}
                  </Text>
                </View>
              </View>
              <Text style={styles.marcheCode}>{m.code}</Text>
              <Text style={styles.marcheMontant}>
                {formatMontant(m.montantXOF ?? m.montant, m.deviseCode)}
              </Text>
              {m._count && (
                <Text style={styles.marcheMeta}>
                  {m._count.accomptes} accomptes · {m._count.decaissements} décaissements
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSizes.base,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
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
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  statutBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statutText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  marcheCode: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  marcheMontant: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  marcheMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
