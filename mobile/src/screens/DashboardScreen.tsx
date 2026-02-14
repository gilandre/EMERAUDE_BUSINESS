import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/Card';
import { colors, typography, spacing } from '../theme';
import { apiFetch } from '../api/client';

interface DashboardData {
  kpis?: {
    marchesActifs?: number;
    marchesTotal?: number;
    tresorerie?: number;
    totalEncaissements?: number;
    totalDecaissements?: number;
  };
  recentMarches?: Array<{
    id: string;
    code: string;
    libelle: string;
    montant: number;
    montantXOF?: number;
    deviseCode: string;
    statut: string;
  }>;
}

export function DashboardScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await apiFetch<DashboardData>('/api/dashboard?period=30d');
      setData(res);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const formatMontant = (n: number, devise = 'XOF') => {
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
    return `${fmt} ${devise === 'XOF' ? 'FCFA' : devise}`;
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const kpis = data?.kpis ?? {};
  const marches = data?.recentMarches ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <Text style={styles.title}>Tableau de bord</Text>

      <View style={styles.kpiGrid}>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{kpis.marchesActifs ?? 0}</Text>
          <Text style={styles.kpiLabel}>Marchés actifs</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiValueSmall}>
            {formatMontant(Number(kpis.totalEncaissements) || 0)}
          </Text>
          <Text style={styles.kpiLabel}>Encaissements</Text>
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiValueSmall}>
            {formatMontant(Number(kpis.totalDecaissements) || 0)}
          </Text>
          <Text style={styles.kpiLabel}>Décaissements</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Trésorerie totale</Text>
        <Text style={styles.tresorerieValue}>
          {formatMontant(Number(kpis.tresorerie) || 0)}
        </Text>
      </Card>

      <TouchableOpacity
        onPress={() => (navigation as { navigate: (s: string) => void }).navigate('Marches')}
        style={styles.marchesLink}
      >
        <Text style={styles.sectionTitle}>Marchés récents</Text>
        <Text style={styles.voirTout}>Voir tout →</Text>
      </TouchableOpacity>
      {marches.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Aucun marché</Text>
        </Card>
      ) : (
        marches.map((m) => (
          <Card key={m.id}>
            <Text style={styles.marcheLibelle}>{m.libelle}</Text>
            <Text style={styles.marcheCode}>{m.code}</Text>
            <Text style={styles.marcheMontant}>
            {formatMontant(m.montantXOF ?? m.montant, m.deviseCode)}
          </Text>
          </Card>
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: '30%',
  },
  kpiValue: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  kpiValueSmall: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  kpiLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tresorerieValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
  marchesLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  voirTout: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  marcheLibelle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  marcheCode: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  marcheMontant: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
    marginTop: spacing.sm,
  },
});
