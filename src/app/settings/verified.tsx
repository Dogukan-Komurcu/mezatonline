import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Doğrulanmış alıcı" />
      <EmptyState icon="construct-outline" title="Doğrulanmış alıcı" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
