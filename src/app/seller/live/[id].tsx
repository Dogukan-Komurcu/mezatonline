import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Canlı yayın" />
      <EmptyState icon="construct-outline" title="Canlı yayın" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
