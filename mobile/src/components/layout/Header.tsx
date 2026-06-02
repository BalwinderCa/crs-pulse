import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { spacing, typography } from '@/theme';
import { useColors } from '@/hooks/useColors';
import type { Colors } from '@/theme/colors';

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
};

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
    },
    left:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    backBtn: { padding: spacing.xs },
    title:   { color: c.textPrimary,   fontSize: typography['2xl'], fontWeight: typography.bold },
    subtitle:{ color: c.textSecondary, fontSize: typography.sm, marginTop: 2 },
    right:   {},
  });
}

export function Header({ title, subtitle, showBack = false, right }: Props) {
  const navigation = useNavigation();
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}
