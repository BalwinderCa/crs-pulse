import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Linking, Modal, Platform,
  ScrollView, Share, StyleSheet, Text, TouchableOpacity,
  TouchableWithoutFeedback, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';

// ─── Content ──────────────────────────────────────────────────────────────────

const ABOUT_TEXT = `Hi there! I'm Balwinder Singh, creator of CRS Pulse — a free, accurate Express Entry tracker built for aspiring Canadians like you.

After seeing how stressful and confusing the immigration process can be, I built CRS Pulse to give applicants a clear, real-time tool to understand their standing in the pool. The app pulls live draw data directly from IRCC and calculates your CRS score using the official government formula — no guesswork, no outdated tables.

What drives me every day is the belief that everyone deserves a fair shot at building a life in Canada. Better information leads to better decisions — and better decisions change lives.

Your support means the world to me. Every contribution helps fund new features, smarter insights, and better tools to help you improve your profile and track your progress toward permanent residency.

Thank you for trusting CRS Pulse on your immigration journey. Keep going — Canada is waiting!`;

const PRIVACY_TEXT = `CRS Pulse respects your privacy.

All data you enter (age, education, language scores, work experience) is stored locally on your device only. We do not collect, transmit, or share any personal information with third parties.

Push notifications (if enabled) register your device with our server so we can alert you when IRCC publishes a new draw. No personal profile data is sent — only an anonymous device token.

Draw history is fetched directly from the official IRCC public data feed (canada.ca) and cached on-device for offline use.

We do not use analytics trackers, advertising SDKs, or any third-party data collection tools.

For questions, contact: balwinderxcode@gmail.com`;

const MENU_WIDTH = Dimensions.get('window').width * 0.75;

type DetailModal = 'about' | 'privacy' | null;

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function DetailView({ title, body, onClose }: {
  title: string; body: string; onClose: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[dv.wrap, { backgroundColor: c.surfacePrimary }]}>
      <View style={[dv.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={16} style={dv.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          <Text style={[dv.backLabel, { color: c.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[dv.title, { color: c.textPrimary }]}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView
        contentContainerStyle={[dv.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[dv.text, { color: c.textSecondary }]}>{body}</Text>
      </ScrollView>
    </View>
  );
}

const dv = StyleSheet.create({
  wrap:      { flex: 1 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: spacing.base, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backLabel: { fontSize: typography.base, fontWeight: typography.medium },
  title:     { fontSize: typography.base, fontWeight: typography.semibold, flex: 1, textAlign: 'center' },
  body:      { padding: spacing.base, paddingTop: spacing.xl },
  text:      { fontSize: typography.base, lineHeight: 26 },
});

// ─── Menu groups ──────────────────────────────────────────────────────────────

type MenuItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  accent?: string;
};

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function SideMenu({ visible, onClose }: Props) {
  const c      = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();

  const slideX          = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [detail, setDetail] = useState<DetailModal>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideX, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 18 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, { toValue: -MENU_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setDetail(null));
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out CRS Pulse — free Express Entry CRS calculator & draw tracker for Canada immigration! https://crspulse.app',
        title: 'CRS Pulse',
      });
    } catch {}
    onClose();
  };

  const handleRate = () => {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/crs-pulse/id0000000000'
      : 'https://play.google.com/store/apps/details?id=com.crspulse.app';
    Linking.openURL(url);
    onClose();
  };

  const handleCoffee = () => {
    Linking.openURL('https://buymeacoffee.com/crspulse');
    onClose();
  };

  // Two groups of menu items
  const groupOne: MenuItem[] = [
    { icon: 'information-circle-outline', label: 'About Us',       onPress: () => setDetail('about') },
    { icon: 'lock-closed-outline',        label: 'Privacy Policy', onPress: () => setDetail('privacy') },
  ];

  const groupTwo: MenuItem[] = [
    { icon: 'share-outline', label: 'Share App',    onPress: handleShare },
    { icon: 'star-outline',  label: Platform.OS === 'ios' ? 'Review on App Store' : 'Review on Play Store', onPress: handleRate },
  ];

  const renderItem = (item: MenuItem, idx: number, arr: MenuItem[]) => (
    <TouchableOpacity
      key={item.label}
      style={[s.row, idx < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
      onPress={item.onPress}
      activeOpacity={0.55}
    >
      <View style={[s.iconBox, { backgroundColor: (item.accent ?? accent) + '1A' }]}>
        <Ionicons name={item.icon} size={19} color={item.accent ?? accent} />
      </View>
      <Text style={[s.rowLabel, { color: c.textPrimary }]}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View style={[
        s.panel,
        { backgroundColor: c.surfacePrimary, width: MENU_WIDTH,
          transform: [{ translateX: slideX }] },
      ]}>
        {detail ? (
          <DetailView
            title={detail === 'about' ? 'About Us' : 'Privacy Policy'}
            body={detail  === 'about' ? ABOUT_TEXT : PRIVACY_TEXT}
            onClose={() => setDetail(null)}
          />
        ) : (
          <>
            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top + spacing.md, borderBottomColor: c.border }]}>
              <View style={s.headerInner}>
                <View style={[s.logoBox, { backgroundColor: accent + '20' }]}>
                  <Ionicons name="earth-outline" size={20} color={accent} />
                </View>
                <View>
                  <Text style={[s.appName, { color: c.textPrimary }]}>CRS Pulse</Text>
                  <Text style={[s.appSub,  { color: c.textMuted }]}>Express Entry Tracker</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={16} style={s.closeBtn}>
                <Ionicons name="close" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

              {/* Group 1 */}
              <View style={[s.group, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                {groupOne.map((item, i) => renderItem(item, i, groupOne))}
              </View>

              {/* Group 2 */}
              <View style={[s.group, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                {groupTwo.map((item, i) => renderItem(item, i, groupTwo))}
              </View>

            </ScrollView>

            {/* Footer — Buy Me a Coffee */}
            <TouchableOpacity
              onPress={handleCoffee}
              activeOpacity={0.75}
              style={[s.coffeeBtn, { paddingBottom: insets.bottom + spacing.md, borderTopColor: c.border }]}
            >
              <View style={[s.coffeeInner, { backgroundColor: '#F9A825' }]}>
                <Ionicons name="cafe" size={18} color="#000" />
                <Text style={s.coffeeTxt}>Buy Me a Coffee</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    shadowColor: '#000', shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 16,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoBox:     { width: 38, height: 38, borderRadius: borderRadius.md,
                 alignItems: 'center', justifyContent: 'center' },
  appName:     { fontSize: typography.lg, fontWeight: typography.bold, letterSpacing: -0.3 },
  appSub:      { fontSize: typography.xs, marginTop: 1 },
  closeBtn:    { padding: spacing.xs },

  // Groups
  group: {
    marginHorizontal: spacing.base, marginTop: spacing.base,
    borderRadius: borderRadius.md, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  iconBox: {
    width: 34, height: 34, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: typography.base, fontWeight: typography.medium },

  // Coffee button
  coffeeBtn: {
    paddingHorizontal: spacing.base, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  coffeeInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  coffeeTxt: { fontSize: typography.base, fontWeight: typography.bold, color: '#000' },
});
