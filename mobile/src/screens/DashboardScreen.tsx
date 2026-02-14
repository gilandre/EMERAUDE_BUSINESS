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
    encEvolution?: number;
    decEvolution?: number;
    marchesActifsDelta?: number;
    alertesActives?: number;
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
  marchesAttention?: Array<{
    id: string;
    code: string;
    libelle: string;
    tresorerie: number;
    ratio: number;
    prefinancementPct: number | null;
  }>;
  treasuryEvolution?: Array<{ date: string; tresorerie: number }>;
  deadlines?: Array<{ id: string; code: string; libelle: string; dateFin: string }>;
  seuilCritique?: number;
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

  const formatEvolution = (n: number | undefined) => {
    if (n === undefined || n === 0) return '';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(0)}%`;
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
  const marchesAttention = data?.marchesAttention ?? [];
  const deadlines = data?.deadlines ?? [];
  const treasuryEvolution = data?.treasuryEvolution ?? [];

  // Mini bar chart data (last 7 days)
  const last7 = treasuryEvolution.slice(-7);
  const maxTreasury = Math.max(...last7.map((p) => Math.abs(p.tresorerie)), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <Text style={styles.title}>Tableau de bord</Text>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{kpis.marchesActifs ?? 0}</Text>
          <Text style={styles.kpiLabel}>Marchés actifs</Text>
          {kpis.marchesActifsDelta !== undefined && kpis.marchesActifsDelta !== 0 && (
            <Text style={[styles.kpiDelta, kpis.marchesActifsDelta > 0 ? styles.deltaPositive : styles.deltaNegative]}>
              {kpis.marchesActifsDelta > 0 ? '+' : ''}{kpis.marchesActifsDelta}
            </Text>
          )}
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiValueSmall}>
            {formatMontant(Number(kpis.totalEncaissements) || 0)}
          </Text>
          <Text style={styles.kpiLabel}>Encaissements</Text>
          {kpis.encEvolution !== undefined && kpis.encEvolution !== 0 && (
            <Text style={[styles.kpiDelta, kpis.encEvolution > 0 ? styles.deltaPositive : styles.deltaNegative]}>
              {formatEvolution(kpis.encEvolution)}
            </Text>
          )}
        </Card>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiValueSmall}>
            {formatMontant(Number(kpis.totalDecaissements) || 0)}
          </Text>
          <Text style={styles.kpiLabel}>Décaissements</Text>
          {kpis.decEvolution !== undefined && kpis.decEvolution !== 0 && (
            <Text style={[styles.kpiDelta, kpis.decEvolution > 0 ? styles.deltaNegative : styles.deltaPositive]}>
              {formatEvolution(kpis.decEvolution)}
            </Text>
          )}
        </Card>
      </View>

      {/* Trésorerie + Alertes */}
      <View style={styles.twoCol}>
        <Card style={styles.twoColCard}>
          <Text style={styles.cardTitle}>Trésorerie</Text>
          <Text style={styles.tresorerieValue}>
            {formatMontant(Number(kpis.tresorerie) || 0)}
          </Text>
        </Card>
        <Card style={styles.twoColCard}>
          <Text style={styles.cardTitle}>Alertes actives</Text>
          <Text style={[styles.tresorerieValue, { color: (kpis.alertesActives ?? 0) > 0 ? colors.warning : colors.success }]}>
            {kpis.alertesActives ?? 0}
          </Text>
        </Card>
      </View>

      {/* Mini Treasury Chart (7 jours) */}
      {last7.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>Trésorerie (7 derniers jours)</Text>
          <View style={styles.miniChart}>
            {last7.map((pt, i) => {
              const height = Math.max(4, (Math.abs(pt.tresorerie) / maxTreasury) * 50);
              const isNegative = pt.tresorerie < 0;
              return (
                <View key={i} style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: isNegative ? colors.error : colors.success },
                    ]}
                  />
                  <Text style={styles.barLabel}>{pt.date.slice(8)}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {/* Marchés nécessitant attention */}
      {marchesAttention.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Marchés nécessitant attention</Text>
          {marchesAttention.slice(0, 3).map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.8}
              onPress={() => (navigation as { navigate: (s: string, p: { id: string }) => void }).navigate('MarcheDetail', { id: m.id })}
            >
              <Card>
                <Text style={styles.attentionLibelle}>{m.libelle}</Text>
                <Text style={styles.attentionCode}>{m.code}</Text>
                <View style={styles.attentionRow}>
                  <Text style={styles.attentionTreso}>
                    Trésorerie: {formatMontant(m.tresorerie)}
                  </Text>
                  <Text style={[styles.attentionRatio, m.ratio < 5 && styles.ratioCritical]}>
                    {m.ratio.toFixed(0)}%
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Échéances proches */}
      {deadlines.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Échéances proches</Text>
          {deadlines.map((d) => (
            <TouchableOpacity
              key={d.id}
              activeOpacity={0.8}
              onPress={() => (navigation as { navigate: (s: string, p: { id: string }) => void }).navigate('MarcheDetail', { id: d.id })}
            >
              <Card>
                <Text style={styles.deadlineLibelle}>{d.libelle}</Text>
                <Text style={styles.deadlineDate}>
                  Fin : {new Date(d.dateFin).toLocaleDateString('fr-FR')}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Marchés récents */}
      <TouchableOpacity
        onPress={() => (navigation as { navigate: (s: string) => void }).navigate('Marches')}
        style={styles.marchesLink}
      >
        <Text style={styles.sectionTitle}>Marchés récents</Text>
        <Text style={styles.voirTout}>Voir tout</Text>
      </TouchableOpacity>
      {marches.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Aucun marché</Text>
        </Card>
      ) : (
        marches.map((m) => (
          <TouchableOpacity
            key={m.id}
            activeOpacity={0.8}
            onPress={() => (navigation as { navigate: (s: string, p: { id: string }) => void }).navigate('MarcheDetail', { id: m.id })}
          >
            <Card>
              <Text style={styles.marcheLibelle}>{m.libelle}</Text>
              <Text style={styles.marcheCode}>{m.code}</Text>
              <Text style={styles.marcheMontant}>
                {formatMontant(m.montantXOF ?? m.montant, m.deviseCode)}
              </Text>
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
    fontWeight: typography.fontWeights.bold as '700',
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
    minWidth: '30%' as unknown as number,
  },
  kpiValue: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.primary,
  },
  kpiValueSmall: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.primary,
  },
  kpiLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  kpiDelta: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold as '600',
    marginTop: 2,
  },
  deltaPositive: {
    color: colors.success,
  },
  deltaNegative: {
    color: colors.error,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  twoColCard: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tresorerieValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.success,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
    marginTop: spacing.sm,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: 16,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold as '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  attentionLibelle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium as '500',
    color: colors.text,
  },
  attentionCode: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  attentionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  attentionTreso: {
    fontSize: typography.fontSizes.sm,
    color: colors.warning,
    fontWeight: typography.fontWeights.medium as '500',
  },
  attentionRatio: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold as '700',
    color: colors.warning,
  },
  ratioCritical: {
    color: colors.error,
  },
  deadlineLibelle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium as '500',
    color: colors.text,
  },
  deadlineDate: {
    fontSize: typography.fontSizes.sm,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  marchesLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  voirTout: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium as '500',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  marcheLibelle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium as '500',
    color: colors.text,
  },
  marcheCode: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  marcheMontant: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold as '600',
    color: colors.primary,
    marginTop: spacing.sm,
  },
});
