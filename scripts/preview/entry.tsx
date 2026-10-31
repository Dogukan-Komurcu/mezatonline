import { ExpoRoot } from 'expo-router';
// Match Expo's normal entry context so all existing screens are included.
import { ctx } from 'expo-router/_ctx';
import { Head } from 'expo-router/head';

const initialLocation = new URL('https://mezatonline.preview/');

export function App() {
  return (
    <Head.Provider>
      <ExpoRoot context={ctx} location={initialLocation} />
    </Head.Provider>
  );
}
