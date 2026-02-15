import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Car, Filter, Bell } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { Badge } from '../components/Badge';
import { apiFetch } from '../api/client';
import { ErrorState } from '../components/ErrorState';

interface FraisDeplacement {
  id: string;
  libelle: string;
  date: string;
  contrat: string;
  statut: string;
  montant: number;
}

interface MarcheItem {
  id: string;
  code: string;
  libelle: string;
}

export function FraisDeplacementScreen() {
  const { colors, isDark } = useTheme();
  const [items, setItems] = useState<FraisDeplacement[]>([]);
  const [marches, setMarches] = useState<MarcheItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContrat, setSelectedContrat] = useState('Tous');
  const [selectedFrais, setSelectedFrais] = useState<FraisDeplacement | null>(null);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50');
      if (selectedContrat !== 'Tous') {
        // Find the marche id from the code
        const marche = marches.find(m => m.code === selectedContrat);
        if (marche) params.set('marcheId', marche.id);
      }

      const [fraisRes, marchesRes] = await Promise.all([
        apiFetch<any>(`/api/frais-deplacements?${params}`),
        marches.length === 0
          ? apiFetch<any>('/api/marches?pageSize=100')
          : Promise.resolve(null),
      ]);

      const fraisData = fraisRes.fraisDeplacements || fraisRes.data || [];
      setItems(fraisData.map((f: any) => ({
        id: f.id,
        libelle: f.libelle || f.description || f.objet || '',
        date: f.date || f.dateDeplacement || f.createdAt || '',
        contrat: f.marche?.code || f.marcheCode || '',
        statut: f.statut || 'En attente',
        montant: f.montant || 0,
      })));

      if (marchesRes) {
        const marchesData = marchesRes.data || marchesRes.marches || [];
        setMarches(marchesData.map((m: any) => ({
          id: m.id,
          code: m.code,
          libelle: m.libelle,
        })));
      }
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedContrat, marches]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const contratOptions = ['Tous', ...marches.map(m => m.code)];

  const formatMontant = (n: number) => {
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
    return `${fmt} FCFA`;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getStatutVariant = (s: string) => {
    const lower = (s || '').toLowerCase();
    if (lower === 'validé' || lower === 'valide' || lower === 'approuve' || lower === 'approuvé') return 'success' as const;
    if (lower === 'en attente' || lower === 'en_attente' || lower === 'brouillon' || lower === 'soumis') return 'warning' as const;
    if (lower === 'rejeté' || lower === 'rejete') return 'error' as const;
    return 'neutral' as const;
  };

  const totalEnAttente = items
    .filter((f) => {
      const lower = (f.statut || '').toLowerCase();
      return lower === 'en attente' || lower === 'en_attente' || lower === 'soumis';
    })
    .reduce((sum, f) => sum + f.montant, 0);

  if (loading) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) return <ErrorState onRetry={fetchData} />;

  return (
    <ScrollView
      style={[st.container, { backgroundColor: colors.background }]}
      contentContainerStyle={st.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Banner */}
      <View style={[st.banner, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7' }]}>
        <View style={st.bannerLeft}>
          <Car size={24} color={isDark ? '#f59e0b' : '#d97706'} />
          <View style={st.bannerText}>
            <Text style={[st.bannerLabel, { color: isDark ? '#fbbf24' : '#92400e' }]}>
              Total en attente
            </Text>
            <Text style={[st.bannerAmount, { color: isDark ? '#fbbf24' : '#92400e' }]}>
              {formatMontant(totalEnAttente)}
            </Text>
          </View>
        </View>
        <Bell size={20} color={isDark ? '#fbbf24' : '#d97706'} />
      </View>

      {/* Filter Chips */}
      <View style={st.filterRow}>
        <Filter size={16} color={colors.textMuted} style={st.filterIcon} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.chipsContainer}
        >
          {contratOptions.map((contrat) => {
            const isActive = selectedContrat === contrat;
            return (
              <TouchableOpacity
                key={contrat}
                onPress={() => setSelectedContrat(contrat)}
                style={[
                  st.chip,
                  {
                    backgroundColor: isActive ? colors.primary : isDark ? colors.surface : colors.borderLight,
                    borderColor: isActive ? colors.primary : colors.borderLight,
                  },
                ]}
              >
                <Text
                  style={[
                    st.chipText,
                    { color: isActive ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {contrat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Expenses List */}
      {items.map((frais) => (
        <TouchableOpacity
          key={frais.id}
          activeOpacity={0.8}
          style={[st.fraisCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
          onPress={() => setSelectedFrais(frais)}
        >
          <View style={st.fraisTop}>
            <View style={st.fraisInfo}>
              <Text style={[st.fraisLibelle, { color: colors.text }]}>{frais.libelle}</Text>
              <View style={st.fraisMeta}>
                <Text style={[st.fraisDate, { color: colors.textMuted }]}>{formatDate(frais.date)}</Text>
                <View style={[st.dot, { backgroundColor: colors.textMuted }]} />
                <Text style={[st.fraisContrat, { color: colors.textMuted }]}>{frais.contrat}</Text>
              </View>
            </View>
            <View style={st.fraisRight}>
              <Text style={[st.fraisMontant, { color: colors.text }]}>{formatMontant(frais.montant)}</Text>
              <Badge label={frais.statut} variant={getStatutVariant(frais.statut)} />
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {items.length === 0 && (
        <View style={[st.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Car size={32} color={colors.textMuted} />
          <Text style={[st.emptyText, { color: colors.textSecondary }]}>
            Aucun frais pour ce contrat
          </Text>
        </View>
      )}

      <View style={{ height: spacing.xxl }} />

      {/* Detail Modal */}
      <Modal visible={!!selectedFrais} transparent animationType="slide" onRequestClose={() => setSelectedFrais(null)}>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.card }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>Détail du frais</Text>
              <TouchableOpacity onPress={() => setSelectedFrais(null)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selectedFrais && (
              <>
                <View style={st.modalRow}>
                  <Text style={[st.modalLabel, { color: colors.textMuted }]}>Libellé</Text>
                  <Text style={[st.modalValue, { color: colors.text }]}>{selectedFrais.libelle}</Text>
                </View>
                <View style={st.modalRow}>
                  <Text style={[st.modalLabel, { color: colors.textMuted }]}>Montant</Text>
                  <Text style={[st.modalValue, { color: colors.primary }]}>{formatMontant(selectedFrais.montant)}</Text>
                </View>
                <View style={st.modalRow}>
                  <Text style={[st.modalLabel, { color: colors.textMuted }]}>Date</Text>
                  <Text style={[st.modalValue, { color: colors.text }]}>{formatDate(selectedFrais.date)}</Text>
                </View>
                <View style={st.modalRow}>
                  <Text style={[st.modalLabel, { color: colors.textMuted }]}>Contrat</Text>
                  <Text style={[st.modalValue, { color: colors.text }]}>{selectedFrais.contrat}</Text>
                </View>
                <View style={st.modalRow}>
                  <Text style={[st.modalLabel, { color: colors.textMuted }]}>Statut</Text>
                  <Badge label={selectedFrais.statut} variant={getStatutVariant(selectedFrais.statut)} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Banner
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  bannerText: {},
  bannerLabel: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
  },
  bannerAmount: {
    fontSize: typography.fontSizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterIcon: {
    marginRight: spacing.sm,
  },
  chipsContainer: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
  },

  // Frais Card
  fraisCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  fraisTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fraisInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  fraisLibelle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  fraisMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fraisDate: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  fraisContrat: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
  },
  fraisRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  fraisMontant: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },

  // Empty
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.smd,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
    fontWeight: '700',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.smd,
  },
  modalLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  modalValue: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
});
