import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Button, Header, Icon, PressableScale, Text, toast } from '@/components/ui';
import { AuthLayout, StepTitle } from '@/features/auth/components';
import { displayPhone, getCountry, toE164 } from '@/features/auth/countries';
import { OTP_LENGTH, OtpInput } from '@/features/auth/OtpInput';
import { attachPhone, loginAndFinish, startSignup } from '@/features/auth/session';
import type { PhoneMode } from '@/features/auth/store';
import { formatCountdown } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { ForceScheme, radius, useTheme } from '@/theme';

const RESEND_SECONDS = 30;

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function VerifyScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ phone?: string; country?: string; mode?: string }>();
  const mode: PhoneMode = params.mode === 'finish' || params.mode === 'login' ? params.mode : 'signup';
  const country = getCountry(params.country);
  const digits = (params.phone ?? '').replace(/\D/g, '');
  const pretty = displayPhone(digits, country);

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified'>('idle');
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [smsCode, setSmsCode] = useState(randomCode);
  const [channel, setChannel] = useState<'sms' | 'call'>('sms');
  const inputRef = useRef<TextInputInstance>(null);
  const shake = useSharedValue(0);

  // Geri sayım
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Otomatik odak
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 380);
    return () => clearTimeout(t);
  }, []);

  // Sahte SMS / arama: kod birkaç saniye içinde "gelir" (gerçek SMS altyapısı Supabase ile gelecek)
  const [incoming, setIncoming] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      haptic.light();
      setIncoming(true);
    }, 1600);
    return () => clearTimeout(t);
  }, [smsCode]);

  const remaining = Math.max(0, RESEND_SECONDS - Math.floor((now - sentAt) / 1000));

  const complete = (e164: string) => {
    if (mode === 'login') {
      loginAndFinish('phone', e164);
      return;
    }
    if (mode === 'signup') startSignup('phone', e164);
    else attachPhone(e164);
    toast.success('Telefon numaran doğrulandı', 'shield-checkmark');
    router.replace('/(auth)/username');
  };

  const verify = (value: string) => {
    if (value.length !== OTP_LENGTH || status !== 'idle') return;
    Keyboard.dismiss();
    setStatus('verifying');
    setTimeout(() => {
      setStatus('verified');
      haptic.success();
      setTimeout(() => complete(toE164(digits, country)), 450);
    }, 1000);
  };

  const onChange = (value: string) => {
    if (status !== 'idle') return;
    setCode(value);
    if (value.length === OTP_LENGTH) verify(value);
  };

  const resend = (via: 'sms' | 'call') => {
    if (remaining > 0 || status !== 'idle') return;
    haptic.tap();
    setChannel(via);
    setIncoming(false);
    setSmsCode(randomCode());
    setSentAt(Date.now());
    setNow(Date.now());
    setCode('');
    toast.success(via === 'sms' ? 'Yeni kod gönderildi' : 'Seni birazdan arıyoruz', via === 'sms' ? 'paper-plane' : 'call');
    inputRef.current?.focus();
  };

  const paste = async () => {
    haptic.tap();
    try {
      const text = await Clipboard.getStringAsync();
      const found = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (found.length === OTP_LENGTH) {
        onChange(found);
      } else {
        shake.set(withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-5, { duration: 50 }), withTiming(0, { duration: 50 })));
        toast.warning('Panoda 6 haneli bir kod bulunamadı');
      }
    } catch {
      toast.error('Pano okunamadı');
    }
  };

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  return (
    <AuthLayout
      header={<Header title={mode === 'finish' ? 'Kaydı Tamamla' : mode === 'login' ? 'Giriş Yap' : undefined} />}
      footer={
        <Button
          title={status === 'verified' ? 'Doğrulandı' : 'Kodu doğrula'}
          icon={status === 'verified' ? 'checkmark-circle' : undefined}
          size="lg"
          fullWidth
          disabled={code.length !== OTP_LENGTH}
          loading={status === 'verifying'}
          onPress={() => verify(code)}
        />
      }>
      <StepTitle title="Kodu gir" subtitle={`${pretty} numarasına gönderilen ${OTP_LENGTH} haneli kodu gir.`} />
      <PressableScale
        onPress={() => {
          haptic.tap();
          router.back();
        }}
        style={styles.changeNumber}
        accessibilityRole="button">
        <Icon name="create-outline" size={16} color="textSecondary" />
        <Text variant="subhead" weight="700" color="textSecondary" style={styles.underline}>
          Numarayı değiştir
        </Text>
      </PressableScale>

      <Animated.View entering={FadeInDown.duration(350)}>
        <Animated.View style={shakeStyle}>
          <OtpInput value={code} onChange={onChange} disabled={status !== 'idle'} inputRef={inputRef} onFocusRequest={() => inputRef.current?.focus()} />
        </Animated.View>
      </Animated.View>

      <View style={styles.statusArea}>
        {status === 'verifying' ? (
          <Animated.View entering={FadeIn} style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text variant="subhead" color="textSecondary">
              Doğrulanıyor…
            </Text>
          </Animated.View>
        ) : status === 'verified' ? (
          <Animated.View entering={FadeIn} style={styles.statusRow}>
            <Icon name="checkmark-circle" size={18} color="success" />
            <Text variant="subhead" weight="700" color="success">
              Numaran doğrulandı
            </Text>
          </Animated.View>
        ) : (
          <PressableScale onPress={paste} style={[styles.pasteChip, { backgroundColor: colors.surface }]} accessibilityRole="button">
            <Icon name="clipboard-outline" size={15} color="text" />
            <Text variant="footnote" weight="700">
              Kodu yapıştır
            </Text>
          </PressableScale>
        )}
      </View>

      {incoming && status === 'idle' ? (
        <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.sms, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.smsIcon, { backgroundColor: colors.success }]}>
            <Icon name={channel === 'sms' ? 'chatbubble' : 'call'} size={16} color="onPrimary" />
          </View>
          <View style={styles.smsBody}>
            <Text variant="caption" color="textSecondary">
              {channel === 'sms' ? 'MESAJLAR · şimdi' : 'SESLİ ARAMA · şimdi'}
            </Text>
            <Text variant="subhead" weight="600" numberOfLines={2}>
              {channel === 'sms' ? `Mezatonline doğrulama kodun: ${smsCode}. Bu kodu kimseyle paylaşma.` : `Doğrulama kodun: ${smsCode.split('').join(' ')}`}
            </Text>
          </View>
          <Button title="Kullan" size="sm" onPress={() => onChange(smsCode)} />
        </Animated.View>
      ) : null}

      <View style={[styles.resendCard, { backgroundColor: colors.surface }]}>
        <Text variant="subhead" color="textSecondary">
          Kod gelmedi mi?
        </Text>
        {remaining > 0 ? (
          <Text variant="subhead" weight="700" color="textTertiary" tabular>
            Kodu tekrar gönder ({formatCountdown(remaining)})
          </Text>
        ) : (
          <View style={styles.resendActions}>
            <Text variant="subhead" weight="800" style={styles.underline} onPress={() => resend('sms')} suppressHighlighting>
              Kodu tekrar gönder
            </Text>
            <Text variant="subhead" color="textTertiary">
              ·
            </Text>
            <Text variant="subhead" weight="800" style={styles.underline} onPress={() => resend('call')} suppressHighlighting>
              Sesli arama ile al
            </Text>
          </View>
        )}
      </View>
    </AuthLayout>
  );
}

export default function Verify() {
  return (
    <ForceScheme scheme="dark">
      <VerifyScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  changeNumber: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: -14, marginBottom: 24, paddingVertical: 4 },
  underline: { textDecorationLine: 'underline' },
  statusArea: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pasteChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  resendCard: { marginTop: 12, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, gap: 6, alignItems: 'center' },
  sms: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, borderRadius: radius.lg, padding: 12 },
  smsIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  smsBody: { flex: 1, gap: 2 },
  resendActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
});
