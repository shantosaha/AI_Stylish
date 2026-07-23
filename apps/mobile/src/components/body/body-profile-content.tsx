import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { resolveMediaUrl } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/state/auth-store';
import { useBodyStore } from '@/state/body-store';
import type { PickedImage } from '@/state/wardrobe-store';

const MAX_PHOTOS = 6;

interface FormValues {
  body_shape: string;
  skin_tone: string;
  face_shape: string;
  height: string;
}

function Field({
  label,
  value,
  onChangeText,
  disabled,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        style={[styles.input, { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        placeholderTextColor={theme.textSecondary}
        testID={testID}
      />
    </View>
  );
}

export function BodyProfileContent({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);
  const {
    images,
    analysis,
    isLoading,
    isUploading,
    isAnalyzing,
    error,
    fetchAll,
    uploadImage,
    deleteImage,
    runAnalysis,
    updateAnalysis,
    clearError,
  } = useBodyStore();

  const [form, setForm] = useState<FormValues>({ body_shape: '', skin_tone: '', face_shape: '', height: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (token) fetchAll(token);
  }, [token, fetchAll]);

  useEffect(() => {
    if (analysis) {
      setForm({
        body_shape: analysis.body_shape ?? '',
        skin_tone: analysis.skin_tone ?? '',
        face_shape: analysis.face_shape ?? '',
        height: analysis.height ?? '',
      });
    }
  }, [analysis]);

  const pickAndUpload = async (fromCamera: boolean) => {
    if (!token) return;
    clearError();
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

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
    await uploadImage(token, image).catch(() => {});
  };

  const handleDeleteImage = async (id: string) => {
    if (!token) return;
    await deleteImage(token, id).catch(() => {});
  };

  const handleRunAnalysis = async () => {
    if (!token) return;
    await runAnalysis(token).catch(() => {});
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      await updateAnalysis(token, form);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1500);
    } catch {
      // error surfaced via store error state below
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Pressable onPress={onBack} testID="body-profile-back">
        <ThemedText type="linkPrimary">← Back to profile</ThemedText>
      </Pressable>

      <ThemedText type="title" style={styles.title}>
        Body profile
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        Used for fit-aware outfit recommendations. Photos stay private to your account.
      </ThemedText>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        Photos ({images.length}/{MAX_PHOTOS})
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator color={theme.text} />
      ) : (
        <View style={styles.photoGrid}>
          {images.map((img) => (
            <View key={img.id} style={styles.photoTile}>
              <Image source={{ uri: resolveMediaUrl(img.image_url) }} style={styles.photo} />
              {img.is_primary ? (
                <View style={styles.primaryBadge}>
                  <ThemedText type="small" style={styles.primaryBadgeText}>
                    Primary
                  </ThemedText>
                </View>
              ) : null}
              <Pressable
                style={styles.deleteBadge}
                onPress={() => handleDeleteImage(img.id)}
                testID={`body-photo-delete-${img.id}`}>
                <ThemedText type="smallBold" style={styles.deleteBadgeText}>
                  ✕
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {images.length < MAX_PHOTOS ? (
        <View style={styles.addPhotoRow}>
          <Pressable
            style={[styles.secondaryButton, isUploading && styles.disabled]}
            onPress={() => pickAndUpload(true)}
            disabled={isUploading}
            testID="body-add-camera">
            <ThemedText type="default">Take photo</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, isUploading && styles.disabled]}
            onPress={() => pickAndUpload(false)}
            disabled={isUploading}
            testID="body-add-library">
            {isUploading ? <ActivityIndicator /> : <ThemedText type="default">Choose photo</ThemedText>}
          </Pressable>
        </View>
      ) : null}

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        Body traits
      </ThemedText>

      {!analysis ? (
        <ThemedView type="backgroundElement" style={styles.notice}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {images.length === 0
              ? 'Add a photo above to run body analysis.'
              : 'Ready to analyze your primary photo.'}
          </ThemedText>
          {images.length > 0 ? (
            <Pressable
              style={[styles.primaryButton, isAnalyzing && styles.disabled]}
              onPress={handleRunAnalysis}
              disabled={isAnalyzing}
              testID="body-run-analysis">
              {isAnalyzing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText type="default" style={styles.primaryButtonText}>
                  Run analysis
                </ThemedText>
              )}
            </Pressable>
          ) : null}
        </ThemedView>
      ) : (
        <View style={styles.form}>
          <ThemedView type="backgroundElement" style={styles.notice}>
            <ThemedText type="small" themeColor="textSecondary">
              We took a first guess ({Math.round(analysis.confidence * 100)}% confidence). Please check
              and correct these.
            </ThemedText>
          </ThemedView>

          <Field
            label="Body shape"
            value={form.body_shape}
            onChangeText={(v) => setForm({ ...form, body_shape: v })}
            disabled={isSaving}
            testID="body-field-shape"
          />
          <Field
            label="Skin tone"
            value={form.skin_tone}
            onChangeText={(v) => setForm({ ...form, skin_tone: v })}
            disabled={isSaving}
            testID="body-field-skin-tone"
          />
          <Field
            label="Face shape"
            value={form.face_shape}
            onChangeText={(v) => setForm({ ...form, face_shape: v })}
            disabled={isSaving}
            testID="body-field-face-shape"
          />
          <Field
            label="Height"
            value={form.height}
            onChangeText={(v) => setForm({ ...form, height: v })}
            disabled={isSaving}
            testID="body-field-height"
          />

          {savedNotice ? (
            <ThemedText type="small" themeColor="textSecondary">
              Saved
            </ThemedText>
          ) : null}

          <Pressable
            style={[styles.primaryButton, isSaving && styles.disabled]}
            onPress={handleSave}
            disabled={isSaving}
            testID="body-save">
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="default" style={styles.primaryButtonText}>
                Save changes
              </ThemedText>
            )}
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, isAnalyzing && styles.disabled]}
            onPress={handleRunAnalysis}
            disabled={isAnalyzing}
            testID="body-reanalyze">
            {isAnalyzing ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <ThemedText type="default">Re-analyze</ThemedText>
            )}
          </Pressable>
        </View>
      )}

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  sectionTitle: {
    marginTop: Spacing.three,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photoTile: {
    width: 96,
    height: 96,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: Spacing.two,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: Spacing.one,
    left: Spacing.one,
    backgroundColor: '#2563eb',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  primaryBadgeText: {
    color: '#ffffff',
    fontSize: 10,
  },
  deleteBadge: {
    position: 'absolute',
    top: -Spacing.one,
    right: -Spacing.one,
    backgroundColor: '#ef4444',
    borderRadius: Spacing.three,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadgeText: {
    color: '#ffffff',
  },
  addPhotoRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    backgroundColor: '#ffffff10',
  },
  notice: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    flex: 1,
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
    flex: 1,
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: '#ef4444',
  },
});
