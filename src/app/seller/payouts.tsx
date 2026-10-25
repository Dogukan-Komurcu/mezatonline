import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Ödemeler" />
      <EmptyState icon="construct-outline" title="Ödemeler" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
