import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, typography, spacing } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  wrapperStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  containerStyle,
  wrapperStyle,
  style,
  icon,
  ...props
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label.toUpperCase()}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError, wrapperStyle]}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, icon ? styles.inputWithIcon : undefined, style]}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    borderWidth: 0,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  iconWrapper: {
    paddingLeft: spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSizes.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text,
  },
  inputWithIcon: {
    paddingLeft: spacing.sm,
  },
  error: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
