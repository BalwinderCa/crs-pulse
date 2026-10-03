# French translation guide for crspulse.com

Canadian French (fr-CA), plain and direct, `vous`. Write it as a native francophone
immigration site would, not word for word from the English.

## How strings are translated

- Wrap every user-visible English string in `T('…')` (imported from `./i18n.mjs`) and put
  the French in a JSON file under `web/i18n/fr/` (one file per area; key = the exact
  English string, value = French).
- Never put `${…}` inside a key. Use placeholders: `T('Round #{n} on {date}', { n, date })`.
  The French value keeps the same `{n}` / `{date}` placeholders.
- Strings inside client-side `<script>` templates: interpolate at build time, e.g.
  `'${jsStr(T('Biggest boost for this profile:'))}'` where `jsStr` escapes for a JS string
  literal (or `${JSON.stringify(T('…'))}` for a full literal).
- Links in your strings keep their **English** paths (`/crs-calculator`); the French build
  rewrites them to French paths automatically.
- Typography: non-breaking space before `:` `;` `?` `!` and inside « » is optional; a plain
  space before `:` is fine. Use the typographic apostrophe `’`. Numbers: `1 200`, `3 500`
  (the French build formats numbers with fr-CA already; don't hard-code them).
- Dates come from `longDate`/`shortDate`/`fullDate`, which are already French in the French
  build. Don't hand-write month names.
- Check your area with `CRS_LANG=fr node web/build.mjs` and read
  `web/public/fr/_i18n-missing.json`. Every string from your area must be gone from it.

## Terminology (use IRCC's French terms)

| English | French |
|---|---|
| Express Entry | Entrée express |
| CRS / Comprehensive Ranking System | CRS / Système de classement global (SCG). Keep “CRS” in titles and short UI, mention SCG once in prose |
| CRS score | score CRS |
| draw / round of invitations | tirage / ronde d’invitations |
| cutoff (score) | score minimal (or « note de passage » once, for context) |
| ITA (Invitation to Apply) | invitation à présenter une demande (IPD) |
| e-APR | demande de résidence permanente électronique |
| AOR | accusé de réception (AR) |
| COPR | confirmation de résidence permanente (CRP) |
| PR / permanent residence | résidence permanente (RP) |
| PR card | carte de RP |
| CEC | Catégorie de l’expérience canadienne (CEC) |
| FSW | Programme des travailleurs qualifiés (fédéral) (PTQF) |
| FST | Programme des travailleurs de métiers spécialisés (fédéral) (PTMSF) |
| PNP / provincial nomination | Programme des candidats des provinces (PCP) / désignation provinciale |
| BC PNP | BC PNP (Programme des candidats de la Colombie-Britannique) |
| SINP | SINP (Programme des candidats immigrants de la Saskatchewan) |
| SIRS | SIRS (keep) |
| EOI | déclaration d’intérêt (EOI) |
| CLB | NCLC (Niveaux de compétence linguistique canadiens). For English tests IRCC still says “NCLC” in French |
| ECA | évaluation des diplômes d’études (EDE) |
| proof of funds | preuve de fonds |
| biometrics | données biométriques |
| medical exam | examen médical |
| job offer / arranged employment | offre d’emploi / emploi réservé |
| skill transferability | transférabilité des compétences |
| spouse or common-law partner | époux ou conjoint de fait |
| category-based selection | sélection par catégorie |
| healthcare and social services | soins de santé et services sociaux |
| trades | métiers |
| STEM | STIM |
| pool | bassin |
| tie-break rule | règle de départage |
| processing time | délai de traitement |
| checklist | liste de documents / liste de vérification |
| the app / iPhone app | l’appli / l’appli iPhone |

Brand names stay English: CRS Pulse, App Store, IELTS, CELPIP, PTE Core, TEF Canada, TCF Canada.
IRCC round names (e.g. “Trades Occupations”) are translated with IRCC’s French names
(« Métiers », « Catégorie de l’expérience canadienne », « Programme des candidats des provinces »,
« Maîtrise du français », « Soins de santé et services sociaux », « Aucun programme précisé »…).
