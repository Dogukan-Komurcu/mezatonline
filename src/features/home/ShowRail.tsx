/**
 * Yatay yayın kartı şeridi ("Yaklaşan Yayınlar" vb.). Planlanmış kartlarda hatırlatıcı (🔖) ShowCard içinde.
 */
import { FlatList, StyleSheet, View } from 'react-native';

import { ShowCard } from '@/components/cards/ShowCard';
import { SectionTitle } from '@/features/browse/ui';
import { SCREEN_PADDING } from '@/theme';
import type { Show } from '@/types';

const CARD_W = 148;

export function ShowRail({ title, subtitle, shows, actionLabel, onAction }: { title: string; subtitle?: string; shows: Show[]; actionLabel?: string; onAction?: () => void }) {
  if (!shows.length) return null;
  return (
    <View style={styles.wrap}>
      <SectionTitle title={title} subtitle={subtitle} actionLabel={actionLabel} onAction={onAction} />
      <FlatList
        data={shows}
        keyExtractor={(s) => s.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => <ShowCard show={item} width={CARD_W} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 18 },
  list: { paddingHorizontal: SCREEN_PADDING },
});
