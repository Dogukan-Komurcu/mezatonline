import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Hoş geldin" />
      <EmptyState icon="construct-outline" title="Hoş geldin" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
