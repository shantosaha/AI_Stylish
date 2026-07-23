import type { WardrobeItem } from '@ai-stylish/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { resolveMediaUrl } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ItemForm, ItemFormValues } from '@/components/wardrobe/item-form';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/state/auth-store';
import { useWardrobeStore } from '@/state/wardrobe-store';

function itemToFormValues(item: WardrobeItem): ItemFormValues {
  return {
    name: item.name,
    category: item.category,
    color: item.color ?? '',
    pattern: item.pattern ?? '',
    material: item.material ?? '',
    brand: item.brand ?? '',
    formality: item.formality ?? '',
  };
}

export function ItemDetailScreen({ item, onBack }: { item: WardrobeItem; onBack: () => void }) {
  const token = useAuthStore((s) => s.token);
  const updateItem = useWardrobeStore((s) => s.updateItem);
  const deleteItem = useWardrobeStore((s) => s.deleteItem);

  const [form, setForm] = useState<ItemFormValues>(itemToFormValues(item));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryImage = item.images.find((img) => img.is_primary) ?? item.images[0];

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateItem(token, item.id, { ...form, formality: form.formality || undefined });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    setIsDeleting(true);
    try {
      await deleteItem(token, item.id);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete item');
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backLink} testID="item-detail-back">
        <ThemedText type="linkPrimary">← Back to wardrobe</ThemedText>
      </Pressable>

      {primaryImage ? (
        <Image source={{ uri: resolveMediaUrl(primaryImage.image_url) }} style={styles.previewLarge} />
      ) : null}

      <ItemForm values={form} onChange={setForm} disabled={isSaving || isDeleting} />

      {savedNotice ? (
        <ThemedText type="small" themeColor="textSecondary">
          Saved
        </ThemedText>
      ) : null}
      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        style={[styles.primaryButton, (isSaving || isDeleting) && styles.disabled]}
        onPress={handleSave}
        disabled={isSaving || isDeleting}
        testID="item-detail-save">
        {isSaving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText type="default" style={styles.primaryButtonText}>
            Save changes
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        style={[styles.deleteButton, (isSaving || isDeleting) && styles.disabled]}
        onPress={handleDelete}
        disabled={isSaving || isDeleting}
        testID="item-detail-delete">
        {isDeleting ? (
          <ActivityIndicator color="#ef4444" />
        ) : (
          <ThemedText type="default" style={styles.deleteButtonText}>
            Delete item
          </ThemedText>
        )}
      </Pressable>
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
  previewLarge: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.three,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef444420',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: '#ef4444',
  },
});
