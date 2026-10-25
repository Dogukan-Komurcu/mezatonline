import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Telefon" />
      <EmptyState icon="construct-outline" title="Telefon" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
