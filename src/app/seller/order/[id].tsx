import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Sipariş" />
      <EmptyState icon="construct-outline" title="Sipariş" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
