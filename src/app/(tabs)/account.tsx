import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Hesap" />
      <EmptyState icon="construct-outline" title="Hesap" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
