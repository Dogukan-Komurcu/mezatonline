import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Ara" />
      <EmptyState icon="construct-outline" title="Ara" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
