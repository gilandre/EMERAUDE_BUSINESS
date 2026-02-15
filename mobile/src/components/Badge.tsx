import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: 'rgba(16, 183, 127, 0.15)', text: colors.primary },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', text: colors.warning },
  error: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.error },
  neutral: { bg: colors.borderLight, text: colors.textSecondary },
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const c = VARIANT_COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  text: {
    fontSize: typography.fontSizes.xxs,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: 0.5,
  },
});
