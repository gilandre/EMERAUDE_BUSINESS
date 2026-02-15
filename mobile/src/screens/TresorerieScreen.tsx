import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, AlertTriangle,
  Users, Receipt, ChevronRight, TrendingUp, TrendingDown,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { apiFetch } from '../api/client';
import { formatMontant } from '../utils/format';

interface TresorerieData {
  soldeGlobal: number;
  totalEncaissementsMois: number;
  totalDecaissementsMois: number;
  decaissementsAJustifier: number;
  totalBeneficiaires: number;
  derniersMouvements: Array<{
    id: string;
    type: 'encaissement' | 'decaissement';
    montant: number;
    libelle: string;
    date: string;
    marcheLibelle: string;
  }>;
}

export function TresorerieScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [data, setData] = useState<TresorerieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<TresorerieData>('/api/tresorerie/summary');
      setData(res);
    } catch {
      // Fallback
      setData({
        soldeGlobal: 0,
        totalEncaissementsMois: 0,
        totalDecaissementsMois: 0,
        decaissementsAJustifier: 0,
        totalBeneficiaires: 0,
        derniersMouvements: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const fmt = (n: number) => formatMontant(n, 'XOF').replace(' FCFA', '');

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Solde Global */}
      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <View style={styles.heroRow}>
          <Wallet size={24} color="#fff" />
          <Text style={styles.heroLabel}>Solde Trésorerie</Text>
        </View>
        <Text style={styles.heroAmount}>{fmt(data?.soldeGlobal ?? 0)} FCFA</Text>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
          <ArrowDownLeft size={20} color="#22c55e" />
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Encaissements</Text>
          <Text style={[styles.kpiValue, { color: colors.text }]}>{fmt(data?.totalEncaissementsMois ?? 0)}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
          <ArrowUpRight size={20} color="#f59e0b" />
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Décaissements</Text>
          <Text style={[styles.kpiValue, { color: colors.text }]}>{fmt(data?.totalDecaissementsMois ?? 0)}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Accès rapide</Text>

      <TouchableOpacity
        style={[styles.actionRow, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('DecaissementsAJustifier')}
      >
        <View style={[styles.actionIcon, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
          <AlertTriangle size={20} color="#f59e0b" />
        </View>
        <View style={styles.actionText}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Décaissements à justifier</Text>
          <Text style={[styles.actionSub, { color: colors.textMuted }]}>En attente de justificatifs</Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionRow, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('Beneficiaires')}
      >
        <View style={[styles.actionIcon, { backgroundColor: 'rgba(16,183,127,0.1)' }]}>
          <Users size={20} color={colors.primary} />
        </View>
        <View style={styles.actionText}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Bénéficiaires</Text>
          <Text style={[styles.actionSub, { color: colors.textMuted }]}>Gestion des partenaires</Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionRow, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('FraisDeplacement')}
      >
        <View style={[styles.actionIcon, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
          <Receipt size={20} color="#6366f1" />
        </View>
        <View style={styles.actionText}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Frais de déplacement</Text>
          <Text style={[styles.actionSub, { color: colors.textMuted }]}>Notes de frais en cours</Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Derniers mouvements */}
      {data?.derniersMouvements && data.derniersMouvements.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Derniers mouvements</Text>
          {data.derniersMouvements.map((m) => (
            <View key={m.id} style={[styles.actionRow, { backgroundColor: colors.card }]}>
              <View style={[styles.actionIcon, { backgroundColor: m.type === 'encaissement' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                {m.type === 'encaissement' ? (
                  <ArrowDownLeft size={18} color="#22c55e" />
                ) : (
                  <ArrowUpRight size={18} color="#f59e0b" />
                )}
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>{m.libelle}</Text>
                <Text style={[styles.actionSub, { color: colors.textMuted }]} numberOfLines={1}>{m.marcheLibelle}</Text>
              </View>
              <Text style={[styles.mvtAmount, { color: m.type === 'encaissement' ? '#22c55e' : '#f59e0b' }]}>
                {m.type === 'encaissement' ? '+' : '-'}{fmt(m.montant)}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: {
    margin: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  heroAmount: {
    color: '#fff',
    fontSize: 28,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: 6,
  },
  kpiLabel: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  kpiValue: {
    fontSize: typography.fontSizes.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { flex: 1 },
  actionLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  actionSub: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  mvtAmount: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
});
