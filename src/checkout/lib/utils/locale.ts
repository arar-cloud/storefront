import { type CountryCode } from "@/checkout/graphql";

let locales: typeof import('../content/compiled-locales/en-US.json') | null = null;

export const getLocales = async () => {
  if (!locales) {
    locales = await import('../content/compiled-locales/en-US.json');
  }
  return locales;
};

export const getCurrentHref = () => location.href;

const countryNames = new Intl.DisplayNames("EN-US", {
	type: "region",
});
export const getCountryName = (countryCode: CountryCode): string =>
	countryNames.of(countryCode) || countryCode;
