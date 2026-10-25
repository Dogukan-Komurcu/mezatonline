import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Ödeme" />
      <EmptyState icon="construct-outline" title="Ödeme" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
