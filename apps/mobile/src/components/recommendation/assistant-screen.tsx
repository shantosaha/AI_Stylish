import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { AssistantRefineResponse, Outfit, RecommendationRun } from '@ai-stylish/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { apiClient } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/state/auth-store';

const QUICK_PROMPTS = ['Make it warmer', 'More formal', 'Explain this choice'];

type ChatMessage = { role: 'user' | 'assistant'; text: string };

export function AssistantScreen({
  runId,
  outfit,
  onRefined,
  onBack,
}: {
  runId: string;
  outfit: Outfit;
  onRefined: (run: RecommendationRun) => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);

  const outfitSummary = [outfit.top?.name, outfit.bottom?.name, outfit.outerwear?.name, outfit.shoes?.name]
    .filter(Boolean)
    .join(', ');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (text: string) => {
    if (!token || !text.trim() || isSending) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setIsSending(true);
    setError(null);
    try {
      const response = await apiClient.post<AssistantRefineResponse>(
        API_ENDPOINTS.ASSISTANT_REFINE,
        { run_id: runId, message: text },
        token
      );
      setMessages((prev) => [...prev, { role: 'assistant', text: response.reply }]);
      if (response.understood && response.run) {
        onRefined(response.run);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reach the assistant');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backLink} testID="assistant-back">
        <ThemedText type="linkPrimary">← Back</ThemedText>
      </Pressable>

      <ThemedText type="title" style={styles.title}>
        Assistant
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {outfitSummary}
      </ThemedText>

      <View style={styles.quickPromptRow}>
        {QUICK_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            style={styles.quickPrompt}
            onPress={() => send(prompt)}
            disabled={isSending}
            testID={`assistant-quick-${prompt.toLowerCase().replace(/\s+/g, '-')}`}>
            <ThemedText type="small">{prompt}</ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.thread} contentContainerStyle={styles.threadContent} testID="assistant-thread">
        {messages.map((message, i) => (
          <ThemedView
            key={i}
            type="backgroundElement"
            style={[styles.bubble, message.role === 'user' && styles.bubbleUser]}>
            <ThemedText type="small">{message.text}</ThemedText>
          </ThemedView>
        ))}
        {isSending ? (
          <View style={styles.centered} testID="assistant-sending">
            <ActivityIndicator color={theme.text} size="small" />
          </View>
        ) : null}
      </ScrollView>

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Ask for a change…"
          placeholderTextColor={theme.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          testID="assistant-input"
        />
        <Pressable
          style={styles.sendButton}
          onPress={() => send(input)}
          disabled={isSending || !input.trim()}
          testID="assistant-send">
          <ThemedText type="default" style={styles.sendButtonText}>
            Send
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.three,
  },
  backLink: {
    paddingVertical: Spacing.one,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
  },
  quickPromptRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  quickPrompt: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#ffffff10',
  },
  thread: {
    maxHeight: 320,
  },
  threadContent: {
    gap: Spacing.two,
  },
  bubble: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb40',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    backgroundColor: '#ffffff10',
  },
  sendButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  error: {
    color: '#ef4444',
  },
});
