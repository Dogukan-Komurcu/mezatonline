import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Tercihler" />
      <EmptyState icon="construct-outline" title="Tercihler" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
