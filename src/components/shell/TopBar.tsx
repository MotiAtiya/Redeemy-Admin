import { useTranslations } from 'next-intl';
import LocaleToggle from './LocaleToggle';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';
import NavLinks from './NavLinks';

interface TopBarProps {
  email: string;
}

export default function TopBar({ email }: TopBarProps) {
  const t = useTranslations('common');

  return (
    <header className="bg-topbar-bg text-topbar-fg shadow-wallet sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold tracking-tight truncate shrink-0">
            <span className="hidden sm:inline">{t('appName')}</span>
            <span className="sm:hidden">Redeemy</span>
          </h1>
          <NavLinks />
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />
          <LocaleToggle />
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
