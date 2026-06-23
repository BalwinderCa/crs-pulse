import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Image, Linking, Modal, Platform,
  ScrollView, Share, StyleSheet, Text, TouchableOpacity,
  TouchableWithoutFeedback, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/types';
import { GITHUB_REPO_URL, PRIVACY_POLICY_URL } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Logo } from '@/components/common/Logo';

// ─── Content ──────────────────────────────────────────────────────────────────

const ABOUT_TEXT = `Hi there! I'm Balwinder Singh, creator of CRS Pulse — a free, accurate IRCC Tracker built for aspiring Canadians like you.

After seeing how stressful and confusing the immigration process can be, I built CRS Pulse to give applicants a clear, real-time tool to understand their standing in the pool. The app pulls live draw data directly from IRCC and calculates your CRS score using the current IRCC CRS grid (last updated 2025-08-21). Always verify your score with the official IRCC CRS tool before making decisions.

What drives me every day is the belief that everyone deserves a fair shot at building a life in Canada. Better information leads to better decisions — and better decisions change lives.

Your support means the world to me. I keep building smarter tools to help you improve your profile and track your progress toward permanent residency.

Thank you for trusting CRS Pulse on your immigration journey. Keep going — Canada is waiting!`;

const PRIVACY_TEXT = `CRS Pulse respects your privacy.

All data you enter (age, education, language scores, work experience) is stored locally on your device only. We never collect, transmit, or share the profile information you enter with anyone.

Push notifications (if enabled) register your device with our server so we can alert you when IRCC publishes a new draw. No personal profile data is sent — only an anonymous device token.

Draw history is fetched directly from the official IRCC public data feed (canada.ca) and cached on-device for offline use.

The free version shows ads through Google AdMob, which may collect device identifiers and usage data to deliver ads under Google's privacy policy. Buying Premium removes all ads. We use no other third-party analytics or trackers.

Full policy: ${PRIVACY_POLICY_URL}

For questions, contact: info@crspulse.com`;

const TERMS_TEXT = `By using CRS Pulse, you agree to these terms.

CRS Pulse is a free informational tool. Scores, draw data, processing times and any other figures shown in the app are estimates for planning purposes only. They are not immigration advice, and they are not a maximum, a minimum, or a guarantee of any outcome.

CRS Pulse is an independent project. It is not affiliated with, endorsed by, or connected to Immigration, Refugees and Citizenship Canada (IRCC) or the Government of Canada. Always verify scores, eligibility, and processing times with the official tools on canada.ca before making decisions.

Your data stays on your device. We do not collect or sell personal information (see the Privacy Policy for details).

The app is provided "as is", without warranties of any kind. To the maximum extent permitted by law, the developer is not liable for any loss or damage arising from your use of the app or reliance on its estimates.

These terms may be updated from time to time. Continued use of the app after an update means you accept the revised terms.

Questions? Contact: info@crspulse.com`;

const MENU_WIDTH = Dimensions.get('window').width;

type DetailModal = 'about' | 'privacy' | 'terms' | 'contact' | null;

const DETAIL_TITLES: Record<NonNullable<DetailModal>, string> = {
  about:   'About Us',
  privacy: 'Privacy Policy',
  terms:   'Terms & Conditions',
  contact: 'Contact Us',
};

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
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[dv.title, { color: c.textPrimary }]}>{title}</Text>
        <View style={{ width: 44 }} />
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

function ContactView({ onClose }: { onClose: () => void }) {
  const c = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();

  const rows = [
    {
      icon: 'mail' as const,
      label: 'Email us',
      sub: 'support@crspulse.com',
      onPress: () => Linking.openURL('mailto:support@crspulse.com?subject=CRS%20Pulse'),
    },
    {
      icon: 'logo-github' as const,
      label: 'Open a GitHub issue',
      sub: 'Bug reports & feature requests',
      onPress: () => Linking.openURL(`${GITHUB_REPO_URL}/issues`),
    },
  ];

  return (
    <View style={[dv.wrap, { backgroundColor: c.surfacePrimary }]}>
      <View style={[dv.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={16} style={dv.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[dv.title, { color: c.textPrimary }]}>Contact Us</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={dv.body}>
        <Text style={[dv.text, { color: c.textSecondary, marginBottom: spacing.lg }]}>
          Questions, feedback, or something not working? We usually reply within a couple of days.
        </Text>
        {rows.map((row) => (
          <TouchableOpacity
            key={row.label}
            style={[cv.row, { borderColor: c.border, backgroundColor: c.surfaceCard }]}
            onPress={row.onPress}
            activeOpacity={0.65}
          >
            <View style={[cv.iconBox, { backgroundColor: accent + '1A' }]}>
              <Ionicons name={row.icon} size={19} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[cv.label, { color: c.textPrimary }]}>{row.label}</Text>
              <Text style={[cv.sub, { color: c.textMuted }]}>{row.sub}</Text>
            </View>
            <Ionicons name="open-outline" size={15} color={c.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const cv = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: typography.sm, fontWeight: typography.semibold },
  sub:   { fontSize: typography.xs, marginTop: 1 },
});

const dv = StyleSheet.create({
  wrap:      { flex: 1 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: spacing.base, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2, width: 44 },
  title:     { fontSize: typography.lg, fontWeight: typography.bold, letterSpacing: -0.3, flex: 1, textAlign: 'center' },
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
  }, [visible, slideX, backdropOpacity]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out CRS Pulse — free Express Entry CRS calculator & draw tracker for Canada immigration! ${GITHUB_REPO_URL}`,
        title: 'CRS Pulse',
      });
    } catch {}
    onClose();
  };

  const appStoreId = Constants.expoConfig?.extra?.appStoreId as string | undefined;

  const handleRate = () => {
    if (Platform.OS === 'ios' && appStoreId) {
      Linking.openURL(`https://apps.apple.com/app/id${appStoreId}`);
      onClose();
    }
  };

  // Two groups of menu items
  const navigateTo = (screen: 'Faq' | 'ReportIssue' | 'DocumentChecklist' | 'ProcessingTimes') => () => {
    onClose();
    navigation.navigate(screen);
  };

  const groupOne: MenuItem[] = [
    { icon: 'checkbox',        label: 'Document Checklists',    onPress: navigateTo('DocumentChecklist'), accent: palette.success },
    { icon: 'hourglass',       label: 'Check Processing Times', onPress: navigateTo('ProcessingTimes'),  accent: palette.warning },
  ];

  const groupAbout: MenuItem[] = [
    { icon: 'help-circle',       label: 'FAQ',                onPress: navigateTo('Faq'),          accent: palette.blue },
    { icon: 'information-circle', label: 'About Us',           onPress: () => setDetail('about'),   accent: '#A78BFA' },
    { icon: 'lock-closed',        label: 'Privacy Policy',     onPress: () => setDetail('privacy'), accent: palette.success },
    { icon: 'document-text',      label: 'Terms & Conditions', onPress: () => setDetail('terms'),   accent: palette.blue },
  ];

  const groupTwo: MenuItem[] = [
    { icon: 'bug',   label: 'Report an Issue', onPress: navigateTo('ReportIssue'), accent: palette.canadaRed },
    { icon: 'mail',  label: 'Contact Us',      onPress: () => setDetail('contact'), accent: palette.blue },
    { icon: 'share', label: 'Share App',       onPress: handleShare,                accent: palette.success },
    ...(Platform.OS === 'ios' && appStoreId
      ? [{ icon: 'star' as const, label: 'Review on App Store', onPress: handleRate, accent: palette.warning }]
      : []),
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
        {detail === 'contact' ? (
          <ContactView onClose={() => setDetail(null)} />
        ) : detail ? (
          <DetailView
            title={DETAIL_TITLES[detail]}
            body={detail === 'about' ? ABOUT_TEXT : detail === 'terms' ? TERMS_TEXT : PRIVACY_TEXT}
            onClose={() => setDetail(null)}
          />
        ) : (
          <>
            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top + spacing.md, borderBottomColor: c.border }]}>
              <View style={s.headerInner}>
                <Image source={require('../../../../assets/logo.png')} style={s.logoBox} resizeMode="contain" />
                <View>
                  <Logo size={20} />
                  <Text style={[s.appSub,  { color: c.textMuted }]}>IRCC Tracker</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={16} style={s.closeBtn}>
                <Ionicons name="close" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            >

              {/* General */}
              <Text style={[s.groupTitle, { color: c.textMuted }]}>General</Text>
              <View style={[s.group, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                {groupOne.map((item, i) => renderItem(item, i, groupOne))}
              </View>

              {/* About */}
              <Text style={[s.groupTitle, { color: c.textMuted }]}>About</Text>
              <View style={[s.group, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                {groupAbout.map((item, i) => renderItem(item, i, groupAbout))}
              </View>

              {/* Support */}
              <Text style={[s.groupTitle, { color: c.textMuted }]}>Support</Text>
              <View style={[s.group, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                {groupTwo.map((item, i) => renderItem(item, i, groupTwo))}
              </View>

            </ScrollView>

            {/* Footer */}
            <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: c.border }]}>
              <Text style={[s.footerText, { color: c.textMuted }]}>
                CRS Pulse v{Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
            </View>
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
  logoBox:     { width: 38, height: 38, borderRadius: borderRadius.md, overflow: 'hidden' },
  appName:     { fontSize: typography.lg, fontWeight: typography.bold, letterSpacing: -0.3 },
  appSub:      { fontSize: typography.xs, marginTop: 1 },
  closeBtn:    { padding: spacing.xs },

  // Groups
  groupTitle: {
    marginHorizontal: spacing.base, marginTop: spacing.lg, marginBottom: spacing.xs,
    fontSize: typography.xs, fontWeight: typography.bold,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  group: {
    marginHorizontal: spacing.base,
    borderRadius: borderRadius.md, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  // Footer
  footer: {
    alignItems: 'center', paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm,
  },
  footerText: { fontSize: typography.xs, fontWeight: typography.medium, letterSpacing: 0.3 },

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
});
