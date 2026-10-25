import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Mesajlar" />
      <EmptyState icon="construct-outline" title="Mesajlar" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
