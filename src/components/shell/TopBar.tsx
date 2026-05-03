import { useTranslations } from 'next-intl';
import LocaleToggle from './LocaleToggle';
import UserMenu from './UserMenu';

interface TopBarProps {
  email: string;
}

export default function TopBar({ email }: TopBarProps) {
  const t = useTranslations('common');

  return (
    <header className="bg-primary text-white shadow-wallet">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold tracking-tight">{t('appName')}</h1>
        <div className="flex items-center gap-3">
          <LocaleToggle />
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
