import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isLocale, LOCALE_COOKIE_NAME, type Locale } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale: Locale = isLocale(cookieValue) ? cookieValue : defaultLocale;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
