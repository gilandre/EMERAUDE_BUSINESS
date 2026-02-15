import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Send, Paperclip, Info } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { typography, spacing } from '../theme';
import { Badge } from '../components/Badge';
import { apiFetch } from '../api/client';

type NavParams = { DiscussionMarche: { discussionId?: string; entityType?: string; entityId?: string } };

interface Message {
  id: string;
  type: 'user' | 'other' | 'system';
  sender?: string;
  text: string;
  time: string;
  attachment?: { name: string; type: string };
}

export function DiscussionMarcheScreen() {
  const route = useRoute<RouteProp<NavParams, 'DiscussionMarche'>>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const discussionId = route.params?.discussionId;
  const entityType = route.params?.entityType;
  const entityId = route.params?.entityId;

  const [discussionInfo, setDiscussionInfo] = useState<{
    name: string;
    statut: string;
    participantsCount: number;
    currentDiscussionId: string;
  }>({
    name: '',
    statut: '',
    participantsCount: 0,
    currentDiscussionId: discussionId || '',
  });

  const formatTime = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const fetchMessages = useCallback(async () => {
    try {
      let currentDiscId = discussionId;

      // If no discussion ID provided, find or create one
      if (!currentDiscId && entityType && entityId) {
        const discRes = await apiFetch<any>(`/api/discussions?entityType=${entityType}&entityId=${entityId}`);
        const discussions = discRes.discussions || discRes.data || [];
        if (discussions.length > 0) {
          currentDiscId = discussions[0].id;
        } else {
          // Create a new discussion
          const createRes = await apiFetch<any>('/api/discussions', {
            method: 'POST',
            body: JSON.stringify({ entityType, entityId }),
          });
          currentDiscId = createRes.discussion?.id || createRes.id;
        }
      }

      if (!currentDiscId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      setDiscussionInfo(prev => ({ ...prev, currentDiscussionId: currentDiscId || '' }));

      const res = await apiFetch<any>(`/api/discussions/${currentDiscId}/messages`);
      const rawMessages = res.messages || res.data || [];

      const userId = user?.id;
      const mappedMessages: Message[] = rawMessages.map((m: any) => {
        const isSystem = m.type === 'system' || m.isSystem;
        const isUser = m.userId === userId || m.senderId === userId;
        const senderName = m.sender?.name || m.senderName ||
          [m.sender?.prenom, m.sender?.nom].filter(Boolean).join(' ') || 'Inconnu';

        return {
          id: m.id,
          type: isSystem ? 'system' : (isUser ? 'user' : 'other'),
          sender: isSystem ? undefined : (isUser ? 'Vous' : senderName),
          text: m.contenu || m.content || m.text || '',
          time: formatTime(m.createdAt || m.date || ''),
          attachment: m.attachment ? {
            name: m.attachment.nom || m.attachment.name || 'Document',
            type: m.attachment.type || 'Fichier',
          } : undefined,
        };
      });

      setMessages(mappedMessages);

      // Update discussion info
      if (res.discussion) {
        setDiscussionInfo(prev => ({
          ...prev,
          name: res.discussion.titre || res.discussion.name || res.discussion.entityName || '',
          statut: res.discussion.statut || 'actif',
          participantsCount: res.discussion.participantsCount || res.discussion._count?.messages || 0,
        }));
      }
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [discussionId, entityType, entityId, user?.id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (discussionInfo.currentDiscussionId) {
        fetchMessages();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [discussionInfo.currentDiscussionId, fetchMessages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!discussionInfo.currentDiscussionId) {
      Alert.alert('Erreur', 'Discussion non trouvée');
      return;
    }

    const text = message.trim();
    setMessage('');
    setSending(true);

    // Optimistic update
    const tempId = String(Date.now());
    const tempMsg: Message = {
      id: tempId,
      type: 'user',
      sender: 'Vous',
      text,
      time: formatTime(new Date().toISOString()),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await apiFetch(`/api/discussions/${discussionInfo.currentDiscussionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ contenu: text }),
      });
      // Refresh to get real message with server ID
      fetchMessages();
    } catch {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessage(text); // Restore the message
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === 'system') {
      return (
        <View style={st.systemMessage}>
          <Text style={[st.systemText, { color: colors.textMuted }]}>{item.text}</Text>
          <Text style={[st.systemTime, { color: colors.textMuted }]}>{item.time}</Text>
        </View>
      );
    }

    const isUser = item.type === 'user';

    return (
      <View style={[st.messageRow, isUser && st.messageRowRight]}>
        {!isUser && (
          <View style={[st.msgAvatar, { backgroundColor: colors.primaryTint }]}>
            <Text style={[st.msgAvatarText, { color: colors.primary }]}>
              {item.sender?.charAt(0) ?? '?'}
            </Text>
          </View>
        )}
        <View
          style={[
            st.bubble,
            isUser
              ? { backgroundColor: colors.primary }
              : { backgroundColor: isDark ? colors.surface : colors.card, borderColor: colors.borderLight, borderWidth: 1 },
          ]}
        >
          {!isUser && (
            <Text style={[st.senderName, { color: colors.primary }]}>{item.sender}</Text>
          )}
          <Text style={[st.messageText, { color: isUser ? '#fff' : colors.text }]}>
            {item.text}
          </Text>

          {item.attachment && (
            <View
              style={[
                st.attachmentPreview,
                {
                  backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : colors.primaryTint,
                },
              ]}
            >
              <Paperclip size={14} color={isUser ? '#fff' : colors.primary} />
              <Text
                style={[
                  st.attachmentName,
                  { color: isUser ? '#fff' : colors.primary },
                ]}
              >
                {item.attachment.name}
              </Text>
            </View>
          )}

          <Text
            style={[
              st.messageTime,
              { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textMuted },
            ]}
          >
            {item.time}
          </Text>
        </View>
      </View>
    );
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
      {/* Header */}
      <View style={[st.header, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
        <View style={st.headerInfo}>
          <Text style={[st.headerTitle, { color: colors.text }]}>
            {discussionInfo.name || 'Discussion'}
          </Text>
          <View style={st.headerMeta}>
            {discussionInfo.statut ? (
              <Badge label={discussionInfo.statut} variant="success" />
            ) : null}
            {discussionInfo.participantsCount > 0 && (
              <View style={st.participantsRow}>
                <Info size={12} color={colors.textMuted} />
                <Text style={[st.participantsText, { color: colors.textMuted }]}>
                  {discussionInfo.participantsCount} participants
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={st.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={st.emptyMessages}>
            <Text style={[st.emptyText, { color: colors.textMuted }]}>
              Aucun message. Envoyez le premier message !
            </Text>
          </View>
        }
      />

      {/* Input Bar */}
      <View style={[st.inputBar, { backgroundColor: colors.card, borderTopColor: colors.borderLight }]}>
        <TouchableOpacity style={st.attachBtn}>
          <Paperclip size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[st.inputWrapper, { backgroundColor: isDark ? colors.surface : colors.borderLight }]}>
          <TextInput
            style={[st.input, { color: colors.text }]}
            placeholder="Votre message..."
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
        </View>
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !message.trim()}
          style={[st.sendBtn, { backgroundColor: message.trim() ? colors.primary : colors.borderLight }]}
        >
          <Send size={18} color={message.trim() ? '#fff' : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  headerInfo: {},
  headerTitle: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  participantsText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
  },

  // Messages
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },

  // Empty
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },

  // System message
  systemMessage: {
    alignItems: 'center',
    marginVertical: spacing.smd,
    gap: spacing.xxs,
  },
  systemText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  systemTime: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.regular,
  },

  // Message row
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.smd,
    maxWidth: '80%',
    gap: spacing.sm,
  },
  messageRowRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  msgAvatarText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },

  // Bubble
  bubble: {
    borderRadius: 16,
    padding: spacing.smd,
    maxWidth: '100%',
  },
  senderName: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
    textAlign: 'right',
  },

  // Attachment
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  attachmentName: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.medium,
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.smd,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  attachBtn: {
    padding: spacing.xs,
    paddingBottom: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    maxHeight: 100,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.sm,
    fontFamily: typography.fontFamily.regular,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
