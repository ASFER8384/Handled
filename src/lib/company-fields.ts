/**
 * The fixed choices on the company page: what a business calls itself, where
 * it is, and where else it can be found.
 *
 * Lists rather than free text where the answer is one of a known few — a typed
 * country is a country nothing can be filtered by later.
 */
export const COMPANY_TYPES = [
  'Photography',
  'Videography',
  'Hair & makeup',
  'Event planning',
  'Catering',
  'Floristry',
  'Music & DJ',
  'Design',
  'Marketing',
  'Consulting',
  'Coaching',
  'Tutoring',
  'Construction & trades',
  'Other',
];

/** Dialling codes, the handful most of this workspace's clients will use. */
export const PHONE_CODES = [
  { code: '+971', label: 'AE +971' },
  { code: '+966', label: 'SA +966' },
  { code: '+974', label: 'QA +974' },
  { code: '+973', label: 'BH +973' },
  { code: '+968', label: 'OM +968' },
  { code: '+965', label: 'KW +965' },
  { code: '+91', label: 'IN +91' },
  { code: '+92', label: 'PK +92' },
  { code: '+44', label: 'UK +44' },
  { code: '+1', label: 'US +1' },
  { code: '+61', label: 'AU +61' },
  { code: '+49', label: 'DE +49' },
  { code: '+33', label: 'FR +33' },
  { code: '+34', label: 'ES +34' },
  { code: '+39', label: 'IT +39' },
  { code: '+20', label: 'EG +20' },
  { code: '+27', label: 'ZA +27' },
  { code: '+60', label: 'MY +60' },
  { code: '+65', label: 'SG +65' },
  { code: '+63', label: 'PH +63' },
];

export const COUNTRIES = [
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Bahrain',
  'Oman',
  'Kuwait',
  'Egypt',
  'India',
  'Pakistan',
  'Bangladesh',
  'Sri Lanka',
  'United Kingdom',
  'Ireland',
  'United States',
  'Canada',
  'Australia',
  'New Zealand',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Portugal',
  'Greece',
  'Turkey',
  'South Africa',
  'Kenya',
  'Nigeria',
  'Singapore',
  'Malaysia',
  'Indonesia',
  'Philippines',
  'Thailand',
  'Japan',
  'China',
  'Hong Kong SAR',
  'Brazil',
  'Mexico',
  'Argentina',
];

/** Where the business can also be found, in the order the page lists them. */
export const SOCIALS = [
  { key: 'blog', label: 'Blog', hint: 'https://your.blog' },
  { key: 'facebook', label: 'Facebook', hint: 'https://facebook.com/you' },
  { key: 'linkedin', label: 'LinkedIn', hint: 'https://linkedin.com/in/you' },
  { key: 'twitter', label: 'X', hint: 'https://x.com/you' },
  { key: 'instagram', label: 'Instagram', hint: 'https://instagram.com/you' },
  { key: 'pinterest', label: 'Pinterest', hint: 'https://pinterest.com/you' },
  { key: 'behance', label: 'Behance', hint: 'https://behance.net/you' },
  { key: 'dribbble', label: 'Dribbble', hint: 'https://dribbble.com/you' },
  { key: 'tiktok', label: 'TikTok', hint: 'https://tiktok.com/@you' },
  { key: 'other', label: 'Other', hint: 'https://somewhere.else' },
] as const;

export type SocialKey = (typeof SOCIALS)[number]['key'];
export type Socials = Partial<Record<SocialKey, string>>;
