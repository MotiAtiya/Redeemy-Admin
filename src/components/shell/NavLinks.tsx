'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Users, Activity, DollarSign } from 'lucide-react';
import type { ComponentType } from 'react';

interface NavItem {
  href: string;
  labelKey: 'home' | 'users' | 'activity' | 'cost';
  Icon: ComponentType<{ size?: number; className?: string }>;
}

const ITEMS: readonly NavItem[] = [
  { href: '/', labelKey: 'home', Icon: Home },
  { href: '/users', labelKey: 'users', Icon: Users },
  { href: '/activity', labelKey: 'activity', Icon: Activity },
  { href: '/cost', labelKey: 'cost', Icon: DollarSign },
];

export default function NavLinks() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map(({ href, labelKey, Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition ${
              active
                ? 'bg-white/20 text-white font-semibold'
                : 'text-white/85 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={16} className="hidden sm:inline" />
            <span>{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
