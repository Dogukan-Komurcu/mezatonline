/**
 * "Bu siparişle ilgili yardım al" akışı (Whatnot S64):
 * iptale uygunsa önce orta pencere, sonra iptal nedenleri ya da sorun seçimi → açıklama + fotoğraf → gönder.
 */
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Divider, Icon, IconButton, ListRow, PressableScale, Sheet, Text, TextField, toast, type IconName } from '@/components/ui';
import { getUser } from '@/data';
import { formatDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useInboxStore } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import { radius, useTheme } from '@/theme';
import type { Order } from '@/types';

import { CenterModal, InfoBanner } from '../components';
import { useActivityExtras, type HelpIssue } from '../store';
import { cancelHoursLeft, canRequestCancel, protectionInfo, withdrawalDaysLeft } from '../utils';

type IssueDef = { title: string; subtitle: string; icon: IconName; needsDelivery: boolean; next: string };

export const HELP_ISSUES: Record<HelpIssue, IssueDef> = {
  not_received: {
    title: 'Paket gelmedi ya da gecikiyor',
    subtitle: 'Kargo ilerlemiyor ya da teslim edildi görünüyor ama ulaşmadı',
    icon: 'time-outline',
    needsDelivery: false,
    next: 'Satıcı kargo durumunu kontrol edip 48 saat içinde dönüş yapar. Paket kaybolduysa paranın tamamı iade edilir.',
  },
  damaged: {
    title: 'Ürün hasarlı geldi',
    subtitle: 'Kırık, ezik ya da kargoda zarar görmüş',
    icon: 'warning-outline',
    needsDelivery: true,
    next: 'Hasarı gösteren fotoğraflar eklersen talebin daha hızlı sonuçlanır. Paketi ve kutuyu atma.',
  },
  missing: {
    title: 'Koliden eksik çıktı',
    subtitle: 'Paketten sipariş ettiklerinin bir kısmı çıkmadı',
    icon: 'cube-outline',
    needsDelivery: true,
    next: 'Paketin içinden çıkanların fotoğrafını ekle. Satıcı eksik ürünü gönderir ya da tutarı iade eder.',
  },
  wrong_item: {
    title: 'Yanlış ürün geldi',
    subtitle: 'Farklı ürün, beden ya da renk gönderildi',
    icon: 'swap-horizontal-outline',
    needsDelivery: true,
    next: 'Gelen ürünün fotoğrafını ekle. Yanlış gönderilen ürünün iade kargo ücreti satıcıya aittir.',
  },
  not_as_described: {
    title: 'İlandakinden farklı',
    subtitle: 'Durumu, ölçüsü ya da fotoğraflardaki hâli farklı',
    icon: 'document-text-outline',
    needsDelivery: true,
    next: 'Farkı gösteren fotoğraflar ekle. Satıcı tam iade, kısmi iade ya da değişim önerebilir.',
  },
  counterfeit: {
    title: 'Taklit olabilir',
    subtitle: 'Ürünün orijinalliğinden şüphe ediyorum',
    icon: 'shield-half-outline',
    needsDelivery: true,
    next: 'Etiket, seri numarası ve dikiş detaylarının net fotoğraflarını ekle. Sahte ürün taleplerini Mezat Destek ekibi de inceler.',
  },
  withdrawal: {
    title: 'Cayma hakkını kullan (14 gün)',
    subtitle: 'Kurumsal satıcıdan alımlarda sebep belirtmeden iade et',
    icon: 'return-down-back-outline',
    needsDelivery: true,
    next: 'Satıcı kurumsal (tacir veya esnaf) ise, canlı yayında açık artırmayla aldıkların dahil, ürünü teslim aldıktan sonra 14 gün içinde sebep belirtmeden cayma hakkını kullanabilirsin (Mesafeli Sözleşmeler Yönetmeliği). İade kargo kodu ücretsizdir; cayma bildiriminden sonra ürünü 10 gün içinde kargoya vermelisin. Bireysel satıcılardan alımlar Tüketici Kanunu kapsamında değildir; sorun yaşıyorsan diğer seçeneklerden Alıcı Koruması talebi oluşturabilirsin.',
  },
};

const ISSUE_ORDER: HelpIssue[] = ['not_received', 'damaged', 'missing', 'wrong_item', 'not_as_described', 'counterfeit', 'withdrawal'];

const CANCEL_REASONS = ['Teklif tutarını yanlış girdim', 'Ürünü artık istemiyorum', 'Uygulamada bir aksaklık yaşadım', 'Yanlış adres seçtim', 'Başka bir neden'];

type Mode = 'closed' | 'eligible' | 'help' | 'cancel' | 'request';

/** Bir RN Modal kapanırken diğerini açmak iOS'ta sunumu bozar: önce kapat, sonra aç */
const MODAL_SWAP_DELAY = 420;

/**
 * Sipariş detayında kullanılır:
 * const help = useHelpFlow(order, categoryId); … onPress={help.open} … {help.element}
 */
export function useHelpFlow(order: Order | undefined, categoryId: string | undefined) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('closed');
  const [step, setStep] = useState<'issues' | 'details'>('issues');
  const [issue, setIssue] = useState<HelpIssue | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const request = useActivityExtras((s) => (order ? s.helpRequests[order.id] : undefined));
  const cancelRequested = useActivityExtras((s) => (order ? !!s.cancelRequests[order.id] : false));

  const reset = () => {
    setStep('issues');
    setIssue(null);
    setDescription('');
    setPhotos([]);
    setReason(null);
    setSubmitting(false);
  };
  const close = () => {
    setMode('closed');
    setTimeout(reset, 250);
  };
  const swapTo = (next: Mode) => {
    setMode('closed');
    setTimeout(() => setMode(next), MODAL_SWAP_DELAY);
  };

  const cancellable = !!order && canRequestCancel(order) && !cancelRequested && !request;

  const open = () => {
    if (!order) return;
    haptic.tap();
    reset();
    if (request) setMode('request');
    else if (cancellable) setMode('eligible');
    else setMode('help');
  };
  const openCancel = () => {
    if (!order) return;
    haptic.tap();
    setMode('cancel');
  };

  const pickPhoto = async () => {
    if (photos.length >= 4) {
      toast.warning('En fazla 4 fotoğraf ekleyebilirsin');
      return;
    }
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 4 - photos.length, quality: 0.7 });
      if (res.canceled) return;
      setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, 4));
      haptic.light();
    } catch {
      // Simülatör / izin yoksa ürün görselini örnek olarak ekle
      if (order) setPhotos((p) => [...p, order.productImage].slice(0, 4));
      toast('Örnek fotoğraf eklendi', 'image');
    }
  };

  const submitHelp = () => {
    if (!order || !issue) return;
    setSubmitting(true);
    setTimeout(() => {
      const def = HELP_ISSUES[issue];
      const text = description.trim();
      useOrdersStore.getState().requestReturn(order.id, text ? `${def.title}: ${text}` : def.title);
      const inbox = useInboxStore.getState();
      const conv = inbox.ensureConversation(order.sellerId, order.id);
      inbox.sendMessage(conv.id, `🛟 Destek talebi · Sipariş ${order.number}\nKonu: ${def.title}${text ? `\n${text}` : ''}`, photos[0]);
      useActivityExtras.getState().addHelpRequest({
        orderId: order.id,
        issue,
        description: text,
        photos,
        conversationId: conv.id,
        createdAt: new Date().toISOString(),
      });
      haptic.success();
      toast.success(issue === 'withdrawal' ? 'Cayma talebin alındı. İade kargo kodun hazırlanıyor.' : 'Talebin satıcıya iletildi. 48 saat içinde yanıt verilecek.', 'chatbubbles');
      close();
    }, 1000);
  };

  const submitCancel = () => {
    if (!order || !reason) return;
    setSubmitting(true);
    setTimeout(() => {
      const ok = canRequestCancel(order);
      useActivityExtras.getState().addCancelRequest({ orderId: order.id, reason, createdAt: new Date().toISOString() });
      if (ok) {
        useOrdersStore.getState().cancelOrder(order.id);
        useInboxStore.getState().pushNotification({
          type: 'order_delivered',
          title: 'Siparişin iptal edildi',
          body: `${order.productTitle} · İade başlatıldı; tutarın kartına yansıması bankana göre 2–10 iş günü sürebilir.`,
          image: order.productImage,
          href: `/orders/${order.id}`,
        });
        haptic.success();
        toast.success('Satıcı iptal talebini onayladı. İaden başlatıldı.', 'checkmark-circle');
      } else {
        haptic.warning();
        toast.warning('Sipariş kargoya verildiği için iptal edilemedi');
      }
      close();
    }, 1100);
  };

  const prot = order ? protectionInfo(order, categoryId) : undefined;
  const orderClosed = order?.status === 'cancelled' || order?.status === 'refunded';
  const delivered = order?.status === 'delivered';
  const withdrawalLeft = order ? withdrawalDaysLeft(order) : 0;
  const sellerName = getUser(order?.sellerId)?.username;

  const element = order ? (
    <>
      {/* İptale uygun: orta pencere */}
      <CenterModal
        visible={mode === 'eligible'}
        onClose={close}
        icon="time-outline"
        iconTone="warning"
        title="Kargo öncesi iptal açık"
        message={`Paket henüz yola çıkmadığı için ${cancelHoursLeft(order)} saat boyunca satıcıdan iptal isteyebilirsin; kararı satıcı verir. Siparişte başka bir sorun varsa yardım adımına geç.`}
        actions={[
          { label: 'İptal talep et', variant: 'danger', onPress: () => swapTo('cancel') },
          { label: 'Başka bir sorun bildir', variant: 'secondary', onPress: () => swapTo('help') },
          { label: 'Vazgeç', variant: 'outline', onPress: close },
        ]}
      />

      {/* Sorun seçimi → açıklama + fotoğraf (tek sheet, iki adım) */}
      <Sheet
        visible={mode === 'help'}
        onClose={submitting ? () => {} : close}
        title={step === 'details' && issue ? HELP_ISSUES[issue].title : 'Nasıl yardımcı olabiliriz?'}
        subtitle={step === 'details' ? `Sipariş ${order.number} · ${order.productTitle}` : `Sipariş ${order.number}`}
        headerRight={step === 'details' ? <IconButton name="chevron-back" size={34} variant="surface" disabled={submitting} onPress={() => setStep('issues')} accessibilityLabel="Geri" /> : undefined}
        showClose={step === 'issues'}
        maxHeight={0.94}
        footer={
          step === 'details' ? (
            <Button
              title={issue === 'withdrawal' ? 'Cayma talebini gönder' : 'Talebi gönder'}
              size="lg"
              fullWidth
              loading={submitting}
              disabled={issue !== 'withdrawal' && description.trim().length < 10}
              onPress={submitHelp}
            />
          ) : undefined
        }>
        {step === 'issues' ? (
          <>
            {orderClosed ? (
              <InfoBanner
                icon="information-circle-outline"
                text={order.status === 'refunded' ? 'Bu siparişin iadesi tamamlandı.' : 'Bu sipariş iptal edildi ve ödemen iade edildi. İadeyle ilgili sorun için Mezat Destek’e yazabilirsin.'}
                style={styles.mb}
              />
            ) : prot && !prot.active ? (
              <InfoBanner icon="alert-circle-outline" tone="warning" text="Bu siparişin Alıcı Koruması süresi doldu. Yine de satıcıya mesaj gönderebilirsin." style={styles.mb} />
            ) : null}
            {(orderClosed ? [] : ISSUE_ORDER).map((key) => {
              const def = HELP_ISSUES[key];
              if (key === 'withdrawal' && delivered && withdrawalLeft <= 0) return null;
              const disabled = def.needsDelivery && !delivered;
              const subtitle = disabled
                ? 'Ürün teslim edildikten sonra seçilebilir'
                : key === 'withdrawal'
                  ? `${def.subtitle} · ${withdrawalLeft} gün kaldı`
                  : def.subtitle;
              return (
                <View key={key} style={disabled ? styles.disabled : undefined}>
                  <ListRow
                    title={def.title}
                    subtitle={subtitle}
                    left={
                      <View style={[styles.issueIcon, { backgroundColor: colors.surface }]}>
                        <Icon name={def.icon} size={20} />
                      </View>
                    }
                    onPress={
                      disabled
                        ? () => toast('Bu seçenek ürün teslim edildikten sonra açılır', 'information-circle')
                        : () => {
                            setIssue(key);
                            setStep('details');
                          }
                    }
                    style={styles.rowFlush}
                  />
                </View>
              );
            })}
            {orderClosed ? null : <Divider style={styles.divider} />}
            <ListRow
              title="Satıcıya mesaj gönder"
              subtitle={sellerName ? `@${sellerName} ile bu sipariş hakkında yazış` : undefined}
              left={
                <View style={[styles.issueIcon, { backgroundColor: colors.surface }]}>
                  <Icon name="chatbubble-ellipses-outline" size={20} />
                </View>
              }
              onPress={() => {
                const conv = useInboxStore.getState().ensureConversation(order.sellerId, order.id);
                close();
                setTimeout(() => router.push(`/inbox/${conv.id}`), 250);
              }}
              style={styles.rowFlush}
            />
            <ListRow
              title="Başka bir konuda yardım"
              subtitle="Yardım Merkezi ve Mezat Destek"
              left={
                <View style={[styles.issueIcon, { backgroundColor: colors.surface }]}>
                  <Icon name="help-buoy-outline" size={20} />
                </View>
              }
              onPress={() => {
                close();
                setTimeout(() => router.push('/settings/help'), 250);
              }}
              style={styles.rowFlush}
            />
          </>
        ) : (
          <>
            {issue ? <InfoBanner icon="information-circle-outline" text={HELP_ISSUES[issue].next} style={styles.mb} /> : null}
            <TextField
              label={issue === 'withdrawal' ? 'Not (isteğe bağlı)' : 'Ne oldu?'}
              placeholder={issue === 'withdrawal' ? 'Satıcıya iletmek istediğin bir not varsa yaz' : 'Sorunu kısaca anlat (en az 10 karakter)'}
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, 1000))}
              multiline
              maxLength={1000}
              helper={`${1000 - description.length} karakter kaldı`}
            />
            <Text variant="subhead" weight="600" color="textSecondary" style={styles.photoLabel}>
              Fotoğraflar {issue && issue !== 'not_received' && issue !== 'withdrawal' ? '(önerilir)' : '(isteğe bağlı)'} · {photos.length}/4
            </Text>
            <View style={styles.photos}>
              {photos.map((uri, i) => (
                <View key={`${uri}_${i}`} style={[styles.photo, { backgroundColor: colors.skeleton }]}>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                  <PressableScale
                    style={[styles.photoRemove, { backgroundColor: colors.inverse }]}
                    onPress={() => setPhotos((p) => p.filter((_, k) => k !== i))}
                    accessibilityLabel="Fotoğrafı kaldır">
                    <Icon name="close" size={12} color={colors.onInverse} />
                  </PressableScale>
                </View>
              ))}
              {photos.length < 4 ? (
                <PressableScale onPress={pickPhoto} style={[styles.photo, styles.addPhoto, { borderColor: colors.border, backgroundColor: colors.surface }]} accessibilityLabel="Fotoğraf ekle">
                  <Icon name="camera-outline" size={22} color="textSecondary" />
                  <Text variant="caption" color="textSecondary">
                    Ekle
                  </Text>
                </PressableScale>
              ) : null}
            </View>
            <Text variant="caption" color="textTertiary" style={styles.legal}>
              Talebin önce satıcıya iletilir; satıcı 48 saat içinde yanıt vermezse Mezat Destek devreye girer. Yanıtlar Gelen Kutusu’nda görünür.
            </Text>
          </>
        )}
      </Sheet>

      {/* İptal nedenleri */}
      <Sheet
        visible={mode === 'cancel'}
        onClose={submitting ? () => {} : close}
        title="İptal talep et"
        subtitle={`Sipariş ${order.number} · ${cancelHoursLeft(order)} saat içinde talep edebilirsin`}
        showClose
        footer={<Button title="İptal talebini gönder" variant="danger" size="lg" fullWidth loading={submitting} disabled={!reason} onPress={submitCancel} />}>
        <InfoBanner
          icon="alert-circle-outline"
          tone="warning"
          text="Kargo öncesi iptal satıcının onayına bağlıdır. Satıcı kurumsal (tacir veya esnaf) ise, ürünü teslim aldıktan sonra 14 gün içinde yasal cayma hakkını ayrıca kullanabilirsin. İptal talebi açılan siparişlere sonradan puan verilemez."
          style={styles.mb}
        />
        <Text variant="subhead" weight="700" style={styles.reasonTitle}>
          İptal nedeni
        </Text>
        {CANCEL_REASONS.map((r) => (
          <ListRow
            key={r}
            title={r}
            onPress={() => setReason(r)}
            chevron={false}
            right={<Icon name={reason === r ? 'radio-button-on' : 'radio-button-off'} size={22} color={reason === r ? 'text' : 'textTertiary'} />}
            style={styles.rowFlush}
          />
        ))}
        <Text variant="caption" color="textTertiary" style={styles.legal}>
          Onaylanırsa ödemenin tamamı kartına iade edilir; hesabına yansıması bankaya göre 2–10 iş günü sürebilir.
        </Text>
      </Sheet>

      {/* Açık talep özeti */}
      {request ? (
        <Sheet
          visible={mode === 'request'}
          onClose={close}
          title="Destek talebin"
          subtitle={`${HELP_ISSUES[request.issue].title} · ${formatDateTime(request.createdAt)}`}
          showClose
          footer={
            <View style={styles.footerCol}>
              <Button
                title="Mesajlara git"
                icon="chatbubbles-outline"
                size="lg"
                fullWidth
                onPress={() => {
                  const convId = request.conversationId ?? useInboxStore.getState().ensureConversation(order.sellerId, order.id).id;
                  close();
                  setTimeout(() => router.push(`/inbox/${convId}`), 250);
                }}
              />
              <Button
                title="Mezat Destek’e ilet"
                variant="secondary"
                size="lg"
                fullWidth
                onPress={() => {
                  haptic.success();
                  toast.success('Talebin Mezat Destek ekibine iletildi. Destek ekibimiz en kısa sürede yanıt verir.', 'help-buoy');
                  close();
                }}
              />
            </View>
          }>
          <View style={[styles.requestCard, { backgroundColor: colors.surface }]}>
            <View style={styles.requestHead}>
              <Icon name="hourglass-outline" size={18} color="warning" />
              <Text variant="subhead" weight="700">
                Satıcı yanıtı bekleniyor
              </Text>
            </View>
            <Text variant="footnote" color="textSecondary">
              Satıcı 48 saat içinde yanıt vermezse talebini Mezat Destek’e iletebilirsin.
            </Text>
            {request.description ? (
              <Text variant="callout" style={styles.requestText}>
                “{request.description}”
              </Text>
            ) : null}
            {request.photos.length ? (
              <View style={styles.photos}>
                {request.photos.map((uri, i) => (
                  <View key={`${uri}_${i}`} style={[styles.photo, { backgroundColor: colors.skeleton }]}>
                    <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </Sheet>
      ) : null}
    </>
  ) : null;

  return { open, openCancel, cancellable, request, element };
}

const styles = StyleSheet.create({
  mb: { marginBottom: 8 },
  rowFlush: { paddingHorizontal: 0 },
  disabled: { opacity: 0.45 },
  issueIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  divider: { marginVertical: 6 },
  photoLabel: { marginTop: 16, marginBottom: 8, marginLeft: 2 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden' },
  addPhoto: { alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderStyle: 'dashed' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  legal: { marginTop: 14 },
  reasonTitle: { marginTop: 6, marginBottom: 2 },
  footerCol: { gap: 8 },
  requestCard: { borderRadius: radius.md, padding: 14, gap: 8 },
  requestHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestText: { fontStyle: 'italic' },
});
