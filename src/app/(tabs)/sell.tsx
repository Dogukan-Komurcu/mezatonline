import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Sat" />
      <EmptyState icon="construct-outline" title="Sat" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
