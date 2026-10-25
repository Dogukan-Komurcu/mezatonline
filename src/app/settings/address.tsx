import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Adres" />
      <EmptyState icon="construct-outline" title="Adres" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
