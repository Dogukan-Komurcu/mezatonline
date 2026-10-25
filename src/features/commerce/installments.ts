/**
 * Kredi kartı taksit tablosu (mock). Türkiye'de "şimdi al, sonra öde"nin karşılığı kart taksitidir.
 * Yalnızca Hemen Al / fiyat önerisi alımlarında sunulur; açık artırma, çekiliş ve bahşişte sunulmaz.
 */
import type { OrderSource } from '@/types';

export const INSTALLMENT_COUNTS = [1, 2, 3, 6, 9] as const;
export type InstallmentCount = (typeof INSTALLMENT_COUNTS)[number];

/** Taksit için asgari sepet tutarı */
export const MIN_INSTALLMENT_TOTAL = 250;

/** Banka → kart programı */
export const BANK_PROGRAMS: Record<string, string> = {
  'Garanti BBVA': 'Bonus',
  'İş Bankası': 'Maximum',
  'Yapı Kredi': 'World',
  Akbank: 'Axess',
  'Ziraat Bankası': 'Bankkart Combo',
  QNB: 'CardFinans',
  Enpara: 'Enpara.com',
  VakıfBank: 'VakıfBank Worldcard',
  Halkbank: 'Paraf',
  DenizBank: 'DenizBank Bonus',
};

/** Program bazında toplam vade farkı oranları (0 = vade farksız) */
const RATES: Record<string, Record<InstallmentCount, number>> = {
  Bonus: { 1: 0, 2: 0, 3: 0, 6: 0.069, 9: 0.104 },
  Maximum: { 1: 0, 2: 0, 3: 0.018, 6: 0.072, 9: 0.109 },
  World: { 1: 0, 2: 0, 3: 0, 6: 0.065, 9: 0.099 },
  Axess: { 1: 0, 2: 0, 3: 0.021, 6: 0.074, 9: 0.112 },
  'Bankkart Combo': { 1: 0, 2: 0.012, 3: 0.024, 6: 0.078, 9: 0.118 },
  CardFinans: { 1: 0, 2: 0, 3: 0.02, 6: 0.071, 9: 0.108 },
  'Enpara.com': { 1: 0, 2: 0.015, 3: 0.029, 6: 0.081, 9: 0.123 },
  'VakıfBank Worldcard': { 1: 0, 2: 0, 3: 0.022, 6: 0.075, 9: 0.114 },
  Paraf: { 1: 0, 2: 0, 3: 0.019, 6: 0.07, 9: 0.106 },
  'DenizBank Bonus': { 1: 0, 2: 0, 3: 0, 6: 0.069, 9: 0.104 },
};

const DEFAULT_PROGRAM = 'Bonus';

export function programOf(bank: string | undefined): string {
  return (bank && BANK_PROGRAMS[bank]) || DEFAULT_PROGRAM;
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
