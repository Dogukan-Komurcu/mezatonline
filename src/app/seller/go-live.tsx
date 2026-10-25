import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Canlıya geç" />
      <EmptyState icon="construct-outline" title="Canlıya geç" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
