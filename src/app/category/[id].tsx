import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Kategori" />
      <EmptyState icon="construct-outline" title="Kategori" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
