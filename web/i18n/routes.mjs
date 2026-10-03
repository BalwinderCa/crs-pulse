// English path -> French path. The French build writes each page at its French path
// and rewrites every internal link through toFr(), so page code keeps linking to the
// English paths. Both builds use the map for hreflang alternates and the language switch.
export const FR_PAGES = {
  '/': '/fr',
  '/crs-calculator': '/fr/calculateur-crs',
  '/fsw-calculator': '/fr/calculateur-ptqf',
  '/bc-pnp-calculator': '/fr/calculateur-bc-pnp',
  '/sinp-calculator': '/fr/calculateur-sinp',
  '/draws': '/fr/tirages',
  '/analytics': '/fr/analyses',
  '/checklists': '/fr/listes-de-documents',
  '/processing-times': '/fr/delais-de-traitement',
  '/timeline': '/fr/chronologie',
  '/features': '/fr/fonctionnalites',
  '/guides': '/fr/guides',
  '/crs-points': '/fr/points-crs',
  '/improve-crs-score': '/fr/ameliorer-score-crs',
  '/language-tests-clb': '/fr/tests-de-langue-nclc',
  '/fsw-67-points': '/fr/ptqf-67-points',
  '/express-entry-draws': '/fr/types-de-tirages',
  '/express-entry-process': '/fr/processus-entree-express',
  '/about': '/fr/a-propos',
  '/privacy': '/fr/confidentialite',
  '/terms': '/fr/conditions',
};

// /draws/<type> slugs in French. Round numbers stay as they are: /draws/447 -> /fr/tirages/447.
export const FR_DRAW_TYPES = {
  general: 'general',
  cec: 'cec',
  pnp: 'pcp',
  french: 'francais',
  healthcare: 'sante',
  stem: 'stim',
  transport: 'transport',
  trades: 'metiers',
  education: 'education',
  agriculture: 'agriculture',
  'senior-managers': 'cadres-superieurs',
  military: 'militaires',
};

/** French path for an English site path (fragment kept), or null if it has none. */
export function toFr(enPath) {
  const [path, frag] = enPath.split('#');
  let fr = FR_PAGES[path] ?? null;
  const m = /^\/draws\/([a-z0-9-]+)$/.exec(path);
  if (!fr && m) fr = /^\d/.test(m[1]) ? `/fr/tirages/${m[1]}` : FR_DRAW_TYPES[m[1]] ? `/fr/tirages/${FR_DRAW_TYPES[m[1]]}` : null;
  return fr ? fr + (frag ? `#${frag}` : '') : null;
}
