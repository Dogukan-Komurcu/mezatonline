import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { formatTRY } from '@/lib/format';
import { liveColors } from '@/theme';
import type { ChatMessage } from '@/types';

import { alpha, textShadow } from './styles';

export type ChatRowProps = {
  msg: ChatMessage;
  /** Üstte kalan satırlar için solma (0 = tam görünür) */
  fade: number;
  onUserPress: (msg: ChatMessage) => void;
};

function Badge({ label, tone }: { label: string; tone: 'seller' | 'mod' | 'me' }) {
  return (
    <View style={[styles.badge, tone === 'seller' ? styles.badgeSeller : tone === 'mod' ? styles.badgeMod : styles.badgeMe]}>
      <Text variant="caption" weight="800" color={tone === 'seller' ? liveColors.onPrimary : liveColors.text} style={styles.badgeText}>
        {label}
      </Text>
    </View>
  );
}

function Username({ msg, onPress, color }: { msg: ChatMessage; onPress: () => void; color?: string }) {
  return (
    <Text variant="footnote" weight="800" color={color ?? liveColors.text} onPress={onPress} suppressHighlighting style={textShadow}>
      {msg.username}
    </Text>
  );
}

/** Tek sohbet satırı — türüne göre farklı görünüm (Whatnot sohbet stilleri) */
function ChatRowInner({ msg, fade, onUserPress }: ChatRowProps) {
  const opacity = fade >= 2 ? 1 : fade === 1 ? 0.62 : 0.28;
  const press = () => onUserPress(msg);

  if (msg.type === 'join' || msg.type === 'giveaway_entry' || msg.type === 'follow') {
    const icon = msg.type === 'join' ? '' : msg.type === 'follow' ? '➕ ' : '🎁 ';
    return (
      <View style={[styles.compact, { opacity: opacity * (msg.isMe ? 1 : 0.85) }]}>
        <Text variant="footnote" color={liveColors.textTertiary} style={textShadow} numberOfLines={1}>
          {icon}
          <Text variant="footnote" weight="700" color={liveColors.textSecondary} onPress={press} suppressHighlighting>
            {msg.username}
          </Text>{' '}
          {msg.text}
        </Text>
      </View>
    );
  }

  if (msg.type === 'bid') {
    return (
      <View style={[styles.compact, msg.isMe && styles.mine, { opacity }]}>
        <Avatar uri={msg.avatar} name={msg.username} size={20} />
        <Text variant="footnote" color={liveColors.text} style={[styles.flex, textShadow]} numberOfLines={1}>
          <Text variant="footnote" weight="800" color={liveColors.text} onPress={press} suppressHighlighting>
            {msg.username}
          </Text>{' '}
          <Text variant="footnote" weight="800" color={liveColors.primary}>
            {formatTRY(msg.amount ?? 0)}
          </Text>{' '}
          teklif verdi
        </Text>
      </View>
    );
  }

  if (msg.type === 'won' || msg.type === 'giveaway_won') {
    const title = msg.text.replace(/^(kazandı:|çekilişi kazandı!)\s*/, '').replace(/^🎁\s*/, '');
    return (
      <View style={[styles.highlight, msg.isMe && styles.highlightMine, { opacity }]}>
        <Text style={styles.emoji}>{msg.type === 'won' ? '🎉' : '🎁'}</Text>
        <View style={styles.flex}>
          <Text variant="footnote" color={liveColors.text} numberOfLines={1}>
            <Text variant="footnote" weight="800" color={liveColors.primary} onPress={press} suppressHighlighting>
              {msg.username}
            </Text>
            {msg.type === 'won' ? ' kazandı ' : ' çekilişi kazandı!'}
            {msg.type === 'won' ? (
              <Text variant="footnote" weight="800" color={liveColors.text}>
                {formatTRY(msg.amount ?? 0)}
              </Text>
            ) : null}
          </Text>
          <Text variant="caption" weight="500" color={liveColors.textSecondary} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
    );
  }

  if (msg.type === 'purchase') {
    const title = msg.text.replace(/^satın aldı:\s*/, '');
    return (
      <View style={[styles.compact, msg.isMe && styles.mine, { opacity }]}>
        <Text style={styles.emojiSmall}>🛍️</Text>
        <Text variant="footnote" color={liveColors.text} style={[styles.flex, textShadow]} numberOfLines={2}>
          <Text variant="footnote" weight="800" color={liveColors.text} onPress={press} suppressHighlighting>
            {msg.username}
          </Text>{' '}
          satın aldı · {title}
          {msg.amount ? (
            <Text variant="footnote" weight="800" color={liveColors.primary}>
              {' '}
              {formatTRY(msg.amount)}
            </Text>
          ) : null}
        </Text>
      </View>
    );
  }

  if (msg.type === 'tip') {
    const boost = msg.text.includes('öne çıkardı');
    return (
      <View style={[styles.compact, msg.isMe && styles.mine, { opacity }]}>
        <Text style={styles.emojiSmall}>{boost ? '🚀' : '💛'}</Text>
        <Text variant="footnote" color={liveColors.text} style={[styles.flex, textShadow]} numberOfLines={1}>
          <Text variant="footnote" weight="800" color={liveColors.text} onPress={press} suppressHighlighting>
            {msg.username}
          </Text>
          {boost ? ' yayını öne çıkardı ' : ' bahşiş gönderdi '}
          <Text variant="footnote" weight="800" color={liveColors.success}>
            {formatTRY(msg.amount ?? 0)}!
          </Text>
        </Text>
      </View>
    );
  }

  if (msg.type === 'system') {
    return (
      <View style={[styles.system, { opacity }]}>
        <Text variant="footnote" weight="600" color={liveColors.text} numberOfLines={4} style={styles.flex}>
          {msg.text}
        </Text>
      </View>
    );
  }

  // Normal sohbet
  const question = /\?\s*$/.test(msg.text) && !msg.isSeller;
  return (
    <View style={[styles.chat, msg.isMe && styles.mine, { opacity }]}>
      <Avatar uri={msg.avatar} name={msg.username} size={28} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <Username msg={msg} onPress={press} color={msg.isSeller ? liveColors.primary : liveColors.textSecondary} />
          {msg.isSeller ? <Badge label="Satıcı" tone="seller" /> : null}
          {msg.isMod ? <Badge label="Mod" tone="mod" /> : null}
          {msg.isMe ? <Badge label="Sen" tone="me" /> : null}
        </View>
        <Text variant="callout" weight="600" color={question ? liveColors.primary : liveColors.text} style={textShadow}>
          {msg.text}
        </Text>
      </View>
    </View>
  );
}

export const ChatRow = memo(ChatRowInner);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chat: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 12 },
  mine: { backgroundColor: alpha(liveColors.primary, 0.12) },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 4, borderRadius: 10 },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: alpha(liveColors.primary, 0.16),
    borderWidth: 1,
    borderColor: alpha(liveColors.primary, 0.35),
  },
  highlightMine: { backgroundColor: alpha(liveColors.primary, 0.3), borderColor: liveColors.primary },
  system: { flexDirection: 'row', alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, marginVertical: 2, borderRadius: 10, backgroundColor: liveColors.glass },
  emoji: { fontSize: 18, lineHeight: 22 },
  emojiSmall: { fontSize: 13, lineHeight: 17 },
  badge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  badgeSeller: { backgroundColor: liveColors.primary },
  badgeMod: { backgroundColor: liveColors.glassLight },
  badgeMe: { backgroundColor: alpha(liveColors.primary, 0.3) },
  badgeText: { fontSize: 9, lineHeight: 12 },
});
