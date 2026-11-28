import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/common/AppText';
import type { Meta } from '../milestoneMeta';

/** A milestone's icon: its emoji when it has one (COPR's 🎉), else the Ionicon. */
export function MilestoneIcon({ meta, size, color }: { meta: Meta; size: number; color: string }) {
  return meta.emoji
    ? <Text style={{ fontSize: size, lineHeight: Math.round(size * 1.3), textAlign: 'center', includeFontPadding: false }}>{meta.emoji}</Text>
    : <Ionicons name={meta.icon} size={size} color={color} />;
}
