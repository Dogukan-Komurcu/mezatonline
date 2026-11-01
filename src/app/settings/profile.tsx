import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Avatar, Button, Header, Icon, PressableScale, Screen, SelectField, Sheet, Text, TextField, toast } from '@/components/ui';
import { getUserByUsername } from '@/data';
import { AVATARS, BANNERS } from '@/data/media';
import { PROVINCES } from '@/data/turkey';
import { pickImage } from '@/features/account/media';
import { useAccountStore } from '@/features/account/store';
import { BottomBar, ConfirmSheet, MenuRow } from '@/features/account/ui';
import { useQaParams } from '@/features/account/qa';
import { formatTimeUntil } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useAuthStore, useMe } from '@/store/auth';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

const BIO_MAX = 1000;
const NAME_MAX = 40;
const RESERVED = ['mezatonline', 'mezat', 'admin', 'destek', 'support', 'yardim', 'moderator', 'mezatonline_destek'];
const DAY = 86_400_000;

/** Türkçe karakterleri dönüştürür, izin verilmeyenleri atar: a-z 0-9 _ . */
function normalizeUsername(v: string): string {
  return v
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/\s/g, '_')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 30);
}

function usernameError(v: string): string | undefined {
  if (v.length < 3) return 'En az 3 karakter olmalı';
  if (/^[._]|[._]$/.test(v)) return 'Nokta ya da alt çizgiyle başlayamaz veya bitemez';
  if (/\.\./.test(v)) return 'Art arda iki nokta kullanılamaz';
  if (/^\d+$/.test(v)) return 'Yalnızca rakamlardan oluşamaz';
  return undefined;
}

type PickerKind = 'avatar' | 'cover' | null;

export default function EditProfileScreen() {
  const qa = useQaParams();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const me = useMe();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const usernameChangedAt = useAccountStore((s) => s.usernameChangedAt);
  const markUsernameChanged = useAccountStore((s) => s.markUsernameChanged);

  const [avatar, setAvatar] = useState(me.avatar);
  const [cover, setCover] = useState(me.cover ?? BANNERS[0]);
  const [displayName, setDisplayName] = useState(me.displayName);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio);
  const [city, setCity] = useState(me.city);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const usernameChanged = username !== me.username;
  const dirty =
    usernameChanged || avatar !== me.avatar || cover !== (me.cover ?? BANNERS[0]) || displayName !== me.displayName || bio !== me.bio || city !== me.city;

  const cooldownLeft = usernameChangedAt ? new Date(usernameChangedAt).getTime() + DAY - Date.now() : 0;
  const formatErr = usernameChanged ? usernameError(username) : undefined;

  // Kullanıcı adı müsaitlik kontrolü (sunucu çağrısı simülasyonu)
  useEffect(() => {
    if (!usernameChanged || formatErr) {
      setChecking(false);
      setAvailable(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(() => {
      const taken = RESERVED.includes(username) || !!getUserByUsername(username);
      setAvailable(!taken);
      setChecking(false);
    }, 450);
    return () => clearTimeout(t);
  }, [username, usernameChanged, formatErr]);

  const unameError =
    formatErr ??
    (usernameChanged && cooldownLeft > 0
      ? `Kullanıcı adını 24 saatte bir değiştirebilirsin (${formatTimeUntil(Date.now() + cooldownLeft)} sonra)`
      : available === false
        ? 'Bu kullanıcı adı alınmış'
        : undefined);
  const nameError = displayName.trim().length < 2 ? 'Adın en az 2 karakter olmalı' : undefined;
  const canSave = dirty && !nameError && !unameError && !checking && (!usernameChanged || available === true) && !saving;

  const back = () => {
    if (dirty) setDiscardOpen(true);
    else router.back();
  };

  const pickFromLibrary = async (kind: 'avatar' | 'cover') => {
    const asset = await pickImage('library', { allowsEditing: true, aspect: kind === 'avatar' ? [1, 1] : [3, 1], maxBytes: 7 * 1024 * 1024 });
    if (!asset) return;
    if (kind === 'avatar') setAvatar(asset.uri);
    else setCover(asset.uri);
    setPicker(null);
    haptic.light();
  };

  const takePhoto = async () => {
    const asset = await pickImage('camera', { allowsEditing: true, aspect: [1, 1], front: true });
    if (!asset) return;
    setAvatar(asset.uri);
    setPicker(null);
    haptic.light();
  };

  const save = () => {
    if (!canSave) return;
    setSaving(true);
    setTimeout(() => {
      updateProfile({ avatar, cover, displayName: displayName.trim(), username, bio: bio.trim(), city });
      if (usernameChanged) markUsernameChanged();
      setSaving(false);
      haptic.success();
      toast.success('Profilin güncellendi');
      router.back();
    }, 600);
  };

  const gridSize = Math.floor((width - SCREEN_PADDING * 2 - 10 * 3) / 4);

  return (
    <Screen>
      <Header title="Profili düzenle" onBack={back} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentOffset={qa.offset} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Kapak + profil fotoğrafı */}
          <PressableScale scaleTo={0.99} onPress={() => setPicker('cover')} accessibilityRole="button" accessibilityLabel="Kapak fotoğrafını değiştir">
            <Image source={{ uri: cover }} style={[styles.cover, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            <View style={[styles.coverBadge, { backgroundColor: colors.overlay }]}>
              <Icon name="camera" size={14} color="#FFFFFF" />
              <Text variant="caption" color="#FFFFFF">
                Kapağı değiştir
              </Text>
            </View>
          </PressableScale>
          <View style={styles.avatarWrap}>
            <PressableScale scaleTo={0.95} onPress={() => setPicker('avatar')} accessibilityRole="button" accessibilityLabel="Profil fotoğrafını değiştir">
              <View style={[styles.avatarRing, { borderColor: colors.bg, backgroundColor: colors.bg }]}>
                <Avatar uri={avatar} name={username} size={96} />
              </View>
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
                <Icon name="camera" size={16} color={colors.onPrimary} />
              </View>
            </PressableScale>
          </View>

          <View style={styles.form}>
            <TextField label="Ad" value={displayName} onChangeText={(v) => setDisplayName(v.slice(0, NAME_MAX))} autoCapitalize="words" maxLength={NAME_MAX} error={nameError} textContentType="name" />
            <TextField
              label="Kullanıcı adı"
              prefix="@"
              value={username}
              onChangeText={(v) => setUsername(normalizeUsername(v))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              error={unameError}
              helper={
                usernameChanged && available === true && !checking ? '✓ Bu kullanıcı adı kullanılabilir' : '3–30 karakter · a–z, 0–9, nokta ve _ · değişiklikten sonra 24 saat beklenir'
              }
              right={checking ? <ActivityIndicator size="small" color={colors.textSecondary} /> : usernameChanged && available === true ? <Icon name="checkmark-circle" size={20} color="success" /> : null}
            />
            <TextField
              label="Hakkında"
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
              multiline
              placeholder="Kendinden, koleksiyonundan ya da sattıklarından bahset…"
              maxLength={BIO_MAX}
              helper={`${bio.length}/${BIO_MAX}`}
            />
            <SelectField label="Şehir" value={city} options={[...PROVINCES]} searchable onChange={setCity} placeholder="İl seç" />
          </View>
        </ScrollView>
        <BottomBar>
          <Button title="Değişiklikleri kaydet" size="lg" fullWidth disabled={!canSave} loading={saving} onPress={save} />
        </BottomBar>
      </KeyboardAvoidingView>

      <Sheet visible={picker === 'avatar'} onClose={() => setPicker(null)} title="Profil fotoğrafı" showClose contentStyle={{ paddingHorizontal: 0 }}>
        <MenuRow icon="images-outline" title="Galeriden seç" subtitle="Kare, en fazla 7 MB" onPress={() => pickFromLibrary('avatar')} />
        <MenuRow icon="camera-outline" title="Fotoğraf çek" onPress={takePhoto} />
        <Text variant="footnote" weight="700" color="textSecondary" style={styles.gridLabel}>
          YA DA BİR AVATAR SEÇ
        </Text>
        <View style={styles.grid}>
          {AVATARS.slice(0, 16).map((uri) => (
            <PressableScale
              key={uri}
              scaleTo={0.92}
              onPress={() => {
                setAvatar(uri);
                setPicker(null);
                haptic.tap();
              }}
              style={[styles.gridItem, { width: gridSize, height: gridSize, borderRadius: gridSize / 2, borderColor: uri === avatar ? colors.text : 'transparent' }]}>
              <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: gridSize / 2, backgroundColor: colors.skeleton }} contentFit="cover" cachePolicy="memory-disk" />
            </PressableScale>
          ))}
        </View>
      </Sheet>

      <Sheet visible={picker === 'cover'} onClose={() => setPicker(null)} title="Kapak fotoğrafı" subtitle="3:1 oranında görseller en iyi sonucu verir" showClose contentStyle={{ paddingHorizontal: 0 }}>
        <MenuRow icon="images-outline" title="Galeriden seç" subtitle="En fazla 7 MB" onPress={() => pickFromLibrary('cover')} />
        <Text variant="footnote" weight="700" color="textSecondary" style={styles.gridLabel}>
          HAZIR KAPAKLAR
        </Text>
        <View style={{ gap: 10, paddingHorizontal: SCREEN_PADDING }}>
          {BANNERS.slice(0, 6).map((uri) => (
            <PressableScale
              key={uri}
              scaleTo={0.98}
              onPress={() => {
                setCover(uri);
                setPicker(null);
                haptic.tap();
              }}
              style={[styles.coverOption, { borderColor: uri === cover ? colors.text : 'transparent' }]}>
              <Image source={{ uri }} style={[StyleSheet.absoluteFill, { borderRadius: radius.md - 2, backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" />
            </PressableScale>
          ))}
        </View>
      </Sheet>

      <ConfirmSheet
        visible={discardOpen}
        onClose={() => setDiscardOpen(false)}
        icon="alert-circle-outline"
        destructive
        title="Değişiklikler kaydedilmedi"
        message="Çıkarsan yaptığın değişiklikler kaybolacak."
        confirmLabel="Kaydetmeden çık"
        cancelLabel="Düzenlemeye devam et"
        onConfirm={() => {
          setDiscardOpen(false);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 3 },
  coverBadge: { position: 'absolute', right: 12, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  avatarWrap: { paddingHorizontal: SCREEN_PADDING, marginTop: -48, alignSelf: 'flex-start' },
  avatarRing: { borderWidth: 4, borderRadius: 56, padding: 0 },
  cameraBadge: { position: 'absolute', right: 0, bottom: 4, width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  form: { paddingHorizontal: SCREEN_PADDING, gap: 16, marginTop: 16 },
  gridLabel: { paddingHorizontal: SCREEN_PADDING, paddingTop: 16, paddingBottom: 10, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: SCREEN_PADDING },
  gridItem: { borderWidth: 3, padding: 2 },
  coverOption: { width: '100%', aspectRatio: 3, borderRadius: radius.md, borderWidth: 3, overflow: 'hidden' },
});
