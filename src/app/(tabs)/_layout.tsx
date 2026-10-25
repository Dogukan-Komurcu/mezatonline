import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="sell" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
