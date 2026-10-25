import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Değerlendir" />
      <EmptyState icon="construct-outline" title="Değerlendir" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
