import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { dirOfLocale, type Locale } from '@/i18n/config';
import './globals.css';

const heebo = Heebo({
  variable: '--font-heebo',
  subsets: ['hebrew', 'latin'],
});

export const metadata: Metadata = {
  title: 'Redeemy Admin',
  description: 'Internal admin dashboard for Redeemy.',
};

// Runs before any React render to apply the user's stored theme choice and
// avoid a flash of the wrong palette. Reads localStorage('theme') and sets
// data-theme on <html>; missing/invalid → CSS prefers-color-scheme decides.
const themeInitScript = `
(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = dirOfLocale(locale);

  return (
    <html lang={locale} dir={dir} className={`${heebo.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
