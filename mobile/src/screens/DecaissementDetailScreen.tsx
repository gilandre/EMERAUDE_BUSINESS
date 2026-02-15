import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { FileText, Camera, Download, Edit2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { apiFetch, API_BASE, getToken } from '../api/client';
import { ErrorState } from '../components/ErrorState';

type NavParams = { DecaissementDetail: { id: string } };

interface Justificatif {
  id: string;
  nom: string;
  type: string;
  date: string;
}

interface DecaissementData {
  id: string;
  reference: string;
  montant: number;
  statut: string;
  dateDecaissement: string;
  beneficiaire: string;
  motif: string;
  modePaiement: string;
  source: string;
}

export function DecaissementDetailScreen() {
  const route = useRoute<RouteProp<NavParams, 'DecaissementDetail'>>();
  const navigation = useNavigation<any>();
  const id = route.params?.id ?? '';
  const { colors, isDark } = useTheme();

  const [decaissement, setDecaissement] = useState<DecaissementData | null>(null);
  const [justificatifs, setJustificatifs] = useState<Justificatif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const [decRes, justifRes] = await Promise.all([
        apiFetch<any>(`/api/decaissements/${id}`),
        apiFetch<any>(`/api/justificatifs?entityType=Decaissement&entityId=${id}`).catch(() => ({ justificatifs: [] })),
      ]);

      const d = decRes.decaissement || decRes;
      setDecaissement({
        id: d.id,
        reference: d.reference || d.code || `DEC-${d.id?.slice(0, 8) || ''}`,
        montant: d.montant || 0,
        statut: d.statut || 'Inconnu',
        dateDecaissement: d.dateDecaissement || d.date || d.createdAt || '',
        beneficiaire: d.beneficiaire?.nom || d.beneficiaireNom || d.beneficiaire || '',
        motif: d.motif || d.libelle || d.objet || '',
        modePaiement: d.modePaiement || 'Non renseigné',
        source: d.source || d.sourceFonds || 'Trésorerie',
      });

      const justifs = justifRes.justificatifs || justifRes.data || [];
      setJustificatifs(justifs.map((j: any) => ({
        id: j.id,
        nom: j.nom || j.filename || j.originalName || 'Document',
        type: j.type || j.mimeType?.split('/').pop()?.toUpperCase() || 'Fichier',
        date: j.createdAt || j.date || '',
      })));
    } catch {
      setError(true);
      setDecaissement(null);
      setJustificatifs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleDownload = async (justifId: string, nom: string) => {
    try {
      const token = await getToken();
      const url = `${API_BASE}/api/justificatifs/${justifId}/download`;
      const FileSystem = require('expo-file-system');
      const Sharing = require('expo-sharing');

      const fileUri = `${FileSystem.documentDirectory}${nom}`;
      const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (downloadResult.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert('Succès', `Fichier téléchargé : ${nom}`);
        }
      } else {
        Alert.alert('Erreur', 'Le téléchargement a échoué');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger le document. Vérifiez votre connexion.');
    }
  };

  const handleDeleteJustificatif = async (justifId: string) => {
    Alert.alert(
      'Confirmer',
      'Voulez-vous supprimer ce justificatif ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/justificatifs/${justifId}`, { method: 'DELETE' });
              fetchData();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer le justificatif');
            }
          },
        },
      ],
    );
  };

  const formatMontant = (n: number) => {
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
    return `${fmt} FCFA`;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getStatutVariant = (s: string) => {
    const lower = (s || '').toLowerCase();
    if (lower === 'payé' || lower === 'paye' || lower === 'valide') return 'success' as const;
    if (lower === 'validé' || lower === 'en_attente' || lower === 'en attente') return 'warning' as const;
    if (lower === 'prévu' || lower === 'prevu') return 'neutral' as const;
    return 'neutral' as const;
  };

  if (loading) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) return <ErrorState onRetry={fetchData} />;

  const statut = decaissement?.statut || 'Inconnu';
  const montant = decaissement?.montant || 0;
  const reference = decaissement?.reference || '';

  const details = [
    { label: 'Bénéficiaire', value: decaissement?.beneficiaire || 'Non renseigné' },
    { label: 'Motif', value: decaissement?.motif || 'Non renseigné' },
    { label: 'Date', value: formatDate(decaissement?.dateDecaissement || '') },
    { label: 'Mode de paiement', value: decaissement?.modePaiement || 'Non renseigné' },
    { label: 'Source', value: decaissement?.source || 'Trésorerie' },
  ];

  return (
    <ScrollView
      style={[st.container, { backgroundColor: colors.background }]}
      contentContainerStyle={st.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Status Badge - Centered */}
      <View style={st.statusSection}>
        <Badge label={statut} variant={getStatutVariant(statut)} />
      </View>

      {/* Large Amount Display */}
      <View style={st.amountSection}>
        <Text style={[st.amountValue, { color: colors.text }]}>{formatMontant(montant)}</Text>
        <Text style={[st.reference, { color: colors.textMuted }]}>Réf. {reference}</Text>
      </View>

      {/* Detail Table */}
      <View style={[st.detailCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        {details.map((d, idx) => (
          <View
            key={d.label}
            style={[
              st.detailRow,
              idx < details.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
            ]}
          >
            <Text style={[st.detailLabel, { color: colors.textMuted }]}>{d.label}</Text>
            <Text style={[st.detailValue, { color: colors.text }]}>{d.value}</Text>
          </View>
        ))}
      </View>

      {/* Justificatifs Section */}
      <SectionHeader title="Justificatifs" />

      {justificatifs.map((j) => (
        <View
          key={j.id}
          style={[st.justifCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
        >
          <View style={[st.justifIcon, { backgroundColor: colors.primaryTint }]}>
            <FileText size={20} color={colors.primary} />
          </View>
          <View style={st.justifInfo}>
            <Text style={[st.justifNom, { color: colors.text }]}>{j.nom}</Text>
            <Text style={[st.justifMeta, { color: colors.textMuted }]}>
              {j.type}{j.date ? ` - ${new Date(j.date).toLocaleDateString('fr-FR')}` : ''}
            </Text>
          </View>
          <View style={st.justifActions}>
            <TouchableOpacity style={st.justifActionBtn} onPress={() => handleDownload(j.id, j.nom)}>
              <Download size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={st.justifActionBtn} onPress={() => handleDeleteJustificatif(j.id)}>
              <Edit2 size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {justificatifs.length === 0 && (
        <View style={[st.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <FileText size={32} color={colors.textMuted} />
          <Text style={[st.emptyText, { color: colors.textSecondary }]}>
            Aucun justificatif ajouté
          </Text>
        </View>
      )}

      {/* Add Justificatif Button */}
      <Button
        title="Ajouter un nouveau justificatif"
        onPress={() => navigation.navigate('AjouterJustificatif', { decaissementId: id })}
        variant="outline"
        size="lg"
        style={st.addBtn}
        icon={<Camera size={18} color={colors.primary} />}
      />

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Status
  statusSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  // Amount
  amountSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  amountValue: {
    fontSize: typography.fontSizes.hero,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  reference: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
  },

  // Detail Table
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  detailLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  detailValue: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },

  // Justificatifs
  justifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.smd,
  },
  justifIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  justifInfo: {
    flex: 1,
  },
  justifNom: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  justifMeta: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xxs,
  },
  justifActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  justifActionBtn: {
    padding: spacing.xs,
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

  // Add button
  addBtn: {
    marginTop: spacing.md,
  },
});
