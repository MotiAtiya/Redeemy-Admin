import { useTranslations } from 'next-intl';
import LocaleToggle from './LocaleToggle';
import UserMenu from './UserMenu';
import NavLinks from './NavLinks';

interface TopBarProps {
  email: string;
}

export default function TopBar({ email }: TopBarProps) {
  const t = useTranslations('common');

  return (
    <header className="bg-primary text-white shadow-wallet sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <h1 className="text-lg font-bold tracking-tight truncate">{t('appName')}</h1>
          <NavLinks />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <LocaleToggle />
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
