import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Envanter" />
      <EmptyState icon="construct-outline" title="Envanter" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
