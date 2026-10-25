/**
 * Kullanıcı / satıcı profili (Whatnot S50). `/user/me` ya da kendi kullanıcı adın → kendi profilin.
 * İsteğe bağlı `?tab=shop|shows|reviews|about`.
 */
import { useLocalSearchParams } from 'expo-router';

import { ProfileScreen } from '@/features/profile/ProfileScreen';

const TABS = ['shop', 'shows', 'reviews', 'about'] as const;

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default function UserProfileRoute() {
  const { username, tab } = useLocalSearchParams<{ username: string; tab?: string }>();
  const name = Array.isArray(username) ? username[0] : (username ?? '');
  const initialTab = TABS.find((t) => t === tab);
  return <ProfileScreen key={name} username={safeDecode(name)} initialTab={initialTab} />;
}
