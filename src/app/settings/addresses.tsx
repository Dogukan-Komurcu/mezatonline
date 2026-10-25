import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Adreslerim" />
      <EmptyState icon="construct-outline" title="Adreslerim" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
