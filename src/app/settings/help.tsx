import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, EmptyState, Header, Icon, PressableScale, Screen, Text, TextField, toast } from '@/components/ui';
import { FAQ_TOPICS, FAQS, type Faq, type FaqTopic } from '@/features/account/content';
import { MenuGroup, MenuRow } from '@/features/account/ui';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

const norm = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

function FaqItem({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={[styles.item, { borderBottomColor: colors.border }]}>
      <PressableScale scaleTo={0.99} onPress={onToggle} style={styles.itemHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text variant="headline" style={{ flex: 1 }}>
          {faq.q}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="textSecondary" />
      </PressableScale>
      {open ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text variant="body" color="textSecondary" style={styles.answer}>
            {faq.a}
          </Text>
          <View style={styles.helpful}>
            <Text variant="footnote" color="textTertiary">
              Bu yanıt işine yaradı mı?
            </Text>
            <Chip
              label="Evet"
              size="sm"
              icon="thumbs-up-outline"
              onPress={() => {
                haptic.success();
                toast.success('Geri bildirimin için teşekkürler');
              }}
            />
            <Chip
              label="Hayır"
              size="sm"
              onPress={() => {
                toast('Üzgünüz! Destek ekibimiz yardımcı olabilir.', 'chatbubbles-outline');
              }}
            />
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export default function HelpScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<FaqTopic | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const results = useMemo(() => {
    const query = norm(q.trim());
    return FAQS.filter((f) => (topic === 'all' || f.topic === topic) && (!query || norm(f.q).includes(query) || norm(f.a).includes(query)));
  }, [q, topic]);

  return (
    <Screen>
      <Header title="Yardım Merkezi" />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={styles.hero}>
          <Text variant="title2">Nasıl yardımcı olabiliriz?</Text>
          <TextField icon="search" placeholder="Soru ya da anahtar kelime ara" value={q} onChangeText={setQ} autoCorrect={false} returnKeyType="search" containerStyle={{ marginTop: 12 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Tümü" selected={topic === 'all'} onPress={() => setTopic('all')} />
          {FAQ_TOPICS.map((t) => (
            <Chip key={t.key} label={t.label} icon={t.icon} selected={topic === t.key} onPress={() => setTopic(t.key)} />
          ))}
        </ScrollView>

        {!q && topic === 'all' ? (
          <View style={styles.topicGrid}>
            {FAQ_TOPICS.slice(0, 6).map((t) => (
              <PressableScale key={t.key} scaleTo={0.96} onPress={() => setTopic(t.key)} style={[styles.topicTile, { backgroundColor: colors.surface }]} accessibilityRole="button">
                <Icon name={t.icon} size={22} />
                <Text variant="callout" weight="700" numberOfLines={2}>
                  {t.label}
                </Text>
              </PressableScale>
            ))}
          </View>
        ) : null}

        <Text variant="title3" style={styles.sectionTitle}>
          {q ? `“${q.trim()}” için sonuçlar` : topic === 'all' ? 'Sık sorulan sorular' : FAQ_TOPICS.find((t) => t.key === topic)?.label}
        </Text>
        {results.length ? (
          <View style={styles.list}>
            {results.map((f) => (
              <FaqItem
                key={f.id}
                faq={f}
                open={openId === f.id}
                onToggle={() => {
                  haptic.tap();
                  setOpenId(openId === f.id ? null : f.id);
                }}
              />
            ))}
          </View>
        ) : (
          <EmptyState icon="search" title="Sonuç bulunamadı" message="Farklı bir kelimeyle aramayı dene ya da doğrudan destek ekibimize yaz." actionLabel="Destekle sohbet et" onAction={() => router.push('/inbox/support')} />
        )}

        <MenuGroup title="Hâlâ yardıma mı ihtiyacın var?">
          <MenuRow icon="chatbubbles-outline" title="Destek ekibiyle sohbet et" subtitle="Her gün 09:00 – 23:00 · ortalama yanıt 5 dk" onPress={() => router.push('/inbox/support')} />
          <MenuRow
            icon="mail-outline"
            title="E-posta gönder"
            subtitle="destek@mezatonline.com"
            onPress={() => Linking.openURL('mailto:destek@mezatonline.com?subject=Mezatonline%20Destek').catch(() => toast.error('E-posta uygulaması açılamadı'))}
          />
          <MenuRow icon="bag-handle-outline" title="Bir siparişle ilgili yardım" subtitle="Sipariş detayından talep oluştur" onPress={() => router.navigate({ pathname: '/activity', params: { tab: 'purchases' } })} />
          <MenuRow icon="document-text-outline" title="Yasal & KVKK" onPress={() => router.push('/settings/legal')} />
        </MenuGroup>

        <View style={[styles.warn, { backgroundColor: colors.surface }]}>
          <Icon name="shield-checkmark-outline" size={18} color="textSecondary" />
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            Mezatonline ekibi senden asla şifre, kart bilgisi ya da SMS doğrulama kodu istemez. Resmi e-postalarımız yalnızca @mezatonline.com uzantılıdır.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4 },
  chips: { gap: 8, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12 },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: SCREEN_PADDING, marginTop: 4 },
  topicTile: { width: '31%', flexGrow: 1, borderRadius: radius.md, padding: 12, gap: 8 },
  sectionTitle: { paddingHorizontal: SCREEN_PADDING, marginTop: 20, marginBottom: 4 },
  list: { paddingHorizontal: SCREEN_PADDING },
  item: { borderBottomWidth: StyleSheet.hairlineWidth },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  answer: { paddingBottom: 10 },
  helpful: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 16 },
  warn: { flexDirection: 'row', gap: 10, marginHorizontal: SCREEN_PADDING, marginTop: 24, padding: 14, borderRadius: radius.md },
});
