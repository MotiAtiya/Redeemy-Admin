import { Lightbulb } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { SkuRow } from '@/lib/costAnalytics';

interface Tip {
  key: string;
  values?: Record<string, string | number>;
}

function buildTips(skus: SkuRow[], mtd: number): Tip[] {
  const tips: Tip[] = [];
  if (mtd === 0 || skus.length === 0) return tips;

  const top = skus[0];
  const topShare = mtd > 0 ? (top.amount / mtd) * 100 : 0;

  if (topShare > 60) {
    tips.push({
      key: 'topSkuDominates',
      values: { sku: top.sku, pct: Math.round(topShare) },
    });
  }

  // Heuristic by service name — the obvious Firebase services
  const lowerService = top.service.toLowerCase();
  const lowerSku = top.sku.toLowerCase();

  if (lowerService.includes('firestore')) {
    if (lowerSku.includes('read')) tips.push({ key: 'firestoreReads' });
    else if (lowerSku.includes('write')) tips.push({ key: 'firestoreWrites' });
    else tips.push({ key: 'firestoreGeneric' });
  } else if (lowerService.includes('storage')) {
    if (lowerSku.includes('egress') || lowerSku.includes('download')) tips.push({ key: 'storageEgress' });
    else if (lowerSku.includes('class a') || lowerSku.includes('class b')) tips.push({ key: 'storageOps' });
  } else if (lowerService.includes('functions') || lowerService.includes('cloud run')) {
    tips.push({ key: 'functionsInvocations' });
  } else if (lowerService.includes('messaging') || lowerService.includes('fcm')) {
    tips.push({ key: 'messagingGeneric' });
  } else if (lowerService.includes('logging')) {
    tips.push({ key: 'loggingVolume' });
  }

  // Top mover spike
  const biggestRise = [...skus]
    .filter((s) => s.delta !== undefined && s.delta > 0 && (s.deltaPct ?? 0) > 50)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];
  if (biggestRise) {
    tips.push({
      key: 'spikeWarning',
      values: { sku: biggestRise.sku, pct: Math.round(biggestRise.deltaPct ?? 0) },
    });
  }

  return tips.slice(0, 3);
}

export default async function OptimizationTips({
  skus,
  mtd,
  currency: _currency,
  locale: _locale,
}: {
  skus: SkuRow[];
  mtd: number;
  currency: string;
  locale: string;
}) {
  const t = await getTranslations('costDetail.tips');
  const tips = buildTips(skus, mtd);

  if (tips.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] bg-primary-surface/40 p-5">
      <h2 className="font-semibold text-base mb-3 inline-flex items-center gap-2">
        <Lightbulb size={18} className="text-primary" aria-hidden />
        {t('title')}
      </h2>
      <ul className="space-y-2 text-sm leading-relaxed">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-primary shrink-0">•</span>
            <span>{t(`items.${tip.key}`, tip.values ?? {})}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
