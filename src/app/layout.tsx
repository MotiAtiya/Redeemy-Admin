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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = dirOfLocale(locale);

  return (
    <html lang={locale} dir={dir} className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
