import type { WardrobeItem } from '@ai-stylish/shared';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ItemForm, ItemFormValues } from '@/components/wardrobe/item-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/state/auth-store';
import { PickedImage, useWardrobeStore } from '@/state/wardrobe-store';

type Stage = 'picking' | 'uploading' | 'editing' | 'error';

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

export function AddItemScreen({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const token = useAuthStore((s) => s.token);
  const createItem = useWardrobeStore((s) => s.createItem);
  const updateItem = useWardrobeStore((s) => s.updateItem);
  const deleteItem = useWardrobeStore((s) => s.deleteItem);

  const [stage, setStage] = useState<Stage>('picking');
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [createdItem, setCreatedItem] = useState<WardrobeItem | null>(null);
  const [form, setForm] = useState<ItemFormValues | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const pickAndUpload = async (fromCamera: boolean) => {
    setUploadError(null);
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError('Permission denied. Enable camera/photo access in your device settings.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const image: PickedImage = {
      uri: asset.uri,
      file: asset.file,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    };
    setPickedImage(image);
    setStage('uploading');

    if (!token) return;
    try {
      const item = await createItem(token, image, {});
      setCreatedItem(item);
      setForm(itemToFormValues(item));
      setStage('editing');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
      setStage('error');
    }
  };

  const handleSave = async () => {
    if (!token || !createdItem || !form) return;
    setIsSaving(true);
    try {
      await updateItem(token, createdItem.id, { ...form, formality: form.formality || undefined });
      onDone();
    } catch {
      // error surfaced via the wardrobe store's error state below
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (createdItem && token) {
      // Don't leave an unwanted upload behind if the user backs out.
      await deleteItem(token, createdItem.id).catch(() => {});
    }
    onCancel();
  };

  if (stage === 'picking' || stage === 'error') {
    return (
      <View style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Add item
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          Take a photo or choose one from your library.
        </ThemedText>

        {uploadError ? (
          <ThemedText type="small" style={styles.error}>
            {uploadError}
          </ThemedText>
        ) : null}

        <Pressable
          style={styles.primaryButton}
          onPress={() => pickAndUpload(true)}
          testID="add-item-camera">
          <ThemedText type="default" style={styles.primaryButtonText}>
            Take photo
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => pickAndUpload(false)}
          testID="add-item-library">
          <ThemedText type="default" style={styles.secondaryButtonText}>
            Choose from library
          </ThemedText>
        </Pressable>
        <Pressable style={styles.cancelLink} onPress={onCancel} testID="add-item-cancel-pick">
          <ThemedText type="link" themeColor="textSecondary">
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (stage === 'uploading') {
    return (
      <View style={[styles.container, styles.centered]}>
        {pickedImage ? <Image source={{ uri: pickedImage.uri }} style={styles.previewLarge} /> : null}
        <ActivityIndicator />
        <ThemedText type="default" themeColor="textSecondary">
          Adding to your wardrobe...
        </ThemedText>
      </View>
    );
  }

  // stage === 'editing'
  if (!form) return null;
  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Confirm details
      </ThemedText>
      {pickedImage ? <Image source={{ uri: pickedImage.uri }} style={styles.previewLarge} /> : null}
      <ThemedView type="backgroundElement" style={styles.notice}>
        <ThemedText type="small" themeColor="textSecondary">
          We took a first guess at these details. Please check and correct them.
        </ThemedText>
      </ThemedView>

      <ItemForm values={form} onChange={setForm} disabled={isSaving} />

      <Pressable
        style={[styles.primaryButton, isSaving && styles.disabled]}
        onPress={handleSave}
        disabled={isSaving}
        testID="add-item-save">
        {isSaving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText type="default" style={styles.primaryButtonText}>
            Save to wardrobe
          </ThemedText>
        )}
      </Pressable>
      <Pressable style={styles.cancelLink} onPress={handleCancel} testID="add-item-cancel-edit">
        <ThemedText type="link" themeColor="textSecondary">
          Discard
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.three,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  previewLarge: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.three,
  },
  notice: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
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
  secondaryButton: {
    backgroundColor: '#ffffff10',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: '#ef4444',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
