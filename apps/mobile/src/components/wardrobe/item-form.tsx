import { WardrobeItemCategory } from '@ai-stylish/shared';
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

export function ItemForm({ values, onChange, disabled }: ItemFormProps) {
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
        <ThemedText type="smallBold" themeColor="textSecondary">
          Category
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.categoryList}>
          {CATEGORY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={styles.categoryRow}
              onPress={() => set('category', option.value)}
              disabled={disabled}
              testID={`item-category-${option.value}`}>
              <ThemedText type="default">{option.label}</ThemedText>
              {values.category === option.value ? <ThemedText type="default">✓</ThemedText> : null}
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
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    backgroundColor: '#ffffff10',
  },
  categoryList: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
