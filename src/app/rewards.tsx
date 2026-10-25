import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Ödüller" />
      <EmptyState icon="construct-outline" title="Ödüller" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
