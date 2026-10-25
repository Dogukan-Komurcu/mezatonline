import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Ödeme yöntemleri" />
      <EmptyState icon="construct-outline" title="Ödeme yöntemleri" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
