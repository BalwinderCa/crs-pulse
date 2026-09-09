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

  devices: ["iphone-6.9", "pixel-10-pro"],
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
      id: "checklist",
      flow: "store-05-checklist",
      headline: { "en-US": "Never miss a document" },
      subhead: { "en-US": "Per-program checklists you can tick off as you go." },
    },
  ],
};

export default config;
