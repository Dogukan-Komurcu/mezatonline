import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Yardım" />
      <EmptyState icon="construct-outline" title="Yardım" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
