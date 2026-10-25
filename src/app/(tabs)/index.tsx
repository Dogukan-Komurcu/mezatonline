import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Ana Sayfa" />
      <EmptyState icon="construct-outline" title="Ana Sayfa" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
