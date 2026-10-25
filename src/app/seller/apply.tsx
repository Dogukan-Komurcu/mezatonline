import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Satıcı ol" />
      <EmptyState icon="construct-outline" title="Satıcı ol" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
