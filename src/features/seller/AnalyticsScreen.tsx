/**
 * Analizler: KPI kartları (satış, sipariş, ortalama sepet, izleyici, takipçi, net kazanç),
 * günlük / haftalık satış çubuk grafiği (View tabanlı), en çok satanlar ve yayın performansı tablosu.
 * Satış verisi yoksa deterministik örnek veriyle önizleme gösterir.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Header, Icon, PressableScale, Screen, Segmented, Text, type IconName } from '@/components/ui';
import { formatCompact, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSellerStore } from '@/store/seller';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

import { useQaOffset } from './qaSeed';
import { useNow } from './actions';
import { buildAnalytics, delta, formatPercent, shortDate, type AnalyticsKpis } from './logic';
import { Card, Thumb, tint } from './ui';

const CHART_H = 150;
/** Sağdaki eksen etiketleri için ayrılan genişlik (çubuklarla çakışmasın) */
const AXIS_W = 56;

/** Kutucuk değerleri: ₺100.000'e kadar tam tutar (₺17.009), üstü kısaltılmış (₺1,2Mn) */
function compactTRY(v: number): string {
  return v >= 100_000 ? `₺${formatCompact(v)}` : formatTRY(Math.round(v));
}

/** Grafik ekseni için "yuvarlak" üst sınır: 10.020 → 12.000, 740 → 800 (orta çizgi de yuvarlak çıkar) */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * pow >= v) ?? 10;
  return step * pow;
}

/** Eksen etiketi: aynı eksende tutarlı biçim (büyük değerlerde hepsi kısaltılmış) */
function axisLabel(v: number, max: number): string {
  if (v === 0) return '₺0';
  return max >= 10_000 ? `₺${formatCompact(v)}` : formatTRY(Math.round(v));
}

function KpiTile({ label, value, change, icon }: { label: string; value: string; change: number | null; icon: IconName }) {
  const { colors } = useTheme();
  const up = change !== null && change > 0.0005;
  const down = change !== null && change < -0.0005;
  const tone = up ? colors.success : down ? colors.danger : colors.textSecondary;
  return (
    <View style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.inline}>
        <Icon name={icon} size={15} color="textSecondary" />
        <Text variant="footnote" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
      </View>
      <Text variant="title2" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={[styles.delta, { backgroundColor: tint(tone, 0.12) }]}>
        {up || down ? <Icon name={up ? 'arrow-up' : 'arrow-down'} size={11} color={tone} /> : null}
        <Text variant="caption" color={tone}>
          {change === null ? 'Yeni' : up || down ? formatPercent(Math.abs(change)) : 'Değişim yok'}
        </Text>
      </View>
    </View>
  );
}

export function AnalyticsScreen() {
  const { colors } = useTheme();
  const qaOffset = useQaOffset();
  const now = useNow(60_000);
  const orders = useSellerStore((s) => s.orders);
  const sessions = useSellerStore((s) => s.sessions);
  const shows = useSellerStore((s) => s.shows);
  const [period, setPeriod] = useState<'7' | '28'>('7');
  const [selected, setSelected] = useState<number | null>(null);

  const a = buildAnalytics(orders, sessions, shows, period === '7' ? 7 : 28, now);
  const k = a.kpis;
  const p = a.previous;
  const max = niceCeil(Math.max(1, ...a.bars.map((b) => b.value)));
  const sel = selected !== null && a.bars[selected] ? selected : a.bars.length - 1;
  const bar = a.bars[sel];
  const chartTotal = a.bars.reduce((s, b) => s + b.value, 0);
  const tiles: { key: keyof AnalyticsKpis; label: string; value: string; icon: IconName }[] = [
    { key: 'sales', label: 'Toplam satış', value: compactTRY(k.sales), icon: 'cash-outline' },
    { key: 'orders', label: 'Sipariş', value: formatCompact(k.orders), icon: 'receipt-outline' },
    { key: 'aov', label: 'Ortalama sepet', value: compactTRY(k.aov), icon: 'basket-outline' },
    { key: 'viewers', label: 'İzleyici', value: formatCompact(k.viewers), icon: 'eye-outline' },
    { key: 'followers', label: 'Takipçi kazanımı', value: `+${formatCompact(k.followers)}`, icon: 'person-add-outline' },
    { key: 'net', label: 'Net kazanç', value: compactTRY(k.net), icon: 'wallet-outline' },
  ];

  return (
    <Screen>
      <Header title="Analizler" subtitle={a.demo ? 'Örnek veri' : 'Son güncelleme: az önce'} />
      <ScrollView contentOffset={qaOffset} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Segmented
          options={[
            { key: '7', label: 'Son 7 gün' },
            { key: '28', label: 'Son 28 gün' },
          ]}
          value={period}
          onChange={(v) => {
            setPeriod(v);
            setSelected(null);
          }}
        />

        {a.demo ? (
          <View style={[styles.demo, { backgroundColor: tint(colors.info, 0.1) }]}>
            <Icon name="flask-outline" size={18} color={colors.info} />
            <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
              Henüz satışın yok. Analizler ekranının nasıl görüneceğini örnek verilerle gösteriyoruz; ilk satışından sonra kendi verilerin gelir.
            </Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          {tiles.map((t) => (
            <KpiTile key={t.key} label={t.label} value={t.value} icon={t.icon} change={delta(k[t.key], p[t.key])} />
          ))}
        </View>
        <Text variant="caption" color="textTertiary">
          Değişimler önceki {period === '7' ? '7' : '28'} günle karşılaştırılır.
        </Text>

        <Card>
          <View style={[styles.inline, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <Text variant="headline" weight="700">
                {period === '7' ? 'Günlük satış' : 'Haftalık satış'}
              </Text>
              <Text variant="footnote" color="textSecondary">
                Toplam {formatTRY(chartTotal)}
              </Text>
            </View>
            {bar ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="title3" tabular>
                  {formatTRY(bar.value)}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  {period === '7' ? bar.label : `${bar.label} haftası`} · {bar.orders} sipariş
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.chart}>
            {[1, 0.5, 0].map((g) => (
              <View key={g} style={[styles.grid0, { bottom: 22 + g * CHART_H, borderTopColor: colors.border }]}>
                <Text variant="caption" color="textTertiary" numberOfLines={1} style={[styles.gridLabel, { backgroundColor: colors.card }]}>
                  {axisLabel(max * g, max)}
                </Text>
              </View>
            ))}
            <View style={styles.bars}>
              {a.bars.map((b, i) => {
                const h = b.value > 0 ? Math.max(4, (b.value / max) * CHART_H) : 2;
                const active = i === sel;
                return (
                  <PressableScale
                    key={b.key}
                    scaleTo={0.96}
                    onPress={() => {
                      haptic.tap();
                      setSelected(i);
                    }}
                    style={styles.barHit}
                    accessibilityLabel={`${b.label}: ${formatTRY(b.value)}, ${b.orders} sipariş`}>
                    <View style={[styles.barCol, { height: CHART_H }]}>
                      <View
                        style={{
                          height: h,
                          width: '62%',
                          maxWidth: 34,
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                          backgroundColor: b.value > 0 ? colors.accent : colors.surfaceAlt,
                          opacity: active || b.value === 0 ? 1 : 0.45,
                        }}
                      />
                    </View>
                    <Text variant="caption" color={active ? 'text' : 'textSecondary'} numberOfLines={1} style={styles.barLabel}>
                      {b.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </Card>

        <Card padded={false}>
          <Text variant="headline" weight="700" style={styles.cardTitle}>
            En çok satanlar
          </Text>
          {a.topProducts.length ? (
            a.topProducts.map((t, i) => (
              <View key={t.id} style={[styles.top, { borderTopColor: colors.border }]}>
                <Text variant="headline" weight="800" color="textTertiary" style={{ width: 18 }}>
                  {i + 1}
                </Text>
                <Thumb uri={t.image} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="subhead" weight="600" numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text variant="footnote" color="textSecondary">
                    {t.count} adet
                  </Text>
                </View>
                <Text variant="subhead" weight="800">
                  {formatTRY(t.revenue)}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="footnote" color="textSecondary" style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              Bu dönemde satış yok.
            </Text>
          )}
        </Card>

        <Card padded={false}>
          <Text variant="headline" weight="700" style={styles.cardTitle}>
            Yayın performansı
          </Text>
          <View style={[styles.tableHead, { backgroundColor: colors.surface }]}>
            <Text variant="caption" color="textSecondary" style={styles.colTitle}>
              YAYIN
            </Text>
            <Text variant="caption" color="textSecondary" style={styles.colNum}>
              SATIŞ
            </Text>
            <Text variant="caption" color="textSecondary" style={styles.colSmall}>
              ÜRÜN
            </Text>
            <Text variant="caption" color="textSecondary" style={styles.colSmall}>
              İZL.
            </Text>
          </View>
          {a.shows.length ? (
            a.shows.map((s) => (
              <View key={s.id} style={[styles.tableRow, { borderTopColor: colors.border }]}>
                <View style={styles.colTitle}>
                  <Text variant="footnote" weight="600" numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {shortDate(s.date)} · {s.durationMin} dk
                  </Text>
                </View>
                <Text variant="footnote" weight="700" style={styles.colNum} numberOfLines={1}>
                  {compactTRY(s.gross)}
                </Text>
                <Text variant="footnote" style={styles.colSmall}>
                  {s.items}
                </Text>
                <Text variant="footnote" style={styles.colSmall}>
                  {formatCompact(s.viewers)}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="footnote" color="textSecondary" style={{ padding: 16 }}>
              İlk canlı yayınından sonra yayın bazlı sonuçların burada görünür.
            </Text>
          )}
        </Card>

        <Text variant="footnote" color="textTertiary" align="center">
          Buradaki rakamlar yaklaşık değerlerdir. Kesinleşen tutarları Ödemeler → Hesap Hareketleri bölümünde görürsün.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, gap: 14, paddingBottom: 40 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  demo: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { flexGrow: 1, flexBasis: '45%', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  chart: { height: CHART_H + 22 + 8, marginTop: 20 },
  grid0: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1 },
  gridLabel: { position: 'absolute', right: 0, top: -8, width: AXIS_W - 6, textAlign: 'right', lineHeight: 16 },
  barLabel: { marginTop: 6, height: 16 },
  bars: { position: 'absolute', left: 0, right: AXIS_W, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' },
  barHit: { flex: 1, alignItems: 'center' },
  barCol: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  cardTitle: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  colTitle: { flex: 1 },
  colNum: { width: 72, textAlign: 'right' },
  colSmall: { width: 40, textAlign: 'right' },
});
