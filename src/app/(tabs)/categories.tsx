import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Kategoriler" />
      <EmptyState icon="construct-outline" title="Kategoriler" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
