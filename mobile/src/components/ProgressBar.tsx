import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  trackColor?: string;
}

export function ProgressBar({
  progress,
  color = colors.primary,
  trackColor = colors.borderLight,
}: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          { backgroundColor: color, width: `${clampedProgress * 100}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
