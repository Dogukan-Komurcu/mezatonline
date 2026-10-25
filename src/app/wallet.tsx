import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Cüzdan" />
      <EmptyState icon="construct-outline" title="Cüzdan" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
