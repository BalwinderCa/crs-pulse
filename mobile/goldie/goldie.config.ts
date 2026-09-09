// goldie config for CRS Pulse — App Store + Google Play store assets.
//
// Both device families render from the SAME scenes and flows; argent flows
// replay on Android because every selector below is text-based, not a
// coordinate. Regenerate assets with:
//   GOLDIE_CONFIG=$PWD/goldie/goldie.config.ts npx -y goldie@0 capture
//   ... then `frame`, `manifest`, `verify`.
//
// NOTE ON STATE: goldie reinstalls the app with cleared data before every
// flow, so each flow starts at the 4-slide onboarding with an empty profile.
// Every flow therefore dismisses onboarding first, and the scenes that need a
// CRS score fill the language inputs — a fresh install keeps language scores
// at 0, which is exactly what holds isCrsScoreReady false and puts the lock
// overlay over the whole Analytics screen.

// WARNING: a goldie.design.json sitting next to this file SILENTLY OVERRIDES
// the theme/frame/template below - the studio Design panel writes it, and one
// can also get auto-seeded. If a render does not match this config, check for
// that file first (goldie/out/web/store.json .design shows what is actually in
// effect). Delete it to hand control back to this config, or copy its values
// up into theme.* here if you want to keep the look.

const APP_ROOT = "/Users/balwindersingh/crs-pulse/mobile";

const config = {
  appRoot: APP_ROOT,
  // Release simulator build (EAS `preview-simulator` profile — the local
  // Xcode 26.6 build fails on RN 0.76's vendored fmt).
  appPath: "/Users/balwindersingh/crs-pulse/mobile/goldie/.builds/CRSPulse.app",
  bundleId: "com.crspulse.app",

  android: {
    appPath: "/Users/balwindersingh/crs-pulse/mobile/goldie/.builds/crspulse-preview.apk",
    applicationId: "com.crspulse.app",
  },

  devices: ["iphone-6.9"],
  locales: ["en-US"],
  appearance: "light",

  frame: { variant: "17-pro-blue" },

  theme: {
    // Brand navy (#0A1628) into a cool off-white — matches the app's splash.
    background: "linear-gradient(165deg, #0A1628 0%, #12294A 45%, #1A6DFF 100%)",
    headlineColor: "#FFFFFF",
    subheadColor: "#B9CBE4",
    fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
    copyHeightRatio: 0.24,
    deviceWidthRatio: 0.84,
    template: "editorial",
    layout: "classic",
  },

  store: {
    name: "CRS Pulse",
    subtitle: { "en-US": "Express Entry CRS & draw alerts" },
    developer: "Balwinder Singh",
    category: "Reference",
    rating: 4.8,
    ratingCount: "New",
    ageRating: "4+",
    price: "Free",
    description: {
      "en-US":
        "CRS Pulse is a free companion for anyone applying for Canadian permanent residence through Express Entry.\n\nCalculate your CRS score with the official IRCC formula, check the FSW 67-point grid, BC PNP SIRS and Saskatchewan EOI, and see every IRCC draw the moment it is published — with push alerts so you never miss one.\n\nTrack your application end to end: milestone timeline, IRCC processing-time estimates, and per-program document checklists.\n\nNo account, no sign-up, no in-app purchases. Everything stays on your device.",
    },
  },

  scenes: [
    {
      kind: "screenshot",
      id: "draws",
      flow: "store-01-draws",
      headline: { "en-US": "Every IRCC draw, the moment it lands" },
      subhead: { "en-US": "Live results, category filters and push alerts." },
    },
    {
      kind: "screenshot",
      id: "crs",
      flow: "store-02-crs",
      headline: { "en-US": "Know exactly where you stand" },
      subhead: { "en-US": "The official IRCC CRS formula, recalculated as you type." },
    },
    {
      kind: "screenshot",
      id: "analytics",
      flow: "store-03-analytics",
      headline: { "en-US": "See your odds before the next draw" },
      subhead: { "en-US": "Your score against real cutoffs, and what would move it." },
    },
    {
      kind: "screenshot",
      id: "calculators",
      flow: "store-04-calculators",
      headline: { "en-US": "Four calculators, one app" },
      subhead: { "en-US": "CRS, FSW 67-point, BC PNP SIRS and Saskatchewan EOI." },
    },
    {
      kind: "screenshot",
      id: "home",
      flow: "store-05-home",
      headline: { "en-US": "Your whole application, one screen" },
      subhead: { "en-US": "Score, latest draw and progress the moment you open it." },
    },
    {
      kind: "screenshot",
      id: "timeline",
      flow: "store-06-timeline-ios",
      headline: { "en-US": "Every milestone, dated" },
      subhead: { "en-US": "ITA, AOR, biometrics, medical - logged as you go." },
    },

    // Exactly one preview scene. Clips are joined as recorded: Apple requires an
    // app preview to be a plain screen recording, no bezel and no captions.
    // Play takes no video upload (its promo is a YouTube link), so the Android
    // render is a 1080x2400 portrait video to post there.
    {
      kind: "preview",
      id: "preview",
      segments: [
        { id: "home",          flow: "store-preview-01-home" },
        { id: "timeline",      flow: "store-preview-02-timeline" },
        { id: "draws",         flow: "store-preview-03-draws" },
        { id: "analytics",     flow: "store-preview-04-analytics" },
        { id: "profile",       flow: "store-preview-05-profile" },
        { id: "menu",          flow: "store-preview-06-menu" },
        { id: "notifications", flow: "store-preview-07-notifications" },
      ],
    },
  ],
};

export default config;
