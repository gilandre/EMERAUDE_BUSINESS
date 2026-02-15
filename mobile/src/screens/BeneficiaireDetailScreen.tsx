import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Building2, CreditCard, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { apiFetch } from '../api/client';

type NavParams = { BeneficiaireDetail: { id: string } };

interface Transaction {
  id: string;
  libelle: string;
  date: string;
  montant: number;
  statut: string;
}

interface BeneficiaireDetail {
  id: string;
  code: string;
  nom: string;
  type: string;
  modePaiement: string | null;
  banque: string | null;
  actif: boolean;
  totalPaye: number;
  decaissements?: Transaction[];
}

export function BeneficiaireDetailScreen() {
  const route = useRoute<RouteProp<NavParams, 'BeneficiaireDetail'>>();
  const id = route.params?.id ?? '';
  const { colors, isDark } = useTheme();

  const [beneficiaire, setBeneficiaire] = useState<BeneficiaireDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<any>(`/api/beneficiaires/${id}`);
      const b = res.beneficiaire || res;
      setBeneficiaire(b);
      // The detail endpoint returns decaissements as part of the response
      const decaissements = b.decaissements || res.decaissements || [];
      setTransactions(decaissements.map((d: any) => ({
        id: d.id,
        libelle: d.libelle || d.motif || d.objet || `Décaissement ${d.reference || ''}`,
        date: d.dateDecaissement || d.createdAt || d.date,
        montant: d.montant || 0,
        statut: d.statut || 'Payé',
      })));
    } catch {
      setBeneficiaire(null);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const formatMontant = (n: number) => {
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
    return `${fmt} FCFA`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const getStatutVariant = (s: string) => {
    const lower = s.toLowerCase();
    if (lower === 'payé' || lower === 'paye' || lower === 'valide' || lower === 'VALIDE') return 'success' as const;
    if (lower === 'validé' || lower === 'en_attente' || lower === 'en attente') return 'warning' as const;
    return 'neutral' as const;
  };

  const totalPaye = transactions.reduce((sum, t) => sum + t.montant, 0);

  if (loading) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const nom = beneficiaire?.nom || 'Bénéficiaire';
  const modePaiement = beneficiaire?.modePaiement || 'Non renseigné';
  const banque = beneficiaire?.banque || 'Non renseignée';
  const actif = beneficiaire?.actif ?? false;

  return (
    <ScrollView
      style={[st.container, { backgroundColor: colors.background }]}
      contentContainerStyle={st.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Profile Header */}
      <View style={st.profileSection}>
        <View style={[st.avatar, { backgroundColor: colors.primaryTint }]}>
          <Building2 size={32} color={colors.primary} />
        </View>
        <Text style={[st.name, { color: colors.text }]}>{nom}</Text>
        {actif && <Badge label="Partenaire Actif" variant="success" />}
      </View>

      {/* Info Cards */}
      <View style={[st.infoCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={st.infoRow}>
          <Text style={[st.infoLabel, { color: colors.textMuted }]}>Total payé</Text>
          <Text style={[st.infoValue, { color: colors.primary }]}>{formatMontant(beneficiaire?.totalPaye ?? totalPaye)}</Text>
        </View>
        <View style={[st.divider, { backgroundColor: colors.borderLight }]} />
        <View style={st.infoRow}>
          <View style={st.infoRowLeft}>
            <CreditCard size={16} color={colors.textMuted} />
            <Text style={[st.infoLabel, { color: colors.textMuted, marginLeft: spacing.sm }]}>Mode paiement</Text>
          </View>
          <Text style={[st.infoValueSmall, { color: colors.text }]}>{modePaiement}</Text>
        </View>
        <View style={[st.divider, { backgroundColor: colors.borderLight }]} />
        <View style={st.infoRow}>
          <View style={st.infoRowLeft}>
            <Building2 size={16} color={colors.textMuted} />
            <Text style={[st.infoLabel, { color: colors.textMuted, marginLeft: spacing.sm }]}>Banque</Text>
          </View>
          <Text style={[st.infoValueSmall, { color: colors.text }]}>{banque}</Text>
        </View>
      </View>

      {/* Historique des Transactions */}
      <SectionHeader title="Historique des Transactions" />

      {transactions.length > 0 ? (
        transactions.map((tx) => (
          <TouchableOpacity
            key={tx.id}
            activeOpacity={0.8}
            style={[st.txCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
          >
            <View style={st.txLeft}>
              <Text style={[st.txLibelle, { color: colors.text }]}>{tx.libelle}</Text>
              <Text style={[st.txDate, { color: colors.textMuted }]}>{formatDate(tx.date)}</Text>
            </View>
            <View style={st.txRight}>
              <Text style={[st.txMontant, { color: colors.text }]}>{formatMontant(tx.montant)}</Text>
              <Badge label={tx.statut} variant={getStatutVariant(tx.statut)} />
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))
      ) : (
        <View style={[st.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[st.emptyText, { color: colors.textMuted }]}>
            Aucune transaction trouvée
          </Text>
        </View>
      )}

      {/* Action Button */}
      <Button
        title="Nouveau Paiement"
        onPress={() => {}}
        size="lg"
        style={st.actionBtn}
        icon={<CreditCard size={18} color="#fff" />}
      />

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Profile
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.smd,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: typography.fontSizes.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Info Card
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.smd,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  infoValue: {
    fontSize: typography.fontSizes.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  infoValueSmall: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },

  // Transactions
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  txLeft: {
    flex: 1,
  },
  txLibelle: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  txDate: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xxs,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  txMontant: {
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

  // Action
  actionBtn: {
    marginTop: spacing.lg,
  },
});
