import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Ürün ekle" />
      <EmptyState icon="construct-outline" title="Ürün ekle" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
