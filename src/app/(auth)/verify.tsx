import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Doğrulama" />
      <EmptyState icon="construct-outline" title="Doğrulama" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
