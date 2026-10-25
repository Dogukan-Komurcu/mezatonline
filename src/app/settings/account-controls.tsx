import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Hesap kontrolleri" />
      <EmptyState icon="construct-outline" title="Hesap kontrolleri" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
