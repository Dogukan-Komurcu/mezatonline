/**
 * Çıkışta hesaba bağlı yerel verileri temizler; misafire ya da cihazdaki bir sonraki hesaba
 * önceki hesabın siparişleri, kayıtlıları, kartları, puanları kalmasın.
 * Cihaz tercihleri (tema, son aramalar, gizlenen yayınlar, ana sayfa ipucu) korunur.
 * Kampanya bildirimi izni hesaba bağlı açık rızadır: sonraki hesaba geçmesin diye kapatılır.
 */
import { useAccountStore } from '@/features/account/store';
import { useActivityExtras } from '@/features/activity/store';
import { useBrowseStore } from '@/features/browse/store';
import { useCouponStore } from '@/features/commerce/coupons';
import { useInboxExtras } from '@/features/inbox/store';
import { useLivePrefs } from '@/features/live/liveStore';
import { useProfilePrefs } from '@/features/profile/store';
import { useSellerExtras } from '@/features/seller/store';
import { useInboxStore } from '@/store/inbox';
import { useModerationStore } from '@/store/moderation';
import { useOrdersStore } from '@/store/orders';
import { useRewardsStore } from '@/store/rewards';
import { useSellerStore } from '@/store/seller';
import { useSettingsStore } from '@/store/settings';
import { useSocialStore } from '@/store/social';
import { useWalletStore } from '@/store/wallet';

type ResettableStore<T> = { setState: (state: T, replace: true) => void; getInitialState: () => T };

function reset<T>(store: ResettableStore<T>) {
  store.setState(store.getInitialState(), true);
}

export function resetAccountData() {
  useSocialStore.setState({ followingIds: [], remindedShowIds: [], savedProductIds: [], followedCategoryIds: [], blockedIds: [] });
  useLivePrefs.setState({ coupon: undefined, useCredits: true, bidIntroAccepted: false, bidRulesAcceptance: undefined });
  useBrowseStore.setState({ savedSearches: [] });
  reset(useWalletStore);
  reset(useOrdersStore);
  reset(useSellerStore);
  reset(useSellerExtras);
  reset(useRewardsStore);
  reset(useInboxStore);
  reset(useInboxExtras);
  reset(useActivityExtras);
  reset(useAccountStore);
  reset(useProfilePrefs);
  reset(useCouponStore);
  reset(useModerationStore);
  useSettingsStore.getState().setNotificationPref('promotions', false);
}
