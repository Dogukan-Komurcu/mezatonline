import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Yayın planla" />
      <EmptyState icon="construct-outline" title="Yayın planla" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
