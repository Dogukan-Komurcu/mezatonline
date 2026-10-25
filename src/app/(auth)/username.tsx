import { EmptyState, Header, Screen } from '@/components/ui';

// TODO: Bu ekran uygulama ajanı tarafından yazılacak.
export default function Placeholder() {
  return (
    <Screen>
      <Header title="Kullanıcı adı" />
      <EmptyState icon="construct-outline" title="Kullanıcı adı" message="Bu ekran hazırlanıyor." />
    </Screen>
  );
}
