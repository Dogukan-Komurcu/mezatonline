/**
 * Kredi kartı taksit tablosu (mock, örnek oranlar). Türkiye'de "şimdi al, sonra öde"nin karşılığı kart taksitidir.
 * Yalnızca Hemen Al / fiyat önerisi alımlarında sunulur; açık artırma, çekiliş ve bahşişte sunulmaz.
 * Banka veya kart programı adı kullanılmaz: gerçek oranları ödeme kuruluşu ve kartı veren banka belirler.
 */
import type { OrderSource } from '@/types';

export const INSTALLMENT_COUNTS = [1, 2, 3, 6, 9] as const;
export type InstallmentCount = (typeof INSTALLMENT_COUNTS)[number];

/** Taksit için asgari sepet tutarı */
export const MIN_INSTALLMENT_TOTAL = 250;

/** Tek, genel taksit programı (banka/kart programı adı yok) */
export const GENERIC_PROGRAM = 'Kredi kartı';

/** Program bazında toplam vade farkı oranları (0 = vade farksız) — demo için örnek değerler */
const RATES: Record<string, Record<InstallmentCount, number>> = {
  [GENERIC_PROGRAM]: { 1: 0, 2: 0, 3: 0.02, 6: 0.07, 9: 0.105 },
};

const DEFAULT_PROGRAM = GENERIC_PROGRAM;

/** Kartın taksit programı: bankaya göre ayrım yapılmaz */
export function programOf(bank: string | undefined): string {
  return (bank && RATES[bank] ? bank : undefined) ?? DEFAULT_PROGRAM;
}

export type InstallmentPlan = {
  count: InstallmentCount;
  monthly: number;
  total: number;
  interest: number;
  interestFree: boolean;
};

export function installmentPlan(program: string, amount: number, count: InstallmentCount): InstallmentPlan {
  const rate = (RATES[program] ?? RATES[DEFAULT_PROGRAM])[count];
  const total = Math.round(amount * (1 + rate) * 100) / 100;
  const monthly = Math.round((total / count) * 100) / 100;
  return { count, monthly, total, interest: Math.round((total - amount) * 100) / 100, interestFree: rate === 0 };
}

export function plansFor(bank: string | undefined, amount: number): InstallmentPlan[] {
  const program = programOf(bank);
  return INSTALLMENT_COUNTS.map((c) => installmentPlan(program, amount, c));
}

/** Tüm programların tablosu (bilgi sayfası için) */
export function allPrograms(): string[] {
  return Object.keys(RATES);
}

export function installmentsAllowed(source: OrderSource): boolean {
  return source === 'buy_now' || source === 'offer';
}
