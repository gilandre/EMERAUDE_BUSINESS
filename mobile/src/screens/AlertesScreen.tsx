import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  CreditCard,
  ArrowDownLeft,
  FileText,
  AlertTriangle,
  Clock,
  Bell,
} from 'lucide-react-native';
import { Badge } from '../components/Badge';
import { typography, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../api/client';
import { ErrorState } from '../components/ErrorState';

interface Notification {
  id: string;
  sujet: string | null;
  corps: string;
  lu: boolean;
  luAt: string | null;
  createdAt: string;
  alerte?: { id: string; code: string; libelle: string };
  type?: string;
}

interface NotifResponse {
  data: Notification[];
  unreadCount: number;
  nextCursor: string | null;
  hasMore: boolean;
}

interface EventStyle {
  icon: (color: string) => React.ReactNode;
  borderColor: string;
  bg: string;
  severity: 'URGENT' | 'AVERTISSEMENT' | 'SUCCES';
}

const EVENT_STYLES: Record<string, EventStyle> = {
  DECAISSEMENT_VALIDE: { icon: (c) => <CreditCard size={16} color={c} />, borderColor: '#f59e0b', bg: 'rgba(245,158,11,0.1)', severity: 'AVERTISSEMENT' },
  ACOMPTE_RECU:        { icon: (c) => <ArrowDownLeft size={16} color={c} />, borderColor: '#10b77f', bg: 'rgba(16,183,127,0.1)', severity: 'SUCCES' },
  MARCHE_CREE:         { icon: (c) => <FileText size={16} color={c} />, borderColor: '#6366f1', bg: 'rgba(99,102,241,0.1)', severity: 'SUCCES' },
  TRESORERIE_FAIBLE:   { icon: (c) => <AlertTriangle size={16} color={c} />, borderColor: '#ef4444', bg: 'rgba(239,68,68,0.1)', severity: 'URGENT' },
  DEADLINE_APPROCHANT: { icon: (c) => <Clock size={16} color={c} />, borderColor: '#f59e0b', bg: 'rgba(245,158,11,0.1)', severity: 'AVERTISSEMENT' },
};

const DEFAULT_STYLE: EventStyle = { icon: (c) => <Bell size={16} color={c} />, borderColor: '#10b77f', bg: 'rgba(16,183,127,0.1)', severity: 'SUCCES' };

export function AlertesScreen() {
  const { colors, isDark } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'all' | 'critiques'>('all');
  const [error, setError] = useState(false);

  const load = async () => {
    try {
      setError(false);
      const res = await apiFetch<NotifResponse>('/api/notifications?limit=50');
      setNotifications(res.data ?? []);
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      setError(true);
      setNotifications([]);
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

  const markAllRead = async () => {
    try {
      await apiFetch('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert('Erreur', 'Impossible de marquer les notifications comme lues');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ lu: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return 'À l\'instant';
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const criticalCount = notifications.filter((n) => {
    const code = n.alerte?.code || n.type || '';
    const style = EVENT_STYLES[code] || DEFAULT_STYLE;
    return style.severity === 'URGENT';
  }).length;

  const filtered = tab === 'critiques'
    ? notifications.filter((n) => {
        const code = n.alerte?.code || n.type || '';
        const style = EVENT_STYLES[code] || DEFAULT_STYLE;
        return style.severity === 'URGENT';
      })
    : notifications;

  const getStyle = (n: Notification) => {
    const code = n.alerte?.code || n.type || '';
    return EVENT_STYLES[code] || DEFAULT_STYLE;
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={[st.centered, { backgroundColor: colors.background }]}>
        <Text style={[st.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
      </View>
    );
  }

  if (error) return <ErrorState onRetry={load} />;

  return (
    <ScrollView
      style={[st.container, { backgroundColor: colors.background }]}
      contentContainerStyle={st.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header row with "Tout lire" */}
      {unreadCount > 0 && (
        <TouchableOpacity style={st.markAllRow} onPress={markAllRead}>
          <Text style={[st.markAllText, { color: colors.primary }]}>
            Tout marquer comme lu ({unreadCount})
          </Text>
        </TouchableOpacity>
      )}

      {/* Segmented tabs */}
      <View style={[st.segmented, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
        <TouchableOpacity
          style={[st.segmentBtn, tab === 'all' && [st.segmentActive, { backgroundColor: isDark ? colors.background : colors.surface }]]}
          onPress={() => setTab('all')}
        >
          <Text style={[st.segmentText, { color: colors.textSecondary }, tab === 'all' && [st.segmentTextActive, { color: colors.text }]]}>
            Toutes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.segmentBtn, tab === 'critiques' && [st.segmentActive, { backgroundColor: isDark ? colors.background : colors.surface }]]}
          onPress={() => setTab('critiques')}
        >
          <Text style={[st.segmentText, { color: colors.textSecondary }, tab === 'critiques' && [st.segmentTextActive, { color: colors.text }]]}>
            Critiques
          </Text>
          {criticalCount > 0 && (
            <View style={st.countBadge}>
              <Text style={st.countText}>{criticalCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <View style={st.emptyContainer}>
          <Bell size={48} color={colors.textMuted} />
          <Text style={[st.emptyTitle, { color: colors.text }]}>
            {tab === 'critiques' ? 'Aucune alerte critique' : 'Aucune notification'}
          </Text>
          <Text style={[st.emptySubtext, { color: colors.textSecondary }]}>
            {tab === 'critiques' ? 'Tout est sous contrôle !' : 'Les notifications apparaîtront ici'}
          </Text>
        </View>
      ) : (
        filtered.map((notif) => {
          const style = getStyle(notif);
          return (
            <TouchableOpacity
              key={notif.id}
              activeOpacity={0.8}
              onPress={() => !notif.lu && markAsRead(notif.id)}
            >
              <View
                style={[
                  st.alerteCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                    borderLeftColor: style.borderColor,
                    opacity: notif.lu ? 0.7 : 1,
                  },
                ]}
              >
                <View style={st.alerteHeader}>
                  <View style={[st.iconCircle, { backgroundColor: style.bg }]}>
                    {style.icon(style.borderColor)}
                  </View>
                  <View style={st.alerteContent}>
                    <View style={st.alerteTitleRow}>
                      <Text
                        style={[st.alerteTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {notif.sujet || notif.alerte?.libelle || 'Notification'}
                      </Text>
                      {!notif.lu && (
                        <View style={[st.unreadDot, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                    <Text
                      style={[st.alerteMessage, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {notif.corps}
                    </Text>
                    <View style={st.alerteFooterRow}>
                      <Text style={[st.alerteTime, { color: colors.textMuted }]}>
                        {formatTime(notif.createdAt)}
                      </Text>
                      <Badge
                        label={style.severity === 'URGENT' ? 'URGENT' : style.severity === 'AVERTISSEMENT' ? 'AVERTISSEMENT' : 'SUCCÈS'}
                        variant={style.severity === 'URGENT' ? 'error' : style.severity === 'AVERTISSEMENT' ? 'warning' : 'success'}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: typography.fontFamily.regular },

  markAllRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  markAllText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },

  segmented: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.smd,
    borderRadius: 12,
    gap: spacing.xs,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  segmentTextActive: {
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  countText: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.bold,
    color: '#fff',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyIcon: { marginBottom: spacing.md },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
  },

  alerteCard: {
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.smd,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  alerteHeader: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alerteIcon: { fontSize: 18 },
  alerteContent: { flex: 1 },
  alerteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  alerteTitle: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  alerteMessage: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  alerteTime: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  alerteFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
