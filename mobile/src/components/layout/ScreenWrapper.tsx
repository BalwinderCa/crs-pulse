import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, spacing } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useTabBarLayout } from '@/hooks/useTabBarLayout';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { Colors } from '@/theme/colors';

type Props = {
  children: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  horizontalPadding?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
};

function makeStyles(c: Colors, contentPaddingBottom: number, contentFrameStyle?: ViewStyle) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surfacePrimary },
    keyboardView: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: contentPaddingBottom,
      ...contentFrameStyle,
    },
    flat: { flex: 1 },
    hPad: { paddingHorizontal: spacing.base },
  });
}

export function ScreenWrapper({
  children,
  scrollable = false,
  refreshing = false,
  onRefresh,
  horizontalPadding = true,
  style,
  contentStyle,
  keyboardAvoiding = false,
}: Props) {
  const colors = useColors();
  const { contentPaddingBottom } = useTabBarLayout();
  const { contentFrameStyle } = useResponsiveLayout();
  const styles = makeStyles(colors, contentPaddingBottom, contentFrameStyle);

  const content = (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, horizontalPadding && styles.hPad, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.blue}
                colors={[palette.blue]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flat, horizontalPadding && styles.hPad, contentFrameStyle, contentStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }
  return content;
}
