import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Linking, Modal, Platform,
  ScrollView, Share, StyleSheet, Text, TouchableOpacity,
  TouchableWithoutFeedback, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '@/types';
import { PRIVACY_POLICY_URL, STORE_URL } from '@/constants';
import { palette, spacing, typography, borderRadius } from '@/theme';
import { useColors } from '@/hooks/useColors';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Logo } from '@/components/common/Logo';

const MENU_WIDTH = Dimensions.get('window').width;

type DetailModal = 'about' | 'privacy' | 'terms' | 'contact' | null;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Reopens the menu; used to restore it when a pushed page navigates back. */
  onOpen?: () => void;
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function DetailView({ title, body, onClose }: {
  title: string; body: string; onClose: () => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[dv.wrap, { backgroundColor: c.surfacePrimary }]}>
      <View style={[dv.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={16}
          style={dv.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack')}
        >
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
  const { t } = useTranslation();

  const rows = [
    {
      icon: 'mail' as const,
      label: t('menu.emailUs'),
      sub: t('sideMenu.contactEmail'),
      onPress: () => Linking.openURL(t('sideMenu.contactUrl')),
    },
  ];

  return (
    <View style={[dv.wrap, { backgroundColor: c.surfacePrimary }]}>
      <View style={[dv.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={16}
          style={dv.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('sideMenu.goBack')}
        >
          <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[dv.title, { color: c.textPrimary }]}>{t('menu.contactUs')}</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={dv.body}>
        <Text style={[dv.text, { color: c.textSecondary, marginBottom: spacing.lg }]}>
          {t('menu.contactIntro')}
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

export function SideMenu({ visible, onClose, onOpen }: Props) {
  const c      = useColors();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();
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
      // iOS only builds the rich link preview (icon + title) when the link is a
      // separate `url` item — a URL inside `message` stays plain text. Android
      // ignores `url`, so there it has to be appended to the message instead.
      const text = t('menu.shareMessage');
      await Share.share(
        Platform.OS === 'ios'
          ? { message: text, url: STORE_URL, title: t('sideMenu.shareTitle') }
          : { message: `${text} ${STORE_URL}`, title: t('sideMenu.shareTitle') },
      );
    } catch {}
    onClose();
  };

  const handleRate = () => {
    Linking.openURL(`${STORE_URL}?action=write-review`);
    onClose();
  };

  // Two groups of menu items
  const navigateTo = (screen: 'Faq' | 'ReportIssue' | 'DocumentChecklist' | 'ProcessingTimes') => () => {
    onClose();
    navigation.navigate(screen);
    // Restore the menu when the user pops back to this screen.
    const unsubscribe = navigation.addListener('focus', () => {
      unsubscribe();
      onOpen?.();
    });
  };

  const groupOne: MenuItem[] = [
    { icon: 'checkbox',        label: t('menu.documentChecklists'),    onPress: navigateTo('DocumentChecklist'), accent: palette.success },
    { icon: 'hourglass',       label: t('menu.checkProcessingTimes'),  onPress: navigateTo('ProcessingTimes'),  accent: palette.warning },
  ];

  const groupAbout: MenuItem[] = [
    { icon: 'help-circle',       label: t('menu.faq'),           onPress: navigateTo('Faq'),          accent: palette.blue },
    { icon: 'information-circle', label: t('menu.aboutUs'),       onPress: () => setDetail('about'),   accent: palette.purple },
    { icon: 'lock-closed',        label: t('menu.privacyPolicy'), onPress: () => setDetail('privacy'), accent: palette.success },
    { icon: 'document-text',      label: t('menu.terms'),         onPress: () => setDetail('terms'),   accent: palette.blue },
  ];

  const groupTwo: MenuItem[] = [
    { icon: 'bug',   label: t('menu.reportIssue'), onPress: navigateTo('ReportIssue'), accent: palette.canadaRed },
    { icon: 'mail',  label: t('menu.contactUs'),   onPress: () => setDetail('contact'), accent: palette.blue },
    { icon: 'share', label: t('menu.shareApp'),    onPress: handleShare,                accent: palette.success },
    // iOS only — the label says App Store, and Play has no write-review deep link.
    ...(Platform.OS === 'ios'
      ? [{ icon: 'star' as const, label: t('menu.reviewAppStore'), onPress: handleRate, accent: palette.warning }]
      : []),
  ];

  const renderItem = (item: MenuItem, idx: number, arr: MenuItem[]) => (
    <TouchableOpacity
      key={item.label}
      style={[s.row, idx < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
      onPress={item.onPress}
      activeOpacity={0.55}
      accessibilityRole="button"
      accessibilityLabel={item.label}
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
            title={detail === 'about' ? t('menu.aboutUs') : detail === 'terms' ? t('menu.terms') : t('menu.privacyPolicy')}
            body={
              detail === 'about'
                ? t('menu.aboutBody')
                : detail === 'terms'
                  ? t('menu.termsBody')
                  : t('menu.privacyBody', { url: PRIVACY_POLICY_URL })
            }
            onClose={() => setDetail(null)}
          />
        ) : (
          <>
            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top + spacing.md, borderBottomColor: c.border }]}>
              <View style={s.headerInner}>
                <View>
                  <Logo size={20} />
                  <Text style={[s.appSub,  { color: c.textMuted }]}>{t('menu.subtitle')}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={16}
                style={s.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('sideMenu.closeMenu')}
              >
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
              <Text style={[s.groupTitle, { color: c.textMuted }]}>{t('menu.general')}</Text>
              <View style={[s.group, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                {groupOne.map((item, i) => renderItem(item, i, groupOne))}
              </View>

              {/* About */}
              <Text style={[s.groupTitle, { color: c.textMuted }]}>{t('menu.about')}</Text>
              <View style={[s.group, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                {groupAbout.map((item, i) => renderItem(item, i, groupAbout))}
              </View>

              {/* Support */}
              <Text style={[s.groupTitle, { color: c.textMuted }]}>{t('menu.support')}</Text>
              <View style={[s.group, { borderColor: c.border, backgroundColor: c.surfaceCard }]}>
                {groupTwo.map((item, i) => renderItem(item, i, groupTwo))}
              </View>

            </ScrollView>

            {/* Footer */}
            <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: c.border }]}>
              <Text style={[s.footerText, { color: c.textMuted }]}>
                {t('common.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
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
