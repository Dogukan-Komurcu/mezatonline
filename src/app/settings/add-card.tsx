import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Kart ekle" />
      <EmptyState icon="construct-outline" title="Kart ekle" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
