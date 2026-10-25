import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Sohbet" />
      <EmptyState icon="construct-outline" title="Sohbet" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
