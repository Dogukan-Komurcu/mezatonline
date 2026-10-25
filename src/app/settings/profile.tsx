import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Profili düzenle" />
      <EmptyState icon="construct-outline" title="Profili düzenle" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
