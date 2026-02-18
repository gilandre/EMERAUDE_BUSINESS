import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Wallet,
  Bell,
  Briefcase,
  ArrowDownLeft,
  CreditCard,
  FileText,
  BellRing,
  AlertTriangle,
  Calendar,
  Search,
  Activity,
  ChevronRight,
} from 'lucide-react-native';
import { ProgressBar } from '../components/ProgressBar';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { typography, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import { formatMontantSplit, formatShort, formatTimeAgo } from '../utils/format';
import { ErrorState } from '../components/ErrorState';

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
    activitesTotal?: number;
    activitesActives?: number;
    activitesSoldeGlobal?: number;
  };
  recentMarches?: Array<{
    id: string;
    code: string;
    libelle: string;
    montant: number;
    montantXOF?: number;
    deviseCode: string;
    statut: string;
    _count?: { accomptes: number; decaissements: number };
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
  recentAlerts?: Array<{
    id: string;
    sujet: string;
    libelle: string;
    createdAt: string;
  }>;
  recentActivites?: Array<{
    id: string;
    code: string;
    libelle: string;
    type: string;
    statut: string;
    solde: number;
    soldeXOF: number;
    deviseCode: string;
    updatedAt: string;
  }>;
  seuilCritique?: number;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function DashboardScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await apiFetch<DashboardData>('/api/dashboard/kpis');
      setData(res);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const formatMontant = (n: number, devise = 'XOF') => formatMontantSplit(n, devise);

  const navigateToMarche = (id: string) => {
    (navigation as any).navigate('Marches', { screen: 'MarcheDetail', params: { id } });
  };

  if (loading && !data) {
    return (
      <ScrollView style={[st.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.md }}>
        {/* Skeleton header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <View style={{ gap: 8 }}>
            <Skeleton width={180} height={20} />
            <Skeleton width={120} height={14} />
          </View>
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
        {/* Skeleton KPI cards */}
        <SkeletonCard style={{ marginBottom: spacing.md }}>
          <Skeleton width={100} height={12} />
          <Skeleton width={200} height={28} />
        </SkeletonCard>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <SkeletonCard style={{ flex: 1 }}>
            <Skeleton width={60} height={12} />
            <Skeleton width={90} height={20} />
          </SkeletonCard>
          <SkeletonCard style={{ flex: 1 }}>
            <Skeleton width={60} height={12} />
            <Skeleton width={90} height={20} />
          </SkeletonCard>
        </View>
        {/* Skeleton chart */}
        <SkeletonCard style={{ marginBottom: spacing.md }}>
          <Skeleton width={140} height={14} />
          <Skeleton height={80} />
        </SkeletonCard>
        {/* Skeleton list */}
        <Skeleton width={120} height={14} style={{ marginBottom: spacing.sm }} />
        <SkeletonCard><Skeleton height={50} /></SkeletonCard>
        <SkeletonCard style={{ marginTop: spacing.sm }}><Skeleton height={50} /></SkeletonCard>
      </ScrollView>
    );
  }

  if (error) return <ErrorState onRetry={load} />;

  const kpis = data?.kpis ?? {};
  const marchesAttention = data?.marchesAttention ?? [];
  const recentMarches = data?.recentMarches ?? [];
  const deadlines = data?.deadlines ?? [];
  const recentAlerts = data?.recentAlerts ?? [];
  const recentActivites = data?.recentActivites ?? [];
  const treasuryEvolution = data?.treasuryEvolution ?? [];
  const last7 = treasuryEvolution.slice(-7);
  const maxTreasury = Math.max(...last7.map((p) => Math.abs(p.tresorerie)), 1);
  const tresoEvo = kpis.encEvolution ?? 0;
  const displayName = user?.name || [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Utilisateur';

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Determine which marchés to show in the watch section
  const watchMarches = marchesAttention.length > 0
    ? marchesAttention.slice(0, 3).map((m) => ({
        id: m.id,
        libelle: m.libelle,
        code: m.code,
        ratio: m.ratio,
        progress: Math.min(1, m.ratio),
      }))
    : recentMarches.slice(0, 3).map((m) => ({
        id: m.id,
        libelle: m.libelle,
        code: m.code,
        ratio: null as number | null,
        progress: m._count
          ? Math.min(1, ((m._count.accomptes + m._count.decaissements) / 10))
          : 0.5,
      }));

  // Alert icon mapping
  const getAlertIcon = (sujet: string): { icon: React.ReactNode; bg: string; color: string } => {
    if (sujet.includes('Décaissement')) return { icon: <CreditCard size={16} color="#f59e0b" />, bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
    if (sujet.includes('Accompte') || sujet.includes('encaiss')) return { icon: <ArrowDownLeft size={16} color="#10b77f" />, bg: 'rgba(16,183,127,0.15)', color: '#10b77f' };
    if (sujet.includes('marché') || sujet.includes('Nouveau')) return { icon: <FileText size={16} color="#6366f1" />, bg: 'rgba(99,102,241,0.15)', color: '#6366f1' };
    return { icon: <BellRing size={16} color={colors.primary} />, bg: colors.primaryTint, color: colors.primary };
  };

  return (
    <ScrollView
      style={[st.container, { backgroundColor: colors.background }]}
      contentContainerStyle={st.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Text style={[st.headerTitle, { color: colors.text }]}>Tableau de bord</Text>
          <Text style={[st.headerDate, { color: colors.textMuted }]}>
            {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
          </Text>
        </View>
        <View style={st.headerRight}>
          <TouchableOpacity
            style={[st.bellButton, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}
            onPress={() => (navigation as any).navigate('AlertesList')}
            activeOpacity={0.7}
          >
            <Bell size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={[st.avatarSmall, { borderColor: 'rgba(16,183,127,0.2)' }]}>
            <Text style={[st.avatarSmallText, { color: colors.primary }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
            <View style={[st.onlineDot, { borderColor: isDark ? colors.background : '#fff' }]} />
          </View>
        </View>
      </View>

      {/* Hero Treasury Card */}
      <View style={st.heroCard}>
        <View style={st.heroTop}>
          <Text style={st.heroLabel}>Solde Trésorerie</Text>
          <Wallet size={24} color="rgba(255,255,255,0.8)" />
        </View>
        <View style={st.heroAmountRow}>
          <Text style={st.heroValue}>
            {formatMontant(Number(kpis.tresorerie) || 0).value}
          </Text>
          <Text style={st.heroSuffix}>
            {' '}{formatMontant(Number(kpis.tresorerie) || 0).suffix}
          </Text>
        </View>
        {tresoEvo !== 0 ? (
          <View style={st.heroBadge}>
            <Text style={st.heroBadgeText}>
              ↗ {tresoEvo > 0 ? '+' : ''}{tresoEvo.toFixed(1)}% ce mois
            </Text>
          </View>
        ) : (kpis.alertesActives ?? 0) > 0 ? (
          <View style={st.heroBadge}>
            <Text style={st.heroBadgeText}>
              ⚡ {kpis.alertesActives} alertes actives
            </Text>
          </View>
        ) : null}
      </View>

      {/* KPI Grid - 2 columns */}
      <View style={st.kpiGrid}>
        <View style={[st.kpiCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[st.kpiLabel, { color: colors.textMuted }]}>Marchés Actifs</Text>
          <Text style={[st.kpiValue, { color: isDark ? colors.primary : colors.primary }]}>
            {kpis.marchesActifs ?? 0}
          </Text>
          {(kpis.marchesActifsDelta ?? 0) > 0 && (
            <Text style={[st.kpiSub, { color: colors.textMuted }]}>
              {kpis.marchesActifsDelta} nouveaux ce mois
            </Text>
          )}
        </View>
        <View style={[st.kpiCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[st.kpiLabel, { color: colors.textMuted }]}>Recettes (Mois)</Text>
          <View style={st.kpiAmountRow}>
            <Text style={[st.kpiValue, { color: isDark ? '#fff' : colors.text }]}>
              {formatShort(Number(kpis.totalEncaissements) || 0)}
            </Text>
            <Text style={[st.kpiSuffix, { color: colors.textMuted }]}> FCFA</Text>
          </View>
          {(kpis.encEvolution ?? 0) !== 0 && (
            <Text style={[st.kpiEvolution, { color: colors.primary }]}>
              ↑ +{Math.abs(kpis.encEvolution ?? 0).toFixed(0)}%
            </Text>
          )}
        </View>
      </View>

      {/* Treasury Chart */}
      {last7.length > 0 && (
        <View style={st.sectionBlock}>
          <View style={st.sectionHeaderRow}>
            <Text style={[st.sectionTitle, { color: colors.text }]}>
              Flux de trésorerie{' '}
              <Text style={[st.sectionTitleLight, { color: colors.textMuted }]}>(7j)</Text>
            </Text>
            <Text style={[st.detailsLink, { color: colors.primary }]}>Détails</Text>
          </View>
          <View style={[st.chartCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <View style={st.chartBars}>
              {last7.map((pt, i) => {
                const pct = maxTreasury === 0
                  ? 15
                  : Math.max(5, (Math.abs(pt.tresorerie) / maxTreasury) * 100);
                const isMax = maxTreasury > 0 && Math.abs(pt.tresorerie) === maxTreasury;
                const dayLabel = DAY_LABELS[i] || pt.date.slice(8);
                return (
                  <View key={i} style={st.barCol}>
                    <View style={st.barTrack}>
                      <View
                        style={[
                          st.bar,
                          {
                            height: `${pct}%`,
                            backgroundColor: isMax
                              ? colors.primary
                              : isDark
                              ? 'rgba(16, 183, 127, 0.4)'
                              : `rgba(16, 183, 127, ${0.15 + (pct / 100) * 0.5})`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        st.barLabel,
                        { color: isMax ? colors.primary : colors.textMuted },
                        isMax && st.barLabelBold,
                      ]}
                    >
                      {dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Marchés à surveiller */}
      {watchMarches.length > 0 && (
        <View style={st.sectionBlock}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>Marchés à surveiller</Text>
          {watchMarches.map((m) => {
            const hasRatio = m.ratio !== null;
            const ratioVal = m.ratio ?? 1;
            const ratioColor = ratioVal < 1 ? '#f59e0b' : colors.primary;
            const ratioBg = ratioVal < 1
              ? isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7'
              : isDark ? colors.primaryTint : 'rgba(16, 183, 127, 0.1)';
            return (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.8}
                onPress={() => navigateToMarche(m.id)}
              >
                <View style={[st.watchCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                  <View style={st.watchTop}>
                    <View style={st.watchInfo}>
                      <Text style={[st.watchTitle, { color: colors.text }]}>{m.libelle}</Text>
                      <Text style={[st.watchCode, { color: colors.textMuted }]}>Contrat #{m.code}</Text>
                    </View>
                    {hasRatio && (
                      <View style={[st.ratioBadge, { backgroundColor: ratioBg }]}>
                        <Text style={[st.ratioText, { color: ratioColor }]}>
                          Ratio: {ratioVal.toFixed(1)}x
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={st.progressSection}>
                    <View style={st.progressLabelRow}>
                      <Text style={[st.progressLabel, { color: colors.textMuted }]}>Progression</Text>
                      <Text style={[st.progressLabel, { color: colors.textMuted }]}>
                        {Math.round(m.progress * 100)}%
                      </Text>
                    </View>
                    <ProgressBar
                      progress={m.progress}
                      color={colors.primary}
                      trackColor={isDark ? '#1e3a31' : '#f1f5f9'}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Prochaines échéances */}
      <View style={st.sectionBlock}>
        <View style={st.sectionHeaderRow}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>Prochaines échéances</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Marches')}>
            <Text style={[st.seeAll, { color: colors.primary }]}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        {deadlines.length > 0 ? (
          <View style={[st.deadlineCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            {deadlines.slice(0, 4).map((d, idx) => {
              const dt = new Date(d.dateFin);
              const month = dt.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
              const day = dt.getDate();
              const isUrgent = idx === 0;
              const calBg = isUrgent
                ? isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'
                : isDark ? colors.surface : '#f8fafc';
              const calColor = isUrgent ? '#ef4444' : isDark ? colors.textMuted : '#64748b';
              return (
                <TouchableOpacity
                  key={d.id}
                  activeOpacity={0.8}
                  onPress={() => navigateToMarche(d.id)}
                  style={[
                    st.deadlineRow,
                    idx < deadlines.slice(0, 4).length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                    },
                  ]}
                >
                  <View style={[st.calendarBox, { backgroundColor: calBg }]}>
                    <Text style={[st.calMonth, { color: calColor }]}>{month}</Text>
                    <Text style={[st.calDay, { color: calColor }]}>{day}</Text>
                  </View>
                  <View style={st.deadlineInfo}>
                    <Text style={[st.deadlineTitle, { color: colors.text }]}>{d.libelle}</Text>
                    <Text style={[st.deadlineCode, { color: colors.textMuted }]}>{d.code}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={[st.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <View style={st.emptyIconWrap}>
              <Calendar size={32} color={colors.textMuted} />
            </View>
            <Text style={[st.emptyText, { color: colors.textSecondary }]}>
              Aucune échéance proche
            </Text>
            <Text style={[st.emptySubtext, { color: colors.textMuted }]}>
              Les échéances de vos marchés apparaîtront ici
            </Text>
          </View>
        )}
      </View>

      {/* Alertes récentes */}
      <View style={st.sectionBlock}>
        <View style={st.sectionHeaderRow}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>Alertes récentes</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Alertes')}>
            <Text style={[st.detailsLink, { color: colors.primary }]}>Tout voir</Text>
          </TouchableOpacity>
        </View>
        {recentAlerts.length > 0 ? (
          <View style={[st.alertsCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            {recentAlerts.slice(0, 4).map((a, idx) => {
              const alertStyle = getAlertIcon(a.sujet);
              return (
                <View
                  key={a.id}
                  style={[
                    st.alertRow,
                    idx < recentAlerts.slice(0, 4).length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                    },
                  ]}
                >
                  <View style={[st.alertIconCircle, { backgroundColor: alertStyle.bg }]}>
                    {alertStyle.icon}
                  </View>
                  <View style={st.alertInfo}>
                    <Text style={[st.alertTitle, { color: colors.text }]}>{a.sujet}</Text>
                    <Text style={[st.alertTime, { color: colors.textMuted }]}>
                      {formatTimeAgo(a.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[st.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <View style={st.emptyIconWrap}>
              <Bell size={32} color={colors.textMuted} />
            </View>
            <Text style={[st.emptyText, { color: colors.textSecondary }]}>
              Aucune alerte récente
            </Text>
          </View>
        )}
      </View>

      {/* Activités */}
      <View style={st.sectionBlock}>
        <View style={st.sectionHeaderRow}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>Activités</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Activites')}>
            <Text style={[st.detailsLink, { color: colors.primary }]}>Tout voir</Text>
          </TouchableOpacity>
        </View>

        {/* KPI cards row */}
        <View style={st.kpiGrid}>
          <View style={[st.kpiCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[st.kpiLabel, { color: colors.textMuted }]}>Total</Text>
            <Text style={[st.kpiValue, { color: colors.primary }]}>
              {kpis.activitesTotal ?? 0}
            </Text>
          </View>
          <View style={[st.kpiCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[st.kpiLabel, { color: colors.textMuted }]}>Actives</Text>
            <Text style={[st.kpiValue, { color: colors.primary }]}>
              {kpis.activitesActives ?? 0}
            </Text>
          </View>
        </View>

        {/* Solde global card */}
        {(kpis.activitesTotal ?? 0) > 0 && (
          <View style={[st.kpiCard, {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            marginBottom: spacing.smd,
          }]}>
            <Text style={[st.kpiLabel, { color: colors.textMuted }]}>Solde Global Activités</Text>
            <Text style={[st.kpiValue, {
              color: (kpis.activitesSoldeGlobal ?? 0) >= 0 ? colors.primary : '#ef4444',
            }]}>
              {formatShort(kpis.activitesSoldeGlobal ?? 0)}
              <Text style={[st.kpiSuffix, { color: colors.textMuted }]}> FCFA</Text>
            </Text>
          </View>
        )}

        {/* Recent activités list */}
        {recentActivites.length > 0 ? (
          <View style={[st.alertsCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            {recentActivites.slice(0, 4).map((a, idx) => (
              <TouchableOpacity
                key={a.id}
                activeOpacity={0.8}
                onPress={() => (navigation as any).navigate('Activites', { screen: 'ActiviteDetail', params: { id: a.id } })}
                style={[
                  st.alertRow,
                  idx < recentActivites.slice(0, 4).length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                  },
                ]}
              >
                <View style={[st.alertIconCircle, { backgroundColor: colors.primaryTint }]}>
                  <Activity size={16} color={colors.primary} />
                </View>
                <View style={st.alertInfo}>
                  <Text style={[st.alertTitle, { color: colors.text }]} numberOfLines={1}>{a.libelle}</Text>
                  <Text style={[st.alertTime, { color: colors.textMuted }]}>
                    {a.code} · {a.type} · {formatShort(a.soldeXOF)} FCFA
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[st.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <View style={st.emptyIconWrap}>
              <Activity size={32} color={colors.textMuted} />
            </View>
            <Text style={[st.emptyText, { color: colors.textSecondary }]}>
              Aucune activité
            </Text>
            <Text style={[st.emptySubtext, { color: colors.textMuted }]}>
              Vos activités récentes apparaîtront ici
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.mld,
    paddingBottom: spacing.xxl * 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { fontFamily: typography.fontFamily.regular },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  headerDate: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
    marginTop: 2,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 183, 127, 0.1)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarSmallText: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.bold,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b77f',
    borderWidth: 2,
  },

  // Hero
  heroCard: {
    backgroundColor: '#10b77f',
    borderRadius: 16,
    padding: spacing.mld,
    marginBottom: spacing.md,
    shadowColor: '#10b77f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  heroLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: 'rgba(255,255,255,0.9)',
  },
  heroWalletIcon: {},
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroValue: {
    fontSize: 30,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    color: '#fff',
  },
  heroSuffix: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    color: 'rgba(255,255,255,0.8)',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.smd,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: '#fff',
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    gap: spacing.smd,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiLabel: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.xs,
  },
  kpiValue: {
    fontSize: typography.fontSizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  kpiAmountRow: { flexDirection: 'row', alignItems: 'baseline' },
  kpiSuffix: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.regular,
  },
  kpiSub: {
    fontSize: 10,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  kpiEvolution: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
    marginTop: 2,
  },

  // Sections
  sectionBlock: { marginBottom: spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.smd,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  sectionTitleLight: {
    fontWeight: '400',
    fontSize: typography.fontSizes.sm,
  },
  detailsLink: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
  },
  seeAll: { fontSize: typography.fontSizes.xs },

  // Chart
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 6,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: '100%',
    height: 80,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    fontFamily: typography.fontFamily.regular,
    marginTop: 4,
  },
  barLabelBold: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },

  // Watch cards
  watchCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.smd,
  },
  watchTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.smd,
  },
  watchInfo: { flex: 1, marginRight: spacing.sm },
  watchTitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  watchCode: {
    fontSize: 10,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  ratioBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  ratioText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  progressSection: { gap: 6 },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
  },

  // Deadlines
  deadlineCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  calendarBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonth: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  calDay: {
    fontSize: typography.fontSizes.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    lineHeight: 20,
  },
  deadlineInfo: { flex: 1 },
  deadlineTitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  deadlineCode: {
    fontSize: 10,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },

  // Alerts section
  alertsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.smd,
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: { fontSize: 16 },
  alertInfo: { flex: 1 },
  alertTitle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  alertTime: {
    fontSize: 10,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },

  // Empty state
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyIconWrap: { marginBottom: spacing.sm },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
});
