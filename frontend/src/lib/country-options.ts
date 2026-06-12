export const countryOptions = [
  'Australia',
  'Bangladesh',
  'Belgium',
  'Canada',
  'China',
  'France',
  'Germany',
  'Hong Kong',
  'India',
  'Indonesia',
  'Ireland',
  'Italy',
  'Japan',
  'Malaysia',
  'Netherlands',
  'New Zealand',
  'Pakistan',
  'Philippines',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sri Lanka',
  'Sweden',
  'Switzerland',
  'Taiwan',
  'Thailand',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Vietnam',
] as const;

export function getCountryOptions(currentValue: string): string[] {
  const trimmed = currentValue.trim();

  if (!trimmed) {
    return [...countryOptions];
  }

  if (countryOptions.includes(trimmed as (typeof countryOptions)[number])) {
    return [...countryOptions];
  }

  return [trimmed, ...countryOptions];
}
