import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="İstatistikler" />
      <EmptyState icon="construct-outline" title="İstatistikler" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
