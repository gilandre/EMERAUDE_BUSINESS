import React from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { typography, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface SectionHeaderProps {
  title: string;
  style?: ViewStyle | TextStyle;
}

export function SectionHeader({ title, style }: SectionHeaderProps) {
  const { colors } = useTheme();
  return <Text style={[styles.header, { color: colors.textMuted }, style]}>{title.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  header: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    marginBottom: spacing.smd,
  },
});
