import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="İlgi alanları" />
      <EmptyState icon="construct-outline" title="İlgi alanları" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
