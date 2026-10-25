import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Yasal" />
      <EmptyState icon="construct-outline" title="Yasal" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
