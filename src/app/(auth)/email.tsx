import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Header, Icon, Sheet, Text, TextField, toast } from '@/components/ui';
import { setMarketingConsent } from '@/features/account/store';
import { AuthLayout, Checkbox, StepTitle } from '@/features/auth/components';
import { useLegalSheet, type LegalDoc } from '@/features/auth/legal';
import { loginAndFinish, startSignup } from '@/features/auth/session';
import { haptic } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';
import { ForceScheme, useTheme } from '@/theme';

const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Mode = 'signup' | 'login';

function isEmail(v: string) {
  return EMAIL_RE.test(v.trim());
}

/** Şifre gücü: 0-3 */
function passwordScore(p: string): number {
  let score = 0;
  if (p.length >= PASSWORD_MIN) score++;
  if (/[A-ZÇĞİÖŞÜ]/.test(p) && /[a-zçğıöşü]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(p)) score++;
  else if (/\d/.test(p) && p.length >= 10) score++;
  return score;
}

const STRENGTH_LABEL = ['Çok zayıf', 'Zayıf', 'İyi', 'Güçlü'];

function StrengthMeter({ password }: { password: string }) {
  const { colors } = useTheme();
  const score = passwordScore(password);
  const tint = score <= 1 ? colors.danger : score === 2 ? colors.warning : colors.success;
  return (
    <View style={styles.meterRow}>
      <View style={styles.meterBars}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.meterBar, { backgroundColor: i < score ? tint : colors.surfaceAlt }]} />
        ))}
      </View>
      <Text variant="footnote" color={tint}>
        {STRENGTH_LABEL[score]}
      </Text>
    </View>
  );
}

/** Kural satırı: ✓ En az 8 karakter */
function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.rule}>
      <Icon name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={ok ? 'success' : 'textTertiary'} />
      <Text variant="footnote" color={ok ? 'textSecondary' : 'textTertiary'}>
        {label}
      </Text>
    </View>
  );
}

function ForgotPasswordSheet({ visible, initialEmail, onClose }: { visible: boolean; initialEmail: string; onClose: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const send = () => {
    Keyboard.dismiss();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      haptic.success();
      toast.success('Demo: e-posta gönderilmez. Gerçek sürümde sıfırlama bağlantısı e-postana gelir.', 'mail');
      onClose();
    }, 1000);
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      showClose
      title="Şifreni mi unuttun?"
      subtitle="Hesabına bağlı e-posta adresini gir, şifreni sıfırlaman için bir bağlantı gönderelim."
      footer={<Button title="Bağlantı gönder" size="lg" fullWidth disabled={!isEmail(email)} loading={sending} onPress={send} />}>
      <TextField
        label="E-posta"
        value={email}
        onChangeText={setEmail}
        placeholder="ornek@eposta.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        icon="mail-outline"
        editable={!sending}
      />
    </Sheet>
  );
}

function EmailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotKey, setForgotKey] = useState(0);
  const legal = useLegalSheet();
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 380);
    return () => clearTimeout(t);
  }, []);

  const isSignup = mode === 'signup';
  const identifier = email.trim();
  const emailOk = isSignup ? isEmail(identifier) : identifier.length >= 3;
  const passwordOk = isSignup ? password.length >= PASSWORD_MIN : password.length >= 6;
  const canSubmit = emailOk && passwordOk && (!isSignup || (adult && terms));

  // Sahte ağ isteği
  useEffect(() => {
    if (!submitting) return;
    const t = setTimeout(() => {
      setSubmitting(false);
      haptic.success();
      if (isSignup) {
        startSignup('email', identifier.toLowerCase());
        // Onay ve açık rıza burada alındı; kullanıcı adı adımında tekrar sorulmaz
        useAuthStore.getState().acceptTerms('email');
        setMarketingConsent(marketing);
        toast.success('Hesabın oluşturuldu', 'checkmark-circle');
        router.push({ pathname: '/(auth)/phone', params: { mode: 'finish' } });
      } else {
        const isMail = identifier.includes('@');
        loginAndFinish('email', isMail ? identifier.toLowerCase() : undefined, identifier);
      }
    }, 1100);
    return () => clearTimeout(t);
  }, [submitting, isSignup, identifier, marketing]);

  const submit = () => {
    if (!canSubmit) {
      setEmailTouched(true);
      setAttempted(true);
      haptic.warning();
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
  };

  const switchMode = () => {
    haptic.tap();
    setMode(isSignup ? 'login' : 'signup');
    setPassword('');
    setEmailTouched(false);
    setAttempted(false);
  };

  const legalLink = (doc: LegalDoc, label: string) => (
    <Text variant="callout" weight="700" style={styles.underline} onPress={() => legal.open(doc)} suppressHighlighting>
      {label}
    </Text>
  );

  const kvkkLink = (
    <Text variant="footnote" weight="700" color="textSecondary" style={styles.underline} onPress={() => legal.open('kvkk')} suppressHighlighting>
      KVKK Aydınlatma Metni
    </Text>
  );

  const emailError = emailTouched && identifier.length > 0 && !emailOk ? (isSignup ? 'Geçerli bir e-posta adresi gir.' : 'E-posta adresini veya kullanıcı adını kontrol et.') : undefined;

  return (
    <AuthLayout
      header={<Header title={isSignup ? 'E-posta ile kaydol' : 'Giriş Yap'} />}
      footer={
        <>
          <Button title={isSignup ? 'Kaydol' : 'Giriş Yap'} size="lg" fullWidth disabled={!canSubmit} loading={submitting} onPress={submit} />
          <Text variant="callout" color="textSecondary" align="center">
            {isSignup ? 'Zaten hesabın var mı? ' : 'Hesabın yok mu? '}
            <Text variant="callout" weight="800" style={styles.underline} onPress={switchMode} suppressHighlighting>
              {isSignup ? 'Giriş Yap' : 'Kaydol'}
            </Text>
          </Text>
        </>
      }>
      <Animated.View key={mode} entering={FadeIn.duration(250)}>
        <StepTitle
          title={isSignup ? 'Hesabını oluştur' : 'Tekrar hoş geldin'}
          subtitle={isSignup ? 'E-posta ve şifreyle hesabını aç; telefon onayından sonra mezatlarda teklif verebilirsin.' : 'E-posta adresin veya kullanıcı adınla giriş yap.'}
        />
      </Animated.View>

      <View style={styles.form}>
        <TextField
          ref={emailRef}
          label={isSignup ? 'E-posta' : 'E-posta veya kullanıcı adı'}
          value={email}
          onChangeText={setEmail}
          onBlur={() => setEmailTouched(true)}
          editable={!submitting}
          placeholder={isSignup ? 'ornek@eposta.com' : 'ornek@eposta.com veya kullanici_adi'}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isSignup ? 'email' : 'username'}
          textContentType={isSignup ? 'emailAddress' : 'username'}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          icon={isSignup ? 'mail-outline' : 'person-outline'}
          error={emailError}
          right={emailOk ? <Icon name="checkmark-circle" size={20} color="success" /> : undefined}
        />
        <View style={styles.passwordBlock}>
          <TextField
            ref={passwordRef}
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            editable={!submitting}
            placeholder={isSignup ? `En az ${PASSWORD_MIN} karakter` : 'Şifren'}
            password
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            textContentType={isSignup ? 'newPassword' : 'password'}
            returnKeyType="done"
            onSubmitEditing={submit}
            icon="lock-closed-outline"
          />
          {isSignup ? (
            password.length > 0 ? (
              <View style={styles.rules}>
                <StrengthMeter password={password} />
                <Rule ok={password.length >= PASSWORD_MIN} label={`En az ${PASSWORD_MIN} karakter`} />
                <Rule ok={/\d/.test(password)} label="En az bir rakam (önerilir)" />
              </View>
            ) : null
          ) : (
            <Text variant="subhead" weight="700" color={colors.textSecondary} style={[styles.forgot, styles.underline]} onPress={() => {
                setForgotKey((k) => k + 1);
                setForgotOpen(true);
              }}
              suppressHighlighting>
              Şifreni mi unuttun?
            </Text>
          )}
        </View>

        {isSignup ? (
          <View style={styles.checks}>
            <Checkbox checked={adult} onChange={setAdult} label="18 yaşından büyüğüm" error={attempted && !adult} />
            <Checkbox
              checked={terms}
              onChange={setTerms}
              error={attempted && !terms}
              label={
                <Text variant="callout">
                  {legalLink('terms', 'Kullanım Koşulları')}’nı ve {legalLink('privacy', 'Gizlilik Politikası')}’nı okudum, kabul ediyorum.
                </Text>
              }
            />
            <Checkbox
              checked={marketing}
              onChange={setMarketing}
              label={
                <Text variant="callout" color="textSecondary">
                  Kampanya ve fırsatlardan e-posta ve bildirimle haberdar olmak için {legalLink('marketing', 'ticari elektronik ileti')} almaya açık rıza veriyorum. (İsteğe bağlı)
                </Text>
              }
            />
            <Text variant="footnote" color="textTertiary" style={styles.kvkk}>
              Kişisel verilerinin nasıl işlendiğini {kvkkLink} metninde bulabilirsin.
            </Text>
          </View>
        ) : null}
      </View>
      <ForgotPasswordSheet key={forgotKey} visible={forgotOpen} initialEmail={isEmail(identifier) ? identifier : ''} onClose={() => setForgotOpen(false)} />
      {legal.sheet}
    </AuthLayout>
  );
}

export default function Email() {
  return (
    <ForceScheme scheme="dark">
      <EmailScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  passwordBlock: { gap: 10 },
  rules: { gap: 6, paddingHorizontal: 2 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meterBars: { flex: 1, flexDirection: 'row', gap: 4 },
  meterBar: { flex: 1, height: 4, borderRadius: 2 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 4 },
  checks: { gap: 2, marginTop: 4 },
  kvkk: { marginTop: 6, paddingHorizontal: 2 },
  underline: { textDecorationLine: 'underline' },
});
