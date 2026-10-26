/**
 * S82 — Yayın Planla / Düzenle (modal, ?id= düzenleme).
 * Başlık, 9:16 kapak, kategori, gün + saat çipleri, açıklama, etiketler, yayın formatı,
 * ücretsiz kargo eşiği, ürünler, moderatörler, görünürlük → Planla + paylaş.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Avatar, Button, Chip, EmptyState, Header, Icon, PressableScale, Screen, Segmented, SelectField, Sheet, Text, TextField, toast } from '@/components/ui';
import { CATEGORIES, getCategory, getUserByUsername } from '@/data';
import { categoryPhotos } from '@/data/categories';
import { formatDayLong, formatShowTime, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { useSellerStore } from '@/store/seller';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Show } from '@/types';

import { useQaOffset } from './qaSeed';
import { setShowProducts, useNow } from './actions';
import { dayKeyOf, dayOptions, listingTab, priceLabel, timeSlots } from './logic';
import { pickFromLibrary, SamplePhotoSheet } from './media';
import { confirmCancelShow, shareShow } from './showActions';
import { useSellerExtras, type ShowFormat, type ShowVisibility } from './store';
import { FormSection, OptionCard, StickyFooter, Thumb, MODAL_SAFE_TOP } from './ui';

const TITLE_MAX = 60;
const EMOJIS = ['🔥', '🎁', '💎', '⚡', '🃏', '👟', '🪙', '🎉'];
const FREE_SHIP = [null, 500, 750, 1000] as const;
const MAX_TAGS = 5;
const MAX_MODS = 5;

type State = {
  title: string;
  cover?: string;
  categoryId?: string;
  subcategoryId?: string;
  dayKey: string;
  time?: string;
  description: string;
  tags: string[];
  format: ShowFormat;
  freeShip: number | null;
  productIds: string[];
  moderators: string[];
  visibility: ShowVisibility;
};

function pad(n: number) {
  return n < 10 ? '0' + n : String(n);
}

export function ScheduleForm() {
  const { colors } = useTheme();
  const qaOffset = useQaOffset();
  const dayScrollRef = useRef<ScrollViewInstance>(null);
  const timeScrollRef = useRef<ScrollViewInstance>(null);
  // Seçili gün / saat çipi ilk açılışta görünür olsun (ör. varsayılan 20:00 satırın sonunda kalıyor)
  const revealIn = (ref: typeof timeScrollRef) => (e: LayoutChangeEvent) => ref.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - SCREEN_PADDING - 72), animated: false });
  const me = useMe();
  const now = useNow(60_000);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const shows = useSellerStore((s) => s.shows);
  const listings = useSellerStore((s) => s.listings);
  const scheduleShow = useSellerStore((s) => s.scheduleShow);
  const updateShow = useSellerStore((s) => s.updateShow);
  const showMeta = useSellerExtras((s) => s.showMeta);
  const setShowMeta = useSellerExtras((s) => s.setShowMeta);
  const listingStatus = useSellerExtras((s) => s.listingStatus);
  const existing = id ? shows.find((s) => s.id === id) : undefined;

  const [initial] = useState<State>(() => {
    if (existing) {
      const d = new Date(existing.scheduledAt);
      const meta = showMeta[existing.id];
      return {
        title: existing.title,
        cover: existing.coverImage,
        categoryId: existing.categoryId,
        subcategoryId: existing.subcategoryId,
        dayKey: dayKeyOf(d.getTime()),
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        description: existing.description,
        tags: existing.tags,
        format: meta?.format ?? 'auction',
        freeShip: existing.freeShippingThreshold ?? null,
        productIds: existing.productIds,
        moderators: meta?.moderators ?? [],
        visibility: meta?.visibility ?? 'public',
      };
    }
    const tomorrow = new Date(Date.now() + 86_400_000);
    return {
      title: '',
      categoryId: me.categoryIds[0],
      dayKey: dayKeyOf(tomorrow.getTime()),
      time: '20:00',
      description: '',
      tags: [],
      format: 'auction',
      freeShip: null,
      productIds: [],
      moderators: [],
      visibility: 'public',
    };
  });
  const [s, setS] = useState<State>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Show | null>(null);
  const [samples, setSamples] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [modInput, setModInput] = useState('');

  if (id && !existing && !saved) {
    return (
      <Screen>
        <Header safeTop={MODAL_SAFE_TOP} back="close" title="Yayını Düzenle" />
        <EmptyState icon="calendar-outline" title="Yayın bulunamadı" message="Bu yayın iptal edilmiş olabilir." actionLabel="Kapat" onAction={() => router.back()} />
      </Screen>
    );
  }

  const set = (patch: Partial<State>) => setS((cur) => ({ ...cur, ...patch }));
  const category = getCategory(s.categoryId);
  const ahead = existing ? Math.ceil((new Date(existing.scheduledAt).getTime() - now) / 86_400_000) + 2 : 0;
  const days = dayOptions(now, Math.min(60, Math.max(14, ahead)));
  const day = days.find((d) => d.key === s.dayKey) ?? days[1];
  const slots = timeSlots(day.date, now);
  const slotList = s.time && !slots.some((t) => t.key === s.time) ? [{ key: s.time, label: s.time, minutes: -1 }, ...slots] : slots;
  const scheduledAt = s.time ? day.date + (parseInt(s.time.slice(0, 2), 10) * 60 + parseInt(s.time.slice(3), 10)) * 60_000 : NaN;
  const selectableListings = listings.filter((p) => s.productIds.includes(p.id) || (listingTab(p, listingStatus) === 'active' && (!p.showId || p.showId === id)));
  const selectedProducts = listings.filter((p) => s.productIds.includes(p.id));
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  const errors = {
    title: s.title.trim().length < 3 ? 'Yayın başlığı en az 3 karakter olmalı' : undefined,
    category: !s.categoryId ? 'Kategori seç' : undefined,
    time: !s.time ? 'Saat seç' : !(scheduledAt > now) ? 'Geçmiş bir saat seçemezsin' : undefined,
  };
  const err = (k: keyof typeof errors) => (submitted ? errors[k] : undefined);

  const close = () => {
    if (!dirty || saved) {
      router.back();
      return;
    }
    Alert.alert('Değişiklikler kaydedilmedi', 'Çıkarsan yayın bilgileri kaybolacak.', [
      { text: 'Devam et', style: 'cancel' },
      { text: 'Çık', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const toggleTag = (tag: string) => {
    if (s.tags.includes(tag)) set({ tags: s.tags.filter((t) => t !== tag) });
    else if (s.tags.length >= MAX_TAGS) toast.warning(`En fazla ${MAX_TAGS} etiket ekleyebilirsin`);
    else set({ tags: [...s.tags, tag] });
  };
  const addCustomTag = () => {
    const t = customTag.trim().replace(/^#/, '').slice(0, 24);
    if (t.length < 2) return;
    if (!s.tags.includes(t)) toggleTag(t);
    setCustomTag('');
  };
  const addModerator = () => {
    const name = modInput.trim().replace(/^@/, '').toLocaleLowerCase('tr-TR');
    if (name.length < 3) {
      toast.warning('Kullanıcı adı en az 3 karakter olmalı');
      return;
    }
    if (name === me.username.toLocaleLowerCase('tr-TR')) {
      toast.warning('Kendini moderatör olarak ekleyemezsin');
      return;
    }
    if (s.moderators.includes(name)) {
      setModInput('');
      return;
    }
    if (s.moderators.length >= MAX_MODS) {
      toast.warning(`En fazla ${MAX_MODS} moderatör ekleyebilirsin`);
      return;
    }
    set({ moderators: [...s.moderators, name] });
    setModInput('');
    haptic.light();
  };

  const save = () => {
    setSubmitted(true);
    if (errors.title || errors.category || errors.time) {
      haptic.warning();
      toast.warning(errors.time ?? 'Eksik alanları tamamla');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const iso = new Date(scheduledAt).toISOString();
      const cover = s.cover ?? categoryPhotos(s.categoryId!)[0];
      const highlights = [
        ...(s.freeShip ? [`${formatTRY(s.freeShip)} üzeri ücretsiz kargo`] : []),
        ...(s.format === 'breaks' ? ['Kutu açılışı'] : s.format === 'buy_now' ? ['Hemen Al'] : []),
        ...(s.visibility === 'private' ? ['Özel yayın'] : []),
      ];
      let show: Show;
      if (existing) {
        updateShow(existing.id, {
          title: s.title.trim(),
          description: s.description.trim(),
          coverImage: cover,
          categoryId: s.categoryId!,
          subcategoryId: s.subcategoryId,
          scheduledAt: iso,
          tags: s.tags,
          freeShippingThreshold: s.freeShip ?? undefined,
          highlights,
        });
        show = { ...existing, title: s.title.trim(), coverImage: cover, scheduledAt: iso };
      } else {
        show = scheduleShow({
          title: s.title.trim(),
          description: s.description.trim(),
          coverImage: cover,
          categoryId: s.categoryId!,
          subcategoryId: s.subcategoryId,
          scheduledAt: iso,
          tags: s.tags,
          productIds: s.productIds,
          freeShippingThreshold: s.freeShip ?? undefined,
        });
        updateShow(show.id, { highlights });
      }
      setShowProducts(show.id, s.productIds);
      setShowMeta(show.id, { format: s.format, moderators: s.moderators, visibility: s.visibility });
      haptic.success();
      setSaving(false);
      if (existing) {
        toast.success('Yayın güncellendi');
        router.back();
      } else {
        toast.success('Yayının planlandı 🎉', 'calendar');
        setSaved({ ...show, productIds: s.productIds });
      }
    }, 600);
  };

  if (saved) {
    return (
      <Screen>
        <Header safeTop={MODAL_SAFE_TOP} back="close" title="Yayın planlandı" />
        <ScrollView contentContainerStyle={styles.success}>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.successIcon, { backgroundColor: colors.primary }]}>
            <Text style={{ fontSize: 46, lineHeight: 54 }}>📅</Text>
          </Animated.View>
          <Text variant="title1" align="center">
            Yayının planlandı! 🎉
          </Text>
          <Text variant="callout" color="textSecondary" align="center">
            {formatDayLong(saved.scheduledAt)} · {formatShowTime(saved.scheduledAt, now).split(' ').pop()}. Takipçilerine bildirim gönderdik; yayından önce bir hatırlatma daha gidecek.
          </Text>
          <View style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Thumb uri={saved.coverImage} size={72} height={128} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="headline" weight="700" numberOfLines={3}>
                {saved.title}
              </Text>
              <Text variant="footnote" color="textSecondary">
                {formatShowTime(saved.scheduledAt, now)} · {saved.productIds.length} ürün
              </Text>
            </View>
          </View>
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <Button title="Takipçilerinle paylaş" icon="share-outline" size="lg" fullWidth onPress={() => shareShow(saved)} />
            <Button title="Yayına ürün ekle" icon="add-circle-outline" size="lg" variant="secondary" fullWidth onPress={() => router.replace({ pathname: '/seller/listing', params: { showId: saved.id } })} />
            <Button title="Bitti" size="lg" variant="ghost" fullWidth onPress={() => router.back()} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header safeTop={MODAL_SAFE_TOP} back="close" onBack={close} title={existing ? 'Yayını Düzenle' : 'Yayın Planla'} border />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentOffset={qaOffset} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.coverRow}>
            <PressableScale scaleTo={0.97} onPress={() => setSamples(true)} style={[styles.cover, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {s.cover ? (
                <Thumb uri={s.cover} size={108} height={192} rounded={radius.md} />
              ) : (
                <View style={styles.coverEmpty}>
                  <Avatar uri={me.avatar} name={me.username} size={44} />
                  <Icon name="image-outline" size={22} color="textSecondary" />
                  <Text variant="caption" color="textSecondary" align="center">
                    Kapak ekle
                  </Text>
                </View>
              )}
            </PressableScale>
            <View style={{ flex: 1, gap: 8 }}>
              <Text variant="headline" weight="700">
                Kapak görseli
              </Text>
              <Text variant="footnote" color="textSecondary">
                9:16 dikey, 1080×1920 önerilir. Yüzün ve öne çıkan ürünlerin görünsün. Eklemezsen kategori görseli kullanılır.
              </Text>
              <Button title="Galeriden seç" size="sm" variant="secondary" icon="images-outline" onPress={() => pickFromLibrary({ limit: 1, aspect: [9, 16] }).then((u) => u[0] && set({ cover: u[0] }))} />
              <Button title="Örnek görsel" size="sm" variant="ghost" icon="sparkles-outline" onPress={() => setSamples(true)} />
              {s.cover ? (
                <Text variant="footnote" weight="700" color="danger" onPress={() => set({ cover: undefined })} suppressHighlighting>
                  Kapağı kaldır
                </Text>
              ) : null}
            </View>
          </View>

          <FormSection title="Yayın başlığı">
            <TextField
              value={s.title}
              onChangeText={(v) => set({ title: v.slice(0, TITLE_MAX) })}
              placeholder="ör. 🔥 ₺1'den Başlayan Pokémon Kartları"
              maxLength={TITLE_MAX}
              helper={`${s.title.length}/${TITLE_MAX} · Ne sattığını söyle; çekiliş varsa başa yaz`}
              error={err('title')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SCREEN_PADDING }} contentContainerStyle={styles.hscroll}>
              {EMOJIS.map((e) => (
                <Chip key={e} label={e} size="sm" onPress={() => s.title.length + e.length <= TITLE_MAX && set({ title: s.title ? `${s.title.trimEnd()} ${e}` : `${e} ` })} />
              ))}
            </ScrollView>
          </FormSection>

          <FormSection title="Kategori" subtitle="Yayının yalnızca seçtiğin kategoride görünür">
            <SelectField
              placeholder="Kategori seç"
              value={s.categoryId}
              options={CATEGORIES.map((c) => ({ value: c.id, label: `${c.emoji}  ${c.name}` }))}
              searchable
              onChange={(v) => set({ categoryId: v, subcategoryId: undefined, tags: [] })}
              error={err('category')}
            />
            {category ? (
              <SelectField
                placeholder="Alt kategori (isteğe bağlı)"
                value={s.subcategoryId}
                options={category.subcategories.map((x) => ({ value: x.id, label: x.name }))}
                onChange={(v) => set({ subcategoryId: v })}
              />
            ) : null}
          </FormSection>

          <FormSection title="Tarih ve saat" subtitle={s.time && scheduledAt > now ? `${formatDayLong(scheduledAt)}, ${s.time}` : 'Yayınını birkaç gün önceden planla'}>
            <ScrollView ref={dayScrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SCREEN_PADDING }} contentContainerStyle={styles.hscroll}>
              {days.map((d) => {
                const on = d.key === day.key;
                return (
                  <PressableScale
                    key={d.key}
                    onLayout={on ? revealIn(dayScrollRef) : undefined}
                    scaleTo={0.94}
                    onPress={() => {
                      haptic.tap();
                      const nextSlots = timeSlots(d.date, now);
                      set({ dayKey: d.key, time: s.time && nextSlots.some((t) => t.key === s.time) ? s.time : nextSlots[0]?.key });
                    }}
                    style={[styles.day, { backgroundColor: on ? colors.inverse : colors.surface }]}>
                    <Text variant="subhead" weight="700" color={on ? colors.onInverse : colors.text}>
                      {d.top}
                    </Text>
                    <Text variant="footnote" color={on ? colors.onInverse : colors.textSecondary}>
                      {d.bottom}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
            {slotList.length ? (
              <ScrollView ref={timeScrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SCREEN_PADDING }} contentContainerStyle={styles.hscroll}>
                {slotList.map((t) => (
                  <View key={t.key} onLayout={s.time === t.key ? revealIn(timeScrollRef) : undefined}>
                    <Chip label={t.label} selected={s.time === t.key} onPress={() => set({ time: t.key })} />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text variant="footnote" color="textSecondary">
                Bugün için uygun saat kalmadı, başka bir gün seç.
              </Text>
            )}
            {err('time') ? (
              <Text variant="footnote" color="danger">
                {err('time')}
              </Text>
            ) : null}
          </FormSection>

          <FormSection title="Açıklama" subtitle="İsteğe bağlı">
            <TextField
              value={s.description}
              onChangeText={(v) => set({ description: v.slice(0, 500) })}
              placeholder="Yayında neler olacak? Çekiliş, ₺1 başlangıçlar, özel ürünler…"
              multiline
              helper={`${s.description.length}/500`}
            />
          </FormSection>

          <FormSection title="Etiketler" subtitle={`Keşfedilmeni kolaylaştırır · ${s.tags.length}/${MAX_TAGS}`}>
            {category ? (
              <View style={styles.wrap}>
                {category.subcategories.map((x) => (
                  <Chip key={x.id} label={x.name} size="sm" selected={s.tags.includes(x.id)} onPress={() => toggleTag(x.id)} />
                ))}
                {s.tags
                  .filter((t) => !category.subcategories.some((x) => x.id === t))
                  .map((t) => (
                    <Chip key={t} label={`#${t}`} size="sm" selected icon="close" onPress={() => toggleTag(t)} />
                  ))}
              </View>
            ) : null}
            <TextField
              placeholder="Özel etiket ekle (ör. ani bitiş)"
              value={customTag}
              onChangeText={setCustomTag}
              onSubmitEditing={addCustomTag}
              returnKeyType="done"
              prefix="#"
              right={customTag.trim().length >= 2 ? <Text variant="subhead" weight="700" color="accent" onPress={addCustomTag} suppressHighlighting>Ekle</Text> : undefined}
            />
          </FormSection>

          <FormSection title="Yayın formatı" subtitle="Yayında ağırlıklı olarak nasıl satış yapacaksın?">
            <OptionCard icon="hammer-outline" title="Açık artırma ağırlıklı" subtitle="Ürünler teklifle satılır, heyecan yüksek" selected={s.format === 'auction'} onPress={() => set({ format: 'auction' })} />
            <OptionCard icon="flash-outline" title="Hemen Al" subtitle="Sabit fiyat, flaş indirimlerle hızlı satış" selected={s.format === 'buy_now'} onPress={() => set({ format: 'buy_now' })} />
            <OptionCard icon="cube-outline" title="Kutu Açılışı (Break)" subtitle="Alıcılar slot ya da takım satın alır, kutuyu canlı açarsın" selected={s.format === 'breaks'} onPress={() => set({ format: 'breaks' })} />
          </FormSection>

          <FormSection title="Ücretsiz kargo" subtitle="Bu tutarın üzerindeki alışverişlerde kargo ücretini sen karşılarsın">
            <View style={styles.wrap}>
              {FREE_SHIP.map((v) => (
                <Chip key={String(v)} label={v === null ? 'Yok' : `${formatTRY(v)} üzeri`} selected={s.freeShip === v} onPress={() => set({ freeShip: v })} />
              ))}
            </View>
          </FormSection>

          <FormSection
            title="Ürünler"
            subtitle={s.productIds.length ? `${s.productIds.length} ürün yayının mağazasında` : 'Yayında satacağın ürünleri ekle'}
            right={<Text variant="subhead" weight="700" color="accent" onPress={() => setProductsOpen(true)} suppressHighlighting>{s.productIds.length ? 'Düzenle' : 'Ekle'}</Text>}>
            {selectedProducts.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SCREEN_PADDING }} contentContainerStyle={styles.hscroll}>
                {selectedProducts.map((p) => (
                  <View key={p.id} style={{ width: 84, gap: 4 }}>
                    <Thumb uri={p.images[0]} size={84} />
                    <Text variant="caption" numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text variant="caption" color="textSecondary" numberOfLines={1}>
                      {priceLabel(p)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <PressableScale scaleTo={0.98} onPress={() => setProductsOpen(true)} style={[styles.addBox, { borderColor: colors.border }]}>
                <Icon name="add-circle-outline" size={22} color="textSecondary" />
                <Text variant="callout" color="textSecondary">
                  Envanterden ürün seç
                </Text>
              </PressableScale>
            )}
          </FormSection>

          <FormSection title="Moderatörler" subtitle="Sohbeti yönetmene yardım ederler (en fazla 5)">
            <TextField
              placeholder="kullanici_adi"
              prefix="@"
              value={modInput}
              onChangeText={(v) => setModInput(v.replace(/\s/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={addModerator}
              returnKeyType="done"
              right={modInput.length >= 3 ? <Text variant="subhead" weight="700" color="accent" onPress={addModerator} suppressHighlighting>Ekle</Text> : undefined}
            />
            {s.moderators.length ? (
              <View style={styles.wrap}>
                {s.moderators.map((m) => {
                  const u = getUserByUsername(m);
                  return (
                    <PressableScale key={m} scaleTo={0.95} onPress={() => set({ moderators: s.moderators.filter((x) => x !== m) })} style={[styles.mod, { backgroundColor: colors.surface }]}>
                      <Avatar uri={u?.avatar} name={m} size={22} />
                      <Text variant="footnote" weight="700">
                        @{m}
                      </Text>
                      <Icon name="close" size={14} color="textSecondary" />
                    </PressableScale>
                  );
                })}
              </View>
            ) : null}
          </FormSection>

          <FormSection title="Görünürlük">
            <Segmented
              options={[
                { key: 'public', label: 'Herkese açık' },
                { key: 'private', label: 'Özel (bağlantıyla)' },
              ]}
              value={s.visibility}
              onChange={(visibility) => set({ visibility })}
            />
            <Text variant="footnote" color="textSecondary">
              {s.visibility === 'public'
                ? 'Yayının ana sayfada ve kategoride görünür, takipçilerine bildirim gider.'
                : 'Yayının akışlarda görünmez; yalnızca bağlantıya sahip olanlar katılabilir. Satışlar gerçektir.'}
            </Text>
          </FormSection>

          {existing ? <Button title="Yayını iptal et" variant="ghost" icon="trash-outline" onPress={() => confirmCancelShow(existing, () => router.back())} style={{ alignSelf: 'center' }} /> : null}
        </ScrollView>
        <StickyFooter>
          <Button title={existing ? 'Kaydet' : 'Planla'} size="lg" fullWidth loading={saving} onPress={save} />
        </StickyFooter>
      </KeyboardAvoidingView>

      <SamplePhotoSheet key={s.categoryId ?? 'all'} visible={samples} onClose={() => setSamples(false)} initialCategoryId={s.categoryId} max={1} aspect={16 / 9} onPick={(u) => u[0] && set({ cover: u[0] })} />
      <Sheet
        visible={productsOpen}
        onClose={() => setProductsOpen(false)}
        title="Yayına ürün ekle"
        subtitle={`${s.productIds.length} ürün seçildi`}
        height={0.8}
        showClose
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              title="Yeni ürün"
              variant="secondary"
              icon="add"
              size="lg"
              style={{ flex: 1 }}
              onPress={() => {
                setProductsOpen(false);
                setTimeout(() => router.push(existing ? { pathname: '/seller/listing', params: { showId: existing.id } } : '/seller/listing'), 350);
              }}
            />
            <Button title="Tamam" size="lg" style={{ flex: 1 }} onPress={() => setProductsOpen(false)} />
          </View>
        }>
        {selectableListings.length ? (
          selectableListings.map((p) => {
            const on = s.productIds.includes(p.id);
            return (
              <PressableScale
                key={p.id}
                scaleTo={0.99}
                onPress={() => {
                  haptic.tap();
                  set({ productIds: on ? s.productIds.filter((x) => x !== p.id) : [...s.productIds, p.id] });
                }}
                style={styles.productRow}>
                <View style={[styles.box, { borderColor: on ? colors.text : colors.textTertiary, backgroundColor: on ? colors.text : 'transparent' }]}>
                  {on ? <Icon name="checkmark" size={14} color={colors.bg} /> : null}
                </View>
                <Thumb uri={p.images[0]} size={48} />
                <View style={{ flex: 1 }}>
                  <Text variant="subhead" weight="600" numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text variant="footnote" color="textSecondary">
                    {priceLabel(p)} · Stok {Math.max(0, p.quantity - p.sold)}
                  </Text>
                </View>
              </PressableScale>
            );
          })
        ) : (
          <EmptyState emoji="📦" title="Eklenecek ürün yok" message="Aktif ve başka bir yayına atanmamış ürünlerin burada listelenir. Yeni bir ürün oluşturabilirsin." />
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, gap: 26, paddingBottom: 32 },
  coverRow: { flexDirection: 'row', gap: 14 },
  cover: { width: 108, height: 192, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  coverEmpty: { alignItems: 'center', gap: 6, padding: 8 },
  hscroll: { paddingHorizontal: SCREEN_PADDING, gap: 8 },
  day: { width: 64, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', gap: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center' },
  mod: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, borderRadius: radius.pill },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  success: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  successIcon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 8 },
});
