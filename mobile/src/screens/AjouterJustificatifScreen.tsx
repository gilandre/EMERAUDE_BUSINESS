import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Camera, Upload, Info, CheckCircle, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { apiFetch, API_BASE, getToken } from '../api/client';

type NavParams = { AjouterJustificatif: { decaissementId: string } };

interface DecaissementRecap {
  beneficiaire: string;
  montant: number;
  date: string;
  statut: string;
}

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
}

export function AjouterJustificatifScreen() {
  const route = useRoute<RouteProp<NavParams, 'AjouterJustificatif'>>();
  const navigation = useNavigation<any>();
  const decaissementId = route.params?.decaissementId ?? '';
  const { colors, isDark } = useTheme();

  const [recap, setRecap] = useState<DecaissementRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDecaissement = useCallback(async () => {
    try {
      const res = await apiFetch<any>(`/api/decaissements/${decaissementId}`);
      const d = res.decaissement || res;
      setRecap({
        beneficiaire: d.beneficiaire?.nom || d.beneficiaireNom || d.beneficiaire || 'Non renseigné',
        montant: d.montant || 0,
        date: d.dateDecaissement || d.date || d.createdAt || '',
        statut: d.statut || 'Payé',
      });
    } catch {
      setRecap(null);
    } finally {
      setLoading(false);
    }
  }, [decaissementId]);

  useEffect(() => { fetchDecaissement(); }, [fetchDecaissement]);

  const formatMontant = (n: number) => {
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
    return `${fmt} FCFA`;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() || 'photo.jpg';
      setSelectedFile({
        uri: asset.uri,
        name: fileName,
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const pickFromDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name || 'document',
          type: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Alert.alert('Erreur', 'Veuillez sélectionner un fichier');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
      } as any);
      formData.append('entityType', 'Decaissement');
      formData.append('entityId', decaissementId);
      if (details.trim()) {
        formData.append('description', details.trim());
      }

      const res = await fetch(`${API_BASE}/api/justificatifs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).error || 'Erreur lors de l\'envoi');
      }

      Alert.alert('Succès', 'Justificatif ajouté avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d\'envoyer le justificatif');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[st.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
      >
        {/* Recap Card */}
        <View style={[st.recapCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={st.recapHeader}>
            <Text style={[st.recapTitle, { color: colors.text }]}>Récapitulatif du décaissement</Text>
            <Badge label={recap?.statut || 'Payé'} variant="success" />
          </View>
          <View style={[st.recapDivider, { backgroundColor: colors.borderLight }]} />
          <View style={st.recapRow}>
            <Text style={[st.recapLabel, { color: colors.textMuted }]}>Bénéficiaire</Text>
            <Text style={[st.recapValue, { color: colors.text }]}>{recap?.beneficiaire || 'Non renseigné'}</Text>
          </View>
          <View style={st.recapRow}>
            <Text style={[st.recapLabel, { color: colors.textMuted }]}>Montant</Text>
            <Text style={[st.recapValue, { color: colors.primary }]}>{formatMontant(recap?.montant || 0)}</Text>
          </View>
          <View style={st.recapRow}>
            <Text style={[st.recapLabel, { color: colors.textMuted }]}>Date</Text>
            <Text style={[st.recapValue, { color: colors.text }]}>{formatDate(recap?.date || '')}</Text>
          </View>
        </View>

        {/* Details Input */}
        <SectionHeader title="Détails de l'utilisation" />
        <View style={[st.textAreaWrapper, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <TextInput
            style={[st.textArea, { color: colors.text }]}
            placeholder="Décrivez comment les fonds ont été utilisés..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={details}
            onChangeText={setDetails}
          />
        </View>

        {/* Upload Zone */}
        <SectionHeader title="Pièce justificative" />

        {selectedFile ? (
          <View style={[st.selectedFileCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={st.selectedFileRow}>
              <CheckCircle size={20} color={colors.primary} />
              <View style={st.selectedFileInfo}>
                <Text style={[st.selectedFileName, { color: colors.text }]} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={[st.selectedFileType, { color: colors.textMuted }]}>
                  {selectedFile.type}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)} style={st.removeFileBtn}>
                <X size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
            {selectedFile.type.startsWith('image/') && (
              <Image
                source={{ uri: selectedFile.uri }}
                style={st.previewImage}
                resizeMode="cover"
              />
            )}
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[st.uploadZone, { borderColor: colors.primary }]}
            onPress={pickFromDocuments}
          >
            <View style={[st.uploadIconCircle, { backgroundColor: colors.primaryTint }]}>
              <Camera size={28} color={colors.primary} />
            </View>
            <Text style={[st.uploadTitle, { color: colors.text }]}>
              Ajouter une photo ou un fichier
            </Text>
            <Text style={[st.uploadSubtitle, { color: colors.textMuted }]}>
              Appuyez pour prendre une photo ou choisir un fichier
            </Text>
            <View style={st.uploadActions}>
              <TouchableOpacity
                style={[st.uploadActionChip, { backgroundColor: colors.primaryTint }]}
                onPress={pickFromCamera}
              >
                <Camera size={14} color={colors.primary} />
                <Text style={[st.uploadActionText, { color: colors.primary }]}>Caméra</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.uploadActionChip, { backgroundColor: colors.primaryTint }]}
                onPress={pickFromDocuments}
              >
                <Upload size={14} color={colors.primary} />
                <Text style={[st.uploadActionText, { color: colors.primary }]}>Fichier</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* Info Banner */}
        <View style={[st.infoBanner, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#eff6ff' }]}>
          <Info size={18} color={isDark ? '#818cf8' : '#3b82f6'} />
          <Text style={[st.infoText, { color: isDark ? '#c7d2fe' : '#1e40af' }]}>
            Le justificatif est obligatoire pour les décaissements supérieurs à 500 000 FCFA.
            Il sera vérifié par le responsable du marché.
          </Text>
        </View>

        {/* Submit Button */}
        <Button
          title="Enregistrer les détails"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || !selectedFile}
          size="lg"
          style={st.submitBtn}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Recap Card
  recapCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  recapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.smd,
  },
  recapTitle: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  recapDivider: {
    height: 1,
    marginBottom: spacing.smd,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  recapLabel: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.medium,
  },
  recapValue: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },

  // Text Area
  textAreaWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  textArea: {
    padding: spacing.md,
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.regular,
    minHeight: 140,
  },

  // Upload Zone
  uploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  uploadTitle: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  uploadSubtitle: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  uploadActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  uploadActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  uploadActionText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
  },

  // Selected File
  selectedFileCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedFileInfo: {
    flex: 1,
  },
  selectedFileName: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
  },
  selectedFileType: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  removeFileBtn: {
    padding: spacing.xs,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.smd,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 18,
  },

  // Submit
  submitBtn: {
    marginTop: spacing.sm,
  },
});
