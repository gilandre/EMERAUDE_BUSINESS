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
      <Text style={styles.label}>{label.toUpperCase()}</Text>
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
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 1.2,
  },
  button: {
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  value: {
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text,
  },
  placeholder: {
    color: colors.textMuted,
  },
});
