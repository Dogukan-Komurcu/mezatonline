/**
 * Satıcı tarafı hak sahibi şikâyeti dosyası: şikâyet bilgileri, süreç (48 saat kaldırma / 24 saat
 * yeniden yayın), belgeyle itiraz formu ve sonuç özeti (6563 md. 9/3, ETAHS Yönetmeliği md. 12–14).
 * Demo: şikâyet ve itiraz kayıtları yalnızca bu cihazda tutulur, kimseye gönderilmez.
 */
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, EmptyState, Icon, PressableScale, Sheet, Text, TextField, toast, type IconName } from '@/components/ui';
import { DEMO_MODE } from '@/config/demo';
import { pickFromLibrary, takePhoto } from '@/features/seller/media';
import { CheckRow, KeyValue, StatusPill, Thumb, tint, type Tone } from '@/features/seller/ui';
import { formatDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSellerStore } from '@/store/seller';
import { radius, useTheme } from '@/theme';
import type { ID, ProofKind } from '@/types';

import { submitObjection } from './actions';
import { IP_PROCESS, isSampleDoc, PROOF_KIND_LABEL, PROOF_KINDS } from './counterfeit';
import { RIGHT_TYPE_LABELS, useTrustStore, type IpCaseStatus } from './store';

const MAX_DOCS = 6;
const MIN_NOTE = 20;

export const OBJECTION_DECLARATION = 'Sunduğum belgelerin gerçek olduğunu ve ürünün orijinal olduğunu beyan ederim.';

export const IP_CASE_STATUS: Record<IpCaseStatus, { label: string; tone: Tone; icon: IconName }> = {
  removed: { label: 'Kaldırıldı', tone: 'danger', icon: 'remove-circle-outline' },
  objected: { label: 'İtiraz inceleniyor', tone: 'warning', icon: 'hourglass-outline' },
  reinstated: { label: 'Yeniden yayında', tone: 'success', icon: 'checkmark-circle-outline' },
};

/** Demo örnek belge adları (belge türüne göre) */
const SAMPLE_DOC_NAMES: Record<ProofKind, string> = {
  invoice: 'Fatura',
  receipt: 'Sipariş özeti',
  certificate: 'Orijinallik sertifikası',
  dealer: 'Distribütör faturası',
};

/** Belge küçük resmi: görsel ya da demo örnek belgesi */
function DocTile({ uri, onRemove }: { uri: string; onRemove?: () => void }) {
  const { colors } = useTheme();
  const sample = isSampleDoc(uri);
  return (
    <View style={[styles.doc, { backgroundColor: sample ? colors.surface : colors.skeleton, borderColor: colors.border }]}>
      {sample ? (
        <View style={styles.docSample}>
          <Icon name="document-text-outline" size={26} color="textSecondary" />
          <Text variant="caption" weight="600" color="textSecondary" align="center" numberOfLines={3}>
            {uri.slice('sample:'.length)}
          </Text>
          <Text variant="caption" color="textTertiary">
            Örnek
          </Text>
        </View>
      ) : (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} recyclingKey={uri} />
      )}
      {onRemove ? (
        <PressableScale scaleTo={0.85} onPress={onRemove} hitSlop={8} accessibilityLabel="Belgeyi kaldır" style={[styles.docRemove, { backgroundColor: colors.inverse }]}>
          <Icon name="close" size={13} color={colors.onInverse} />
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Renkli bilgi kutusu */
function Note({ icon, color, title, children }: { icon: IconName; color: string; title?: string; children: string }) {
  return (
    <View style={[styles.note, { backgroundColor: tint(color, 0.1) }]}>
      <Icon name={icon} size={20} color={color} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Text variant="subhead" weight="700">
            {title}
          </Text>
        ) : null}
        <Text variant="footnote" color="textSecondary">
          {children}
        </Text>
      </View>
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text variant="subhead" weight="700">
      {children}
    </Text>
  );
}

function CaseSheet({ listingId, visible, onClose }: { listingId: ID; visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const c = useTrustStore((s) => s.cases[listingId]);
  const listing = useSellerStore((s) => s.listings.find((p) => p.id === listingId));
  // İlanda yüklenmiş orijinallik belgesi varsa itiraz formu onunla başlar
  const proof = listing?.authenticity;
  const [kind, setKind] = useState<ProofKind>(proof?.kind ?? 'invoice');
  const [docs, setDocs] = useState<string[]>(() => (proof?.docs ?? []).slice(0, MAX_DOCS));
  const [note, setNote] = useState('');
  const [declared, setDeclared] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const sentRef = useRef(false);

  const title = 'Hak sahibi şikâyeti';
  const listingTitle = listing ? listing.title || 'Başlıksız ilan' : 'Silinmiş ilan';

  if (!c) {
    return (
      <Sheet visible={visible} onClose={onClose} title={title} subtitle={listingTitle} showClose>
        <EmptyState icon="document-outline" title="Şikâyet kaydı bulunamadı" message="Bu ilan için açık bir hak sahibi şikâyeti yok." />
      </Sheet>
    );
  }

  const status = IP_CASE_STATUS[c.status];
  const noteLen = note.trim().length;
  const valid = docs.length > 0 && noteLen >= MIN_NOTE && declared;
  const fromListing = !!proof && docs.some((d) => proof.docs.includes(d));
  const full = docs.length >= MAX_DOCS;

  const addDocs = (uris: string[]) => {
    if (!uris.length) return;
    haptic.light();
    setDocs((cur) => [...cur, ...uris.filter((u) => !cur.includes(u))].slice(0, MAX_DOCS));
  };
  const guardFull = () => {
    if (!full) return false;
    toast.warning(`En fazla ${MAX_DOCS} belge ekleyebilirsin`);
    return true;
  };
  const addCamera = async () => {
    if (guardFull()) return;
    const uri = await takePhoto([3, 4]);
    if (uri) addDocs([uri]);
  };
  const addLibrary = async () => {
    if (guardFull()) return;
    addDocs(await pickFromLibrary({ limit: MAX_DOCS - docs.length }));
  };
  const addSample = () => {
    if (guardFull()) return;
    haptic.light();
    setDocs((cur) => {
      const base = SAMPLE_DOC_NAMES[kind];
      let n = 1;
      while (cur.includes(`sample:${base} ${n}`)) n++;
      return [...cur, `sample:${base} ${n}`].slice(0, MAX_DOCS);
    });
  };

  const submit = () => {
    // Çift gönderime karşı: ilk geçerli gönderimden sonra yok say
    if (sentRef.current) return;
    setSubmitted(true);
    if (!valid) {
      haptic.warning();
      toast.warning(!docs.length ? 'En az bir belge ekle' : noteLen < MIN_NOTE ? `Açıklamaya en az ${MIN_NOTE} karakter yaz` : 'İtiraz için beyanı onayla');
      return;
    }
    if (useTrustStore.getState().cases[listingId]?.status !== 'removed') return;
    sentRef.current = true;
    submitObjection(listingId, { kind, docs, note });
    haptic.success();
    toast.success(DEMO_MODE ? 'Demo: itirazın kaydedildi, birkaç saniye içinde sonuçlanır' : 'İtirazın gönderildi, belgelerin inceleniyor', 'shield-checkmark');
  };

  const objection = c.objection;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      showClose
      footer={c.status === 'removed' ? <Button title="İtirazı gönder" icon="shield-checkmark-outline" size="lg" fullWidth onPress={submit} /> : undefined}>
      <View style={{ gap: 16 }}>
        <View style={styles.head}>
          <Thumb uri={listing?.images[0]} size={56} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="subhead" weight="600" numberOfLines={2}>
              {listingTitle}
            </Text>
            <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
          </View>
        </View>

        <View style={[styles.box, { backgroundColor: colors.surface }]}>
          <KeyValue label="Şikâyet no" value={c.complaintNo} />
          <KeyValue label="Hak türü" value={RIGHT_TYPE_LABELS[c.rightType]} />
          <KeyValue label="Hak sahibi" value={c.rightHolder} />
          <KeyValue label="Kaldırılma" value={formatDateTime(c.removedAt)} />
          {objection ? <KeyValue label="İtiraz" value={formatDateTime(objection.at)} /> : null}
          {c.reinstatedAt ? <KeyValue label="Yeniden yayın" value={formatDateTime(c.reinstatedAt)} tone="success" /> : null}
        </View>

        {c.status === 'removed' ? (
          <>
            <Note icon="information-circle-outline" color={colors.info} title="Süreç nasıl işler?">
              {`Hak sahibinin usulüne uygun şikâyetlerinde ilan en geç ${IP_PROCESS.takedownHours} saat içinde yayından kaldırılır ve iki tarafa bildirilir. Ürün orijinalse fatura ve tedarik zinciri belgeleriyle itiraz edebilirsin; itirazın hak sahibine iletilir. Belgeler itirazın açıkça haklı olduğunu gösterirse ilan en geç ${IP_PROCESS.reinstateHours} saat içinde yeniden yayımlanır. İki tarafın da mahkemeye başvurma hakkı saklıdır.`}
            </Note>

            <View style={{ gap: 10 }}>
              <Text variant="headline" weight="700">
                Belgeyle itiraz et
              </Text>
              {fromListing && proof ? (
                <Note icon="document-attach-outline" color={colors.success}>
                  {`İlanda yüklediğin orijinallik belgeleri (${PROOF_KIND_LABEL[proof.kind]}) itiraza eklendi. Gerekirse değiştirebilir ya da yeni belge ekleyebilirsin.`}
                </Note>
              ) : null}

              <Label>Belge türü</Label>
              <View style={styles.wrap}>
                {PROOF_KINDS.map((k) => (
                  <Chip key={k.key} label={k.label} size="sm" selected={kind === k.key} onPress={() => setKind(k.key)} />
                ))}
              </View>
              <Text variant="footnote" color="textSecondary">
                {PROOF_KINDS.find((k) => k.key === kind)?.hint}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              <Label>{`Belgeler (${docs.length}/${MAX_DOCS})`}</Label>
              <Text variant="footnote" color="textSecondary">
                Fatura ve ürünün hak sahibine kadar uzanan tedarik zinciri belgelerini (distribütör, bayi ya da ithalatçı faturaları) ekle. Kişisel bilgileri karartabilirsin.
              </Text>
              {docs.length ? (
                <View style={styles.wrap}>
                  {docs.map((d) => (
                    <DocTile key={d} uri={d} onRemove={() => setDocs((cur) => cur.filter((x) => x !== d))} />
                  ))}
                </View>
              ) : null}
              <View style={styles.wrap}>
                <Chip label="Fotoğraf çek" icon="camera-outline" size="sm" onPress={addCamera} />
                <Chip label="Galeriden seç" icon="images-outline" size="sm" onPress={addLibrary} />
                {DEMO_MODE ? <Chip label="Örnek belge ekle" icon="document-attach-outline" size="sm" onPress={addSample} /> : null}
              </View>
              {submitted && !docs.length ? (
                <Text variant="footnote" color="danger">
                  En az bir belge ekle
                </Text>
              ) : null}
            </View>

            <TextField
              label="Açıklama"
              placeholder="Ürünü nereden, ne zaman aldığını ve belgelerin neyi gösterdiğini yaz"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={600}
              helper={noteLen < MIN_NOTE ? `En az ${MIN_NOTE} karakter (${noteLen}/${MIN_NOTE})` : `${noteLen}/600`}
              error={submitted && noteLen < MIN_NOTE ? `En az ${MIN_NOTE} karakter yaz (${noteLen}/${MIN_NOTE})` : undefined}
            />

            <View>
              <CheckRow checked={declared} onPress={() => setDeclared((v) => !v)} label={OBJECTION_DECLARATION} />
              {submitted && !declared ? (
                <Text variant="footnote" color="danger" style={{ marginLeft: 34 }}>
                  İtiraz için beyanı onaylaman gerekiyor
                </Text>
              ) : null}
              <Text variant="footnote" color="textTertiary" style={{ marginTop: 6 }}>
                Gerçeğe aykırı belge sunmak hukuki ve cezai sorumluluk doğurur.
              </Text>
            </View>
          </>
        ) : null}

        {c.status === 'objected' ? (
          <Note icon="hourglass-outline" color={colors.warning} title="İnceleniyor">
            {`İtirazın hak sahibine iletilir ve belgeler incelenir. Belgeler itirazının açıkça haklı olduğunu gösterirse ilan en geç ${IP_PROCESS.reinstateHours} saat içinde yeniden yayımlanır.`}
          </Note>
        ) : null}

        {c.status === 'reinstated' ? (
          <Note icon="checkmark-circle-outline" color={colors.success} title="İtirazın kabul edildi">
            Sunduğun belgeler yeterli bulundu ve ilan yeniden yayında. Dosya kapandı; iki tarafın da mahkemeye başvurma hakkı saklıdır.
          </Note>
        ) : null}

        {c.status !== 'removed' && objection ? (
          <View style={{ gap: 10 }}>
            <Label>İtirazın</Label>
            <View style={[styles.box, { backgroundColor: colors.surface }]}>
              <KeyValue label="Belge türü" value={PROOF_KIND_LABEL[objection.kind]} />
              <KeyValue label="Belge sayısı" value={`${objection.docs.length} belge`} />
              {objection.note ? (
                <Text variant="footnote" color="textSecondary" style={{ marginTop: 4 }}>
                  “{objection.note}”
                </Text>
              ) : null}
            </View>
            {objection.docs.length ? (
              <View style={styles.wrap}>
                {objection.docs.map((d) => (
                  <DocTile key={d} uri={d} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {DEMO_MODE ? (
          <Text variant="footnote" color="textTertiary">
            {c.status === 'objected'
              ? 'Demo: belgeler kimseye gönderilmez ve yalnızca bu cihazda tutulur. İtiraz birkaç saniye içinde kabul edilmiş sayılır.'
              : c.status === 'reinstated'
                ? 'Demo: itiraz otomatik olarak kabul edildi. Gerçek sürümde belgeler incelenir ve sonuç iki tarafa bildirilir.'
                : 'Demo: bu şikâyet örnektir. Şikâyet, itiraz ve belgeler kimseye gönderilmez; yalnızca bu cihazda tutulur.'}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

/**
 * İlanın şikâyet dosyası. listingId boş olunca kapanır (kapanış animasyonu boyunca son dosya görünür).
 * <IpCaseSheet listingId={caseFor} onClose={() => setCaseFor(null)} />
 */
export function IpCaseSheet({ listingId, onClose }: { listingId: ID | null; onClose: () => void }) {
  const [lastId, setLastId] = useState(listingId);
  if (listingId && listingId !== lastId) setLastId(listingId);
  const id = listingId ?? lastId;
  if (!id) return null;
  // key: her ilan için form durumu (belge, açıklama, beyan) sıfırdan başlar
  return <CaseSheet key={id} listingId={id} visible={!!listingId} onClose={onClose} />;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: { borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  note: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  doc: { width: 84, height: 108, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  docSample: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
  docRemove: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
