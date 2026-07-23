import { WardrobeItemCategory } from '@ai-stylish/shared';
import type { Formality } from '@ai-stylish/shared';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ItemFormValues {
  name: string;
  category: WardrobeItemCategory;
  color: string;
  pattern: string;
  material: string;
  brand: string;
  formality: Formality | '';
}

const CATEGORY_OPTIONS: { value: WardrobeItemCategory; label: string }[] = [
  { value: WardrobeItemCategory.TOPS, label: 'Tops' },
  { value: WardrobeItemCategory.BOTTOMS, label: 'Bottoms' },
  { value: WardrobeItemCategory.OUTERWEAR, label: 'Outerwear' },
  { value: WardrobeItemCategory.SHOES, label: 'Shoes' },
  { value: WardrobeItemCategory.ACCESSORIES, label: 'Accessories' },
  { value: WardrobeItemCategory.BAGS, label: 'Bags' },
  { value: WardrobeItemCategory.JEWELRY, label: 'Jewelry' },
];

const FORMALITY_OPTIONS: { value: Formality; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'business', label: 'Business' },
  { value: 'formal', label: 'Formal' },
];

interface ItemFormProps {
  values: ItemFormValues;
  onChange: (values: ItemFormValues) => void;
  disabled?: boolean;
}

function FormField({
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
      <ThemedText type="label" themeColor="accent">
        {label}
      </ThemedText>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        placeholderTextColor={theme.textSecondary}
        testID={testID}
      />
    </View>
  );
}

export function ItemForm({ values, onChange, disabled }: ItemFormProps) {
  const theme = useTheme();
  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <View style={styles.container}>
      <FormField
        label="Name"
        value={values.name}
        onChangeText={(v) => set('name', v)}
        disabled={disabled}
        testID="item-name"
      />

      <View style={styles.field}>
        <ThemedText type="label" themeColor="accent">
          Category
        </ThemedText>
        <ThemedView
          type="backgroundElement"
          style={[styles.categoryList, { borderColor: theme.border }]}>
          {CATEGORY_OPTIONS.map((option, index) => (
            <Pressable
              key={option.value}
              style={[
                styles.categoryRow,
                index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
              ]}
              onPress={() => set('category', option.value)}
              disabled={disabled}
              testID={`item-category-${option.value}`}>
              <ThemedText type="default">{option.label}</ThemedText>
              {values.category === option.value ? (
                <ThemedText type="default" themeColor="accent">
                  ✓
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </ThemedView>
      </View>

      <FormField
        label="Color"
        value={values.color}
        onChangeText={(v) => set('color', v)}
        disabled={disabled}
        testID="item-color"
      />
      <FormField
        label="Pattern"
        value={values.pattern}
        onChangeText={(v) => set('pattern', v)}
        disabled={disabled}
        testID="item-pattern"
      />
      <FormField
        label="Material"
        value={values.material}
        onChangeText={(v) => set('material', v)}
        disabled={disabled}
        testID="item-material"
      />
      <FormField
        label="Brand"
        value={values.brand}
        onChangeText={(v) => set('brand', v)}
        disabled={disabled}
        testID="item-brand"
      />

      <View style={styles.field}>
        <ThemedText type="label" themeColor="accent">
          Formality
        </ThemedText>
        <View style={styles.formalityRow}>
          {FORMALITY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.formalityOption,
                { borderColor: theme.border },
                values.formality === option.value && {
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                },
              ]}
              onPress={() => set('formality', option.value)}
              disabled={disabled}
              testID={`item-formality-${option.value}`}>
              <ThemedText
                type="small"
                themeColor={values.formality === option.value ? 'accentText' : 'text'}>
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  categoryList: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  formalityRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  formalityOption: {
    flex: 1,
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
