/**
 * "Sat" sekmesi — başvuru inceleniyor durumu (zaman çizelgesi + demo hızlandırma).
 */
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Button, Header, Icon, Screen, Text, toast, type IconName } from '@/components/ui';
import { getCategory, getSubcategory } from '@/data';
import { formatDateTime } from '@/lib/format';
import { useSellerStore } from '@/store/seller';
import { SCREEN_PADDING, useTheme } from '@/theme';

import { approveSellerNow, scheduleAutoApproval } from './actions';
import { bankFromIban, maskIban } from './logic';
import { useSellerExtras } from './store';
import { Card, KeyValue, StatusPill, tint } from './ui';

export const SELLER_TYPE_LABELS = { individual: 'Bireysel', sole_proprietor: 'Şahıs Şirketi', company: 'Kurumsal (Ltd. / A.Ş.)' } as const;
export const EXPERIENCE_LABELS = { new: 'Hiç satış yapmadım', other_platforms: 'Başka platformlarda satıyorum', physical_store: 'Fiziksel mağazam var' } as const;

function PulseDot({ color }: { color: string }) {
  const v = useSharedValue(1);
  useEffect(() => {
    v.set(withRepeat(withSequence(withTiming(0.35, { duration: 650 }), withTiming(1, { duration: 650 })), -1));
  }, [v]);
  const style = useAnimatedStyle(() => ({ opacity: v.get(), transform: [{ scale: 0.85 + v.get() * 0.15 }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export function ApplicationPending() {
  const { colors } = useTheme();
  const application = useSellerStore((s) => s.application);
  const iban = useSellerStore((s) => s.iban);
  const kyc = useSellerExtras((s) => s.kyc);
  const [loading, setLoading] = useState(false);

  // Uygulama kapatılıp açıldıysa inceleme yine birkaç dakika içinde sonuçlansın (demo)
  useEffect(() => {
    scheduleAutoApproval(60_000);
  }, []);

  const category = getCategory(application.categoryId);
  const sub = getSubcategory(application.categoryId, kyc?.subcategoryId);

  const steps: { title: string; body: string; state: 'done' | 'current' | 'next'; icon: IconName }[] = [
    { title: 'Başvuru gönderildi', body: application.submittedAt ? formatDateTime(application.submittedAt) : 'Az önce', state: 'done', icon: 'checkmark' },
    { title: 'Bilgilerin kontrol ediliyor', body: 'Kimlik, IBAN ve iade adresin doğrulanıyor', state: 'current', icon: 'search' },
    { title: 'Satıcı Paneli açılır', body: 'İlk yayınını planlayıp ürün eklemeye başlarsın', state: 'next', icon: 'storefront' },
  ];

  const speedUp = () => {
    setLoading(true);
    setTimeout(() => {
      approveSellerNow();
      setLoading(false);
      toast.success("Başvurun onaylandı! Satıcı Paneli'ne hoş geldin 🎉", 'storefront');
    }, 900);
  };

  return (
    <Screen>
      <Header large title="Satıcı Başvurusu" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
          <View style={[styles.hero, { backgroundColor: tint(colors.warning, 0.16) }]}>
            <Icon name="hourglass" size={34} color={colors.warning} />
          </View>
          <StatusPill label="İnceleniyor" tone="warning" icon="time" style={{ alignSelf: 'center' }} />
          <Text variant="title2" align="center">
            Başvurun inceleniyor
          </Text>
          <Text variant="callout" color="textSecondary" align="center" style={{ maxWidth: 300 }}>
            Genellikle birkaç dakika içinde sonuçlanır. Onaylandığında sana bildirim göndereceğiz.
          </Text>
        </Card>

        <Card>
          {steps.map((s, i) => {
            const color = s.state === 'done' ? colors.success : s.state === 'current' ? colors.warning : colors.textTertiary;
            return (
              <View key={s.title} style={styles.step}>
                <View style={styles.rail}>
                  <View style={[styles.node, { borderColor: color, backgroundColor: s.state === 'done' ? color : 'transparent' }]}>
                    {s.state === 'done' ? <Icon name="checkmark" size={14} color={colors.bg} /> : s.state === 'current' ? <PulseDot color={color} /> : null}
                  </View>
                  {i < steps.length - 1 ? <View style={[styles.line, { backgroundColor: s.state === 'done' ? colors.success : colors.border }]} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
                  <Text variant="headline" weight="700" color={s.state === 'next' ? 'textSecondary' : 'text'}>
                    {s.title}
                  </Text>
                  <Text variant="footnote" color="textSecondary">
                    {s.body}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        <Button title="Durumu kontrol et" icon="refresh" variant="inverse" size="lg" fullWidth loading={loading} onPress={speedUp} />

        <Card>
          <Text variant="headline" weight="700" style={{ marginBottom: 6 }}>
            Başvuru özetin
          </Text>
          <KeyValue label="Ana kategori" value={category ? `${category.emoji} ${sub?.name ?? category.shortName}` : '—'} />
          <KeyValue label="Satıcı tipi" value={kyc ? SELLER_TYPE_LABELS[kyc.sellerType] : application.taxType ? SELLER_TYPE_LABELS[application.taxType] : '—'} />
          <KeyValue label="Deneyim" value={kyc ? EXPERIENCE_LABELS[kyc.experience] : (application.experience ?? '—')} />
          <KeyValue label="IBAN" value={iban ? `${bankFromIban(iban) ?? 'Banka'} · ${maskIban(iban).slice(-4)}` : '—'} />
        </Card>

        <Card style={{ gap: 12 }}>
          <Text variant="headline" weight="700">
            Bu sırada hazırlanabilirsin
          </Text>
          {[
            ['camera', 'İlk 10 ürününü fotoğrafla — gün ışığında, sade bir zeminde.'],
            ['image', 'Yayın kapağı hazırla: 9:16 dikey, yüzün ve ürünlerin görünsün.'],
            ['megaphone', 'Yayın saatini sosyal medyada duyur; ilk yayında takipçi kazan.'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.tip}>
              <Icon name={icon as IconName} size={18} color="textSecondary" />
              <Text variant="callout" color="textSecondary" style={{ flex: 1 }}>
                {text}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, gap: 14, paddingBottom: 32 },
  hero: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 24 },
  node: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, flex: 1, marginTop: 2 },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
