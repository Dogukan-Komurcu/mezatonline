import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Profil" />
      <EmptyState icon="construct-outline" title="Profil" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
