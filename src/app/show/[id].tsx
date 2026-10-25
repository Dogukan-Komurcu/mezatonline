import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Yayın" />
      <EmptyState icon="construct-outline" title="Yayın" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
