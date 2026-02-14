import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, typography, spacing } from '../theme';

interface DatePickerInputProps {
  label: string;
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
}

export function DatePickerInput({ label, value, onChange }: DatePickerInputProps) {
  const [show, setShow] = useState(false);
  const date = value ? new Date(value + 'T00:00:00') : new Date();

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      onChange(selected.toISOString().slice(0, 10));
    }
  };

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('fr-FR')
    : 'Sélectionner une date';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={() => setShow(true)} style={styles.button}>
        <Text style={[styles.value, !value && styles.placeholder]}>
          {displayValue}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium as '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  value: {
    fontSize: typography.fontSizes.base,
    color: colors.text,
  },
  placeholder: {
    color: colors.textMuted,
  },
});
