import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';
import { isEmailAllowed } from '@/lib/allowlist';
import { redirect } from 'next/navigation';
import { getCostAnalytics, deriveStats } from '@/lib/costAnalytics';
import { getCostAlertConfig } from '@/lib/costAlerts';
import HeaderStats from '@/components/cost/HeaderStats';
import MonthlyChart from '@/components/cost/MonthlyChart';
import DailyChart from '@/components/cost/DailyChart';
import CostPerUserChart from '@/components/cost/CostPerUserChart';
import SkuBreakdownTable from '@/components/cost/SkuBreakdownTable';
import WhatChangedCard from '@/components/cost/WhatChangedCard';
import FreeTierCard from '@/components/cost/FreeTierCard';
import LagIndicator from '@/components/cost/LagIndicator';
import RefreshNowButton from '@/components/cost/RefreshNowButton';
import ExportCsvButton from '@/components/cost/ExportCsvButton';
import OptimizationTips from '@/components/cost/OptimizationTips';
import ProjectMetadata from '@/components/cost/ProjectMetadata';
import CostThresholdCard from '@/components/cost/CostThresholdCard';
import MonthCompareSelector from '@/components/cost/MonthCompareSelector';

export const dynamic = 'force-dynamic';

export default async function CostPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !isEmailAllowed(session.email)) {
    redirect('/sign-in');
  }

  const t = await getTranslations('costDetail');
  const tCommon = await getTranslations('common');
  const locale = await getLocale();
  const Arrow = locale === 'he' ? ArrowRight : ArrowLeft;

  const [analytics, alertConfig] = await Promise.all([
    getCostAnalytics(),
    getCostAlertConfig(),
  ]);
  const stats = deriveStats(analytics);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <Arrow size={16} aria-hidden />
          {tCommon('back')}
        </Link>
        <div className="flex items-center gap-2">
          <RefreshNowButton />
          <ExportCsvButton hasData={analytics.hasData} />
        </div>
      </div>

      <header>
        <h1 className="text-3xl font-bold mb-1">{t('title')}</h1>
        <p className="text-text-secondary text-sm">{t('subtitle')}</p>
      </header>

      <LagIndicator
        lagHours={analytics.exportLagHours}
        refreshedAt={analytics.refreshedAt}
        hasData={analytics.hasData}
      />

      <HeaderStats stats={stats} currency={analytics.currency} locale={locale} />

      {analytics.hasData ? (
        <>
          <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-semibold text-base">{t('sections.monthly')}</h2>
            </div>
            <MonthlyChart
              data={analytics.monthlyHistory}
              activeUsersByMonth={analytics.monthlyActiveUsers}
              currency={analytics.currency}
              locale={locale}
            />
          </section>

          <div className="grid lg:grid-cols-2 gap-5">
            <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
              <h2 className="font-semibold text-base mb-4">{t('sections.daily')}</h2>
              <DailyChart
                data={analytics.dailyCurrentMonth}
                currency={analytics.currency}
                locale={locale}
              />
            </section>

            <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
              <h2 className="font-semibold text-base mb-4">{t('sections.perUser')}</h2>
              <CostPerUserChart
                data={analytics.monthlyHistory}
                activeUsersByMonth={analytics.monthlyActiveUsers}
                currency={analytics.currency}
                locale={locale}
              />
            </section>
          </div>

          <section className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-5">
            <h2 className="font-semibold text-base mb-3">{t('sections.skus')}</h2>
            <SkuBreakdownTable
              skus={analytics.skuBreakdownCurrent}
              currency={analytics.currency}
              locale={locale}
            />
          </section>

          <div className="grid lg:grid-cols-2 gap-5">
            <WhatChangedCard
              skus={analytics.skuBreakdownCurrent}
              currency={analytics.currency}
              locale={locale}
            />
            <FreeTierCard
              freeTierSaved={stats.freeTierSaved}
              currency={analytics.currency}
              locale={locale}
            />
          </div>

          <MonthCompareSelector
            months={analytics.monthlyHistory}
            currency={analytics.currency}
            locale={locale}
          />

          <CostThresholdCard
            currency={analytics.currency}
            initialAmount={alertConfig.thresholdAmount}
            initialEnabled={alertConfig.enabled}
            initialDailySpike={alertConfig.dailySpikeEnabled}
          />

          <OptimizationTips
            skus={analytics.skuBreakdownCurrent}
            mtd={stats.mtd}
            currency={analytics.currency}
            locale={locale}
          />
        </>
      ) : (
        <div className="rounded-[var(--radius-card)] bg-surface shadow-wallet p-8 text-center text-text-secondary">
          {t('noData')}
        </div>
      )}

      <ProjectMetadata />
    </div>
  );
}
