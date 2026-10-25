import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Aktivite" />
      <EmptyState icon="construct-outline" title="Aktivite" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
