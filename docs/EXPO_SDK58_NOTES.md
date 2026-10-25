# Expo SDK 58 — implementation cheat-sheet (Mezatonline)

Authoritative for this repo. Built 2026-10-26 from `https://docs.expo.dev/versions/v58.0.0/*`, `https://docs.expo.dev/llms.txt`,
the Expo Router 57→58 migration guide, and **the `.d.ts` files in `node_modules`**. Every snippet in this file was
type-checked with this project's `tsc` (TypeScript 6.0.3, `expo/tsconfig.base`, strict) **and** compiled with this project's
`babel-plugin-react-compiler@1.0.0` with zero bailouts. Scratch verification project:
`/private/tmp/claude-501/-Users-dogukan-Desktop-Mezatonline/073d6f33-6029-47e0-8a15-846d0090c446/scratchpad/tscheck`.

Installed versions (from `node_modules/*/package.json`): expo 58.0.19 · @expo/cli 58.1.15 · expo-router 58.0.26 · react-native 0.88.0 ·
react 19.3.0 · reanimated 4.7.1 · worklets 0.13.0 · gesture-handler 3.3.0 · screens 4.30.0 · safe-area-context 5.10.1 · zustand 5.0.16 ·
expo-video/expo-camera 58.0.12 · expo-image 58.0.17 · expo-image-picker 58.0.10 · expo-blur 58.0.5 · expo-linear-gradient 58.0.3 ·
expo-haptics 58.0.7 · @expo/vector-icons 15.1.1 · async-storage 2.2.0 · babel-plugin-react-compiler 1.0.0.

---

## 0. The 25 things most likely to bite you (read this first)

1. **`Tabs` from `'expo-router'` is `@deprecated`** → `import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs'`.
2. **Custom `tabBar` props changed**: `BottomTabBarProps = { state, descriptors, emitter, navigateToTab, insets }`. There is **no `navigation` prop**. Emit `tabPress` via `emitter.emit({ type:'tabPress', target: route.key, canPreventDefault: true })`, then `navigateToTab(route.key)`.
3. **Navigators show only screens declared in the layout** (JS tabs, native tabs, drawer). Declare every tab with `<Tabs.Screen name=… />`.
4. **`href: null` now means `hidden: true`**: if a hidden tab gets focused the navigator **redirects to the first visible tab**. Put non-tab screens (product, live show, checkout…) in the **root Stack**, not inside `(tabs)`.
5. **`NativeTabs` `tabPress` cannot be prevented** (`canPreventDefault: false` in `NativeTabNavigationEventMap`) and the bar cannot render React views → a Whatnot-style center “+” that opens a modal is **only possible with JS tabs + custom `tabBar`**.
6. **`initialRouteName` prop removed** → `export const unstable_settings = { anchor: 'index' }` in that stack's `_layout.tsx`.
7. `Stack.Screen` / `Tabs.Screen` no longer accept `redirect`, `initialParams`, `navigationKey`. Use `<Redirect href>` in the route file / defaults in `useLocalSearchParams`.
8. **`freezeOnBlur` has no effect** → `activityEnabled` (`true` or a number on Stack screens).
9. **iOS 26+ native Stack header is transparent (Liquid Glass) by default** → content goes *under* the header. Add `contentInsetAdjustmentBehavior="automatic"` on the root ScrollView/FlatList, or set `headerTransparent: false`. Do **not** pad with `SafeAreaView` for the header.
10. Prefer `useRouter()` in components; module-level `router` throws before the first router render. `useNavigation()` throws outside a navigator.
11. Nested `navigate('(tabs)', { screen, params })` no longer works → push complete hrefs (`router.push({ pathname: '/listing/[id]', params: { id } })`). Parent params are **not** copied to children.
12. **`npx expo prebuild` now cleans by default** (old `--clean` is the default; use `--no-clean` to keep `ios/`/`android/`).
13. **React Compiler bails out** when you assign to a value returned from a hook: `sharedValue.value = …` in a handler, `player.muted = …` (expo-video) in a handler/effect, `useRef(x).current` read during render. Use `sv.set()/sv.get()`, a module-level helper for player props, `useState(() => new X())[0]`. (Current repo hit: `src/components/ui/Pressable.tsx` lines 21/25 `scale.value = withSpring(...)` → that component is silently NOT compiled.)
14. **RN 0.88 ref types**: `useRef<View>()`, `useRef<TextInput>()`, `useRef<ScrollView>()` **fail to type-check**. Use `ViewInstance`, `TextInputInstance`, `ScrollViewInstance` (exported from `react-native`). `useRef<FlatList<T>>` still works.
15. React 19: pass `ref` as a normal prop (`function TextField({ ref, ...p }: TextInputProps & { ref?: Ref<TextInputInstance> })`). Avoid `forwardRef` typing mismatches.
16. RN core **`SafeAreaView` is deprecated** (warns) → `react-native-safe-area-context`. RN **`ImageBackground` deprecated** → `expo-image` `ImageBackground` or absolute `<Image>`. `Clipboard`, `ProgressBarAndroid`, `PushNotificationIOS`, `InputAccessoryView`, `DrawerLayoutAndroid` also deprecated.
17. **`runOnJS` / `runOnUI` from reanimated are `@deprecated`** → `scheduleOnRN(fn, ...args)` / `scheduleOnUI(worklet, ...args)` from `react-native-worklets`.
18. **Gesture Handler 3 = hook API**: `usePanGesture({ onBegin, onActivate, onUpdate, onDeactivate, onFinalize })` + `<GestureDetector gesture={g}>`. (`onStart/onEnd` names are the *legacy* builder `Gesture.Pan()`, still exported but types are `Legacy*`.) Callbacks run on the UI thread by default.
19. **Expo Router does NOT add `GestureHandlerRootView`** — wrap the root layout yourself (the current root layout already does).
20. **expo-video**: `nativeControls` defaults to **true**, `contentFit` to **'contain'**; there is no `allowsFullscreen` → `fullscreenOptions={{ enable: false }}`. Player property changes don't re-render: read via `useEvent(player, 'playingChange', …)`.
21. **expo-image-picker**: `MediaTypeOptions` is deprecated → `mediaTypes: ['images']`. Result is `{ canceled, assets }` (one “l”).
22. **expo-blur on Android** blurs only when you pass `blurTarget` (ref of a `BlurTargetView`) + `blurMethod="dimezisBlurView"`; otherwise it renders a translucent tint.
23. **`useFocusEffect(cb)` takes exactly one arg** (second param typed `never`). Wrap `cb` in `useCallback` (docs) — fine with React Compiler.
24. **Typed routes**: types live in `.expo/types/router.d.ts` + `expo-env.d.ts`, generated by `npx expo start` (or `npx expo customize tsconfig.json`). **Neither exists in the repo right now**, so `Href` is currently plain `string | { pathname: string; params? }` and route typos are NOT caught.
25. **Reserved route names**: don't create routes named `assets`, `manifest`, `inspector`, `public`, `_expo`, `_flight`, `_sitemap`, `expo-dev-plugins`, `favicon.ico`.

---

## 1. Expo Router (58.0.26)

### 1.1 File conventions (`src/app` is auto-detected — CLI prints “Using src/app as the root directory”)

| Pattern | Meaning |
|---|---|
| `src/app/_layout.tsx` | root navigator (Stack). Rendered first; put providers here. |
| `src/app/(tabs)/_layout.tsx` | route group (no URL segment) hosting the tab navigator; `(tabs)/index.tsx` = `/` |
| `src/app/live/[id].tsx` | dynamic route `/live/123` |
| `src/app/sell/_layout.tsx` + `sell/index.tsx`, `sell/details.tsx` | nested stack (e.g. presented as a modal from root) |
| `src/app/[...rest].tsx` | catch-all |
| `src/app/+not-found.tsx` | unmatched routes |
| `export const unstable_settings = { anchor: 'index' }` | back-target when deep-linking into a stack (replaces `initialRouteName`) |

Keep non-route code (components, stores, mock data) **outside** `src/app`.

### 1.2 Root layout: Stack + every presentation we need (verified)

```tsx
// src/app/_layout.tsx
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
          <Stack.Screen name="(tabs)" />
          {/* full-screen live show, no swipe-to-dismiss */}
          <Stack.Screen name="live/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="listing/[id]" options={{ headerShown: true, title: '', headerTransparent: false, headerBackButtonDisplayMode: 'minimal' }} />
          {/* multi-step "Sat" flow = folder sell/ with its own _layout Stack */}
          <Stack.Screen name="sell" options={{ presentation: 'modal' }} />
          {/* bottom sheets */}
          <Stack.Screen name="checkout" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.5, 1], sheetInitialDetentIndex: 0, sheetGrabberVisible: true, sheetCornerRadius: 24, sheetLargestUndimmedDetentIndex: 'none' }} />
          <Stack.Screen name="bid-sheet" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents' }} />
          {/* overlay that shows the screen below (giveaway / winner popup) */}
          <Stack.Screen name="giveaway" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="settings" activityEnabled={1} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

`presentation` values (type `Exclude<ScreenProps['stackPresentation'],'push'> | 'card'`): `card` (default push) · `modal` (iOS page sheet, swipe down; Android slides over) · `transparentModal` (previous screen stays visible — give the screen a transparent `contentStyle` and draw your own scrim) · `containedModal` · `containedTransparentModal` · `fullScreenModal` (iOS full screen, no swipe dismiss) · `formSheet` (bottom sheet with detents) · `pageSheet`.

Sheet options (only with `presentation: 'formSheet'`):
`sheetAllowedDetents: number[] | 'fitToContents'` (ascending fractions; **Android max 3**; default `[1.0]`) · `sheetInitialDetentIndex: number | 'last'` · `sheetGrabberVisible` (iOS) · `sheetCornerRadius` · `sheetLargestUndimmedDetentIndex: number | 'none' | 'last'` · `sheetExpandsWhenScrolledToEdge` (iOS, default true) · `sheetElevation`/`sheetShouldOverflowTopInset`/`sheetResizeAnimationEnabled` (Android) · `unstable_sheetFooter: () => ReactNode` (Android).
Caveats: with `'fitToContents'` don't use `flex: 1` (give explicit heights); with numeric detents `flex: 1` works. **Android form sheets render no native header and no nested stack** → draw title/close button inside the sheet content.

`animation`: `default | fade | fade_from_bottom | flip | simple_push | slide_from_bottom | slide_from_right | slide_from_left | ios_from_right | ios_from_left | none`. `animationDuration` (iOS) not applied to modal/formSheet/pageSheet.

Header options worth knowing: `headerShown`, `title`, `headerTitle` (string or `(props)=>node`), `headerTransparent: boolean | { ios, android, web }` (default `{ ios: true, android: false, web: false }` on iOS 26 Liquid Glass when no `headerStyle.backgroundColor`/`headerBackground`), `headerStyle: { backgroundColor }`, `headerTintColor`, `headerTitleStyle: { fontFamily, fontSize, fontWeight, color }` (iOS 26 uses system font unless `fontFamily` set), `headerLargeTitleEnabled`, `headerBackButtonDisplayMode: 'default'|'generic'|'minimal'`, `headerBackTitle`, `headerLeft/headerRight: (props)=>node`, `headerBlurEffect` (iOS, needs `headerTransparent`), `headerSearchBarOptions`, `headerUserInterfaceStyle: 'light'|'dark'` (iOS, new in 58), `contentStyle`, `gestureEnabled`, `fullScreenGestureEnabled`, `orientation`, `statusBarStyle`. `enableLegacyHeaderAppearance()` (call at top level of root layout) restores pre-iOS-26 headers — deprecated.

**Hide header**: `screenOptions={{ headerShown: false }}` on the navigator, or per screen `options={{ headerShown: false }}`, or from inside the screen: `<Stack.Screen options={{ headerShown: false }} />`. Composition alternative (alpha): `<Stack.Title>…</Stack.Title>`, `<Stack.Header style={{ backgroundColor }} />`.

### 1.3 Tabs — decision: **JS Tabs + custom `tabBar`** (the repo already does this in `src/components/TabBar.tsx`)

| | `NativeTabs` (`expo-router/native-tabs`) | JS `Tabs` (`expo-router/js-tabs`) |
|---|---|---|
| Rendering | real UITabBar / Material bottom nav, Liquid Glass on iOS 26 | React views, fully custom via `tabBar` |
| Per-item | `Trigger.Icon` (`sf`, `md`, `src`, `xcasset`, `drawable`, `{default, selected}`), `Trigger.Label` (`hidden`), `Trigger.Badge` (text or empty = dot), `Trigger.VectorIcon` | anything (`tabBarIcon`, `tabBarLabel`, `tabBarBadge`, `tabBarBadgeStyle`, `tabBarButton`) |
| Bar styling | `tintColor`, `iconColor`, `labelStyle`, `backgroundColor`, `blurEffect`, `badgeBackgroundColor`, `minimizeBehavior` (iOS 26), `hidden`, `disableTransparentOnScrollEdge`; background props ignored on iOS 26 | any style, blur/gradient background, animations |
| Center “+” that opens a modal | **No** — `tabPress` not preventable; `prominent` trigger only changes looks (iOS 27 + Xcode 27) and is still a real tab | **Yes** |
| Limits | Android max 5 tabs, no tab-bar height measurement, no nested native tabs, FlatList scroll-to-top/minimize unsupported, no dynamic add/remove | none of those |

Verified custom tab bar with badge + center “Sat” button (no dummy tab route; the modal lives at root `src/app/sell/`):

```tsx
// src/app/(tabs)/_layout.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Fragment, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
const ICONS: Record<string, [IoniconName, IoniconName]> = {
  index: ['home-outline', 'home'],
  browse: ['search-outline', 'search'],
  activity: ['notifications-outline', 'notifications'],
  account: ['person-circle-outline', 'person-circle'],
};

function MezatTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const router = useRouter();
  const middle = Math.floor(state.routes.length / 2);
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        const color = focused ? '#FFFFFF' : '#8E8E93';
        const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);
        const [off, on] = ICONS[route.name] ?? ['ellipse-outline', 'ellipse'];
        return (
          <Fragment key={route.key}>
            {index === middle && (
              <Pressable accessibilityRole="button" accessibilityLabel="Sat" style={styles.plus}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/sell'); }}>
                <Ionicons name="add" size={28} color="#000" />
              </Pressable>
            )}
            <Pressable onPress={onPress} style={styles.item}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab" accessibilityState={{ selected: focused }}>
              <Ionicons name={focused ? on : off} size={24} color={color} />
              <Text style={[styles.label, { color }]}>{label}</Text>
              {options.tabBarBadge != null && (
                <View style={styles.badge}><Text style={styles.badgeText}>{options.tabBarBadge}</Text></View>
              )}
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const unread = 3; // read from a zustand store in real code
  return (
    <Tabs tabBar={(props) => <MezatTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#000' } }}>
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="browse" options={{ title: 'Keşfet' }} />
      <Tabs.Screen name="activity" options={{ title: 'Aktivite', tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined }} />
      <Tabs.Screen name="account" options={{ title: 'Hesap' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#222', paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontSize: 10, fontWeight: '600' },
  plus: { width: 52, height: 36, borderRadius: 12, backgroundColor: '#FFE500', alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  badge: { position: 'absolute', top: -2, right: '28%', minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
```

Alternative if you keep a real `(tabs)/sell.tsx` tab (the repo currently has one): intercept it — works with both the default and a custom bar:
```tsx
const router = useRouter();
<Tabs.Screen name="sell" options={{ title: 'Sat' }}
  listeners={{ tabPress: (e) => { e.preventDefault(); router.push('/sell-flow'); } }} />
```
⚠️ Then the modal route must NOT also resolve to `/sell` (a root `sell/` folder and `(tabs)/sell.tsx` would both be `/sell`). Name the modal folder differently (e.g. `src/app/sell-flow/`, or the existing `seller/…`). In a custom bar, the `emitter.emit('tabPress')` call is what fires these listeners.

Default bar options (if not custom): `tabBarActiveTintColor`, `tabBarInactiveTintColor`, `tabBarStyle`, `tabBarBackground: () => <BlurView …/>` (+ `tabBarStyle: { position: 'absolute' }` + `useBottomTabBarHeight()` from `expo-router/js-tabs` for content padding), `tabBarBadge: string|number`, `tabBarBadgeStyle`, `tabBarIcon: ({ focused, color, size }) => node` — note `color` is `ColorValue`; vector icons want `string` → `color={color as string}`. `tabBarHideOnKeyboard`, `tabBarShowLabel`, `tabBarLabelPosition`, `lazy`, `popToTopOnBlur`, `sceneStyle`, `animation: 'none'|'fade'|'shift'`, `hidden`/`href: null`.

Hide the tab bar on a pushed screen: don't — push such screens on the **root** Stack (they cover the tabs). Third option for fully custom layouts: headless `Tabs/TabList/TabTrigger/TabSlot` from `expo-router/ui`.

NativeTabs reference (verified compiles), only if a future design wants the native bar:
```tsx
import { NativeTabs } from 'expo-router/native-tabs';
<NativeTabs tintColor="#FFE500" backgroundColor="#000" minimizeBehavior="onScrollDown">
  <NativeTabs.Trigger name="index">
    <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
    <NativeTabs.Trigger.Label>Ana Sayfa</NativeTabs.Trigger.Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="activity">
    <NativeTabs.Trigger.Icon sf="bell" md="notifications" />
    <NativeTabs.Trigger.Label>Aktivite</NativeTabs.Trigger.Label>
    <NativeTabs.Trigger.Badge>9+</NativeTabs.Trigger.Badge>
  </NativeTabs.Trigger>
</NativeTabs>
```
(`md` icons on Android need `expo-symbols` — installed.)

### 1.4 Navigating, params, Link, Redirect (verified)

```tsx
// src/app/live/[id].tsx
import { Link, Redirect, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function LiveShow() {
  const { id, ref } = useLocalSearchParams<{ id: string; ref?: string }>(); // values are strings (or string[] for catch-alls)
  const router = useRouter();
  useFocusEffect(useCallback(() => { /* join room */ return () => { /* leave room */ }; }, [id]));
  if (!id) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Link href={{ pathname: '/listing/[id]', params: { id: 'abc' } }} asChild>
        <Pressable><Text>Ürün</Text></Pressable>
      </Link>
      <Link href="/sell" push>Sat</Link>
      <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}><Text>Kapat</Text></Pressable>
      <Pressable onPress={() => router.push({ pathname: '/listing/[id]', params: { id: '42' } })}><Text>push</Text></Pressable>
      <Pressable onPress={() => router.dismiss()}><Text>dismiss</Text></Pressable>
      <Pressable onPress={() => router.dismissAll()}><Text>dismissAll</Text></Pressable>
      <Pressable onPress={() => router.dismissTo('/')}><Text>dismissTo</Text></Pressable>
      <Pressable onPress={() => router.setParams({ ref: 'x' })}><Text>setParams</Text></Pressable>
      <Pressable onPress={() => router.navigate('/', { withAnchor: true })}><Text>nav</Text></Pressable>
    </View>
  );
}
```

`ImperativeRouter` (exact type): `back(opts?)`, `canGoBack()`, `push(href, opts?)`, `navigate(href, opts?)`, `replace(href, opts?)`, `dismiss(count?, opts?)`, `dismissTo(href, opts?)`, `dismissAll(opts?)`, `canDismiss()`, `setParams(params)`, `reload()`, `prefetch(href, opts?)`, `setTransitionMode('always'|'never'|'preload-only')`. `NavigationOptions = { relativeToDirectory?, withAnchor?, dangerouslySingular? }`.
`dismiss*` pops screens of the current (modal) stack; to close a modal stack from inside use `router.dismissAll()` or `router.back()`.
`Link` props: `href` (required), `asChild`, `push`, `replace`, `dismissTo`, `prefetch`, `withAnchor`, `relativeToDirectory`, `onPress`, `style`. Also `Link.Preview`/`Link.Menu` (iOS peek) exist.
Other hooks: `usePathname()`, `useSegments()`, `useGlobalSearchParams()`, `useIsFocused()`, `useNavigation()` (navigator-specific APIs only), `useScrollToTop(ref)`, `usePreventRemove(cond, ({ repeat }) => …)`.
Guards: `<Stack.Protected guard={isSignedIn} redirectTo="/sign-in"><Stack.Screen name="account" /></Stack.Protected>`.

### 1.5 Typed routes (`experiments.typedRoutes: true` is on)

- Generated by `npx expo start` (watches file tree) or `npx expo customize tsconfig.json` (one-shot; non-interactive OK). Creates git-ignored `expo-env.d.ts` (`/// <reference types="expo/types" />`) and `.expo/types/router.d.ts`. `tsconfig.json` already includes both paths. **Re-run after adding routes** or `tsc` will reject new hrefs.
- Without them: `Href = string | { pathname: string; params? }` (no checking) **and** imports of `*.css`/`*.module.css` fail `tsc` (that was the scaffold's tsc failure).
- With them (verified): `'/nope'` → error ✅; `{ pathname: '/listing/[id]', params: { id } }` ✅; template strings `` `/listing/${id}` `` ✅; groups optional (`'/browse'` and `'/(tabs)/browse'` both OK). **Not caught**: bare pattern `'/listing/[id]'` and relative `'./details'` are accepted. Escape hatch: `(str as Href)`.
- Typed params: `useLocalSearchParams<'/listing/[id]'>()` or `useLocalSearchParams<{ id: string }>()`.

---

## 2. expo-video (58.0.12)

API: `useVideoPlayer(source: VideoSource, setup?: (player) => void, opts?)` · `createVideoPlayer(...)` · `<VideoView player …/>` · `useEvent` / `useEventListener` from **`'expo'`**.
`VideoSource = string | number | null | { uri, headers, useCaching, contentType: 'auto'|'progressive'|'hls'|'dash'|'smoothStreaming', metadata, drm }`.
Player props: `playing` (ro), `loop`, `muted`, `volume`, `currentTime`, `duration` (ro), `playbackRate`, `status: 'idle'|'loading'|'readyToPlay'|'error'` (ro), `isLive` (ro), `audioMixingMode`, `staysActiveInBackground`, `keepScreenOnWhilePlaying`, `timeUpdateEventInterval`. Methods: `play()`, `pause()`, `replay()`, `seekBy(s)`, `replaceAsync(src)` (prefer over `replace`, which blocks the iOS UI thread and will be deprecated), `generateThumbnailsAsync`.
Events: `statusChange`, `playingChange`, `mutedChange`, `volumeChange`, `timeUpdate`, `playToEnd`, `sourceLoad`, `sourceChange`, `playbackRateChange`…
`VideoView` props: `player`, `nativeControls` (**default true**), `contentFit: 'contain'|'cover'|'fill'` (**default contain**), `contentPosition`, `fullscreenOptions: { enable, orientation, autoExitOnRotate }`, `allowsPictureInPicture`, `startsPictureInPictureAutomatically`, `surfaceType: 'surfaceView'|'textureView'` (Android; `textureView` when videos overlap/are transformed; don't change at runtime), `playsInline`, `onFirstFrameRender`, `useExoShutter`, `requiresLinearPlayback`.

```tsx
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// React Compiler: never assign player props in the component body / handlers / effects directly.
function setPlayerMuted(player: VideoPlayer, muted: boolean) { player.muted = muted; }

export function LiveVideo({ uri, muted, active }: { uri: string; muted: boolean; active: boolean }) {
  const player = useVideoPlayer({ uri, useCaching: false }, (p) => {
    p.loop = true;      // mutation inside the setup callback is fine
    p.muted = true;
    p.play();
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useEventListener(player, 'playToEnd', () => {});
  useEffect(() => { setPlayerMuted(player, muted); }, [player, muted]);
  useEffect(() => { if (active) player.play(); else player.pause(); }, [player, active]);
  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false}
        allowsPictureInPicture={false} fullscreenOptions={{ enable: false }} surfaceType="textureView" />
      <Text>{isPlaying ? 'playing' : 'paused'} {status}</Text>
    </View>
  );
}
```
Vertical live-feed pager: mount players only for the visible ±1 items (`FlatList` `pagingEnabled`, `windowSize={3}`, `onViewableItemsChanged`), pass `active` to play/pause; for HLS on iOS the URI must end in `.m3u8` or set `contentType: 'hls'`; HLS can't be cached on iOS. Config plugin (`app.json`): `["expo-video", { "supportsBackgroundPlayback": false, "supportsPictureInPicture": false }]`.

---

## 3. expo-camera (58.0.12) — “Canlı yayın aç” preview / product photo

Exports: `CameraView` (class component — `useRef<CameraView>(null)`), `useCameraPermissions()`, `useMicrophonePermissions()` → `[PermissionResponse | null, request, get]`, types `CameraType = 'front'|'back'`, `FlashMode = 'off'|'on'|'auto'|'screen'`, `CameraMode = 'picture'|'video'`.
`CameraViewProps`: `facing`, `flash`, `zoom` (0–1), `mode`, `mute`, `mirror`, `autofocus: 'on'|'off'`, `active` (pause preview when screen unfocused), `videoQuality`, `ratio: '4:3'|'16:9'|'1:1'`, `enableTorch`, `animateShutter`, `barcodeScannerSettings`, `onCameraReady`, `onMountError`, `onBarcodeScanned`.
Ref methods: `takePictureAsync({ quality, base64, exif, skipProcessing, shutterSound })`, `recordAsync({ maxDuration, maxFileSize })` (needs `mode="video"` + mic), `stopRecording()`, `pausePreview()`, `resumePreview()`.
Only **one** camera preview may be active — set `active={useIsFocused()}` or unmount when unfocused. Put overlays as absolutely-positioned **siblings** of `CameraView`.

```tsx
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function GoLivePreview() {
  const [facing, setFacing] = useState<CameraType>('front');
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  if (!camPerm || !micPerm) return <View />;
  if (!camPerm.granted) return <Pressable onPress={requestCam}><Text>Kameraya izin ver</Text></Pressable>;
  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="picture" mirror active
        onCameraReady={() => {}} onMountError={(e) => console.warn(e.message)} />
      <Pressable onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}><Text>Çevir</Text></Pressable>
      <Pressable onPress={async () => { const pic = await cameraRef.current?.takePictureAsync({ quality: 0.7 }); console.log(pic?.uri); }}><Text>Foto</Text></Pressable>
    </View>
  );
}
```
Plugin options: `cameraPermission`, `microphonePermission` (iOS strings), `recordAudioAndroid` (default true), `barcodeScannerEnabled` (default true; set false to shrink the app). Real RTMP/WebRTC streaming is out of scope (mock) — the preview is only local.

---

## 4. expo-image (58.0.17)

`import { Image, ImageBackground, useImage } from 'expo-image'`. Props: `source` (uri object / `require` / string / `'sf:…'`), `placeholder` (`{ blurhash }`, `{ thumbhash }`, uri), `placeholderContentFit`, `contentFit: 'cover'|'contain'|'fill'|'none'|'scale-down'`, `contentPosition`, `transition: number | { duration, timing, effect: 'cross-dissolve'|'flip-from-*'|'curl-up'|… }`, `cachePolicy: 'none'|'disk'|'memory'|'memory-disk'`, `recyclingKey` (**set in FlatList cells** to avoid showing the previous image), `priority`, `tintColor`, `blurRadius`, `autoplay` (GIF), `onLoad/onError/onDisplay`. Statics: `Image.prefetch(urls, { cachePolicy })`, `Image.clearMemoryCache()`, `Image.clearDiskCache()`.
```tsx
<Image source={{ uri }} style={{ width: 120, height: 160, borderRadius: 12 }} contentFit="cover"
  transition={{ duration: 200, effect: 'cross-dissolve' }} placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
  placeholderContentFit="cover" recyclingKey={id} cachePolicy="memory-disk" priority="normal" />
```

## 5. expo-linear-gradient · expo-blur · expo-haptics

- `LinearGradient`: `colors` is a **readonly tuple of ≥2** (`readonly [ColorValue, ColorValue, ...ColorValue[]]`) — a plain `string[]` variable won't type-check; declare `as const`. `locations` same tuple shape. `start/end: { x, y }`. `dither` (Android).
- `BlurView`: `intensity` (0–100), `tint` (`light|dark|default|extraLight|regular|prominent|systemUltraThinMaterial…Dark`), `blurReductionFactor`, `blurMethod: 'none'|'dimezisBlurView'|'dimezisBlurViewSdk31Plus'`, `blurTarget`. Android needs `BlurTargetView` + ref. Known issue: render `BlurView` **after** dynamic content (e.g. after the FlatList). Add `overflow: 'hidden'` for rounded corners.
- `expo-haptics`: `impactAsync(ImpactFeedbackStyle.Light|Medium|Heavy|Soft|Rigid)`, `notificationAsync(NotificationFeedbackType.Success|Warning|Error)`, `selectionAsync()`, `performAndroidHapticsAsync(AndroidHaptics.Confirm|Reject|…)`. Use: bid placed → Medium impact; won auction → Success notification; outbid → Warning.

```tsx
import { BlurTargetView, BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';

export function Overlay() {
  const targetRef = useRef<ViewInstance | null>(null);   // NOT useRef<View>
  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>{/* video / content to blur */}</BlurTargetView>
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} locations={[0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill} pointerEvents="none" />
      <BlurView intensity={40} tint="dark" blurTarget={targetRef} blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
        style={{ borderRadius: 16, overflow: 'hidden' }}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}><Text>Teklif ver</Text></Pressable>
      </BlurView>
    </View>
  );
}
```
(`expo-glass-effect` `GlassView`/`GlassContainer`/`isLiquidGlassAvailable()` exist for iOS 26 glass; optional.)

## 6. expo-image-picker (58.0.10)

```tsx
import * as ImagePicker from 'expo-image-picker';
export async function pickListingPhotos(): Promise<string[]> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 8, quality: 0.8, orderedSelection: true });
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri);
}
export async function takeListingPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.8 });
  return res.canceled ? null : res.assets[0].uri;
}
```
Library picking needs no permission prompt on modern iOS/Android (system picker). Other options: `shape` (crop), `videoMaxDuration`, `cameraType`, `exif`, `base64`, `defaultTab`, `presentationStyle`, `legacy` (Android). Hook variants: `ImagePicker.useCameraPermissions()`, `useMediaLibraryPermissions()`. Android may kill the app during camera capture → `getPendingResultAsync()`. Plugin: `photosPermission`, `cameraPermission`, `microphonePermission` (`false` blocks the Android permission).

## 7. @expo/vector-icons 15.1.1

Per-family default imports (no barrel): `import Ionicons from '@expo/vector-icons/Ionicons'`, `import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'`, also `MaterialIcons`, `FontAwesome6`, `Feather`, `AntDesign`, `Entypo`, `Octicons`… Name type: `ComponentProps<typeof Ionicons>['name']`. Props: `name`, `size`, `color: string | OpaqueColorValue` (cast `ColorValue` from tab bar). `Ionicons.glyphMap`, `getImageSource(name, size, color)` (Promise) for image-based APIs. Useful glyphs (Ionicons): `home(-outline)`, `search(-outline)`, `add`, `add-circle`, `notifications(-outline)`, `person-circle(-outline)`, `heart(-outline)`, `share-social-outline`, `chatbubble-ellipses-outline`, `gift-outline`, `flash`, `timer-outline`, `eye-outline`, `bag-handle-outline`, `wallet-outline`, `pricetag-outline`, `storefront-outline`, `videocam`, `camera-reverse-outline`, `close`, `chevron-back`, `ellipsis-horizontal`, `star`, `trophy-outline`, `cube-outline` (kargo), `card-outline`.

## 8. react-native-safe-area-context 5.10.1

Expo Router already renders a `SafeAreaProvider` (inside `ExpoRoot`); adding another is harmless. Exports: `SafeAreaView`, `useSafeAreaInsets()` → `{ top, right, bottom, left }`, `useSafeAreaFrame()`, `SafeAreaInsetsContext`, `initialWindowMetrics`.
`SafeAreaView` props: `edges?: readonly ('top'|'right'|'bottom'|'left')[] | { top?: 'off'|'additive'|'maximum', … }`, `mode?: 'padding' | 'margin'`.
```tsx
<SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#000' }}>{children}</SafeAreaView>
const insets = useSafeAreaInsets(); // e.g. live-show overlay: paddingTop: insets.top + 8
```
Android is edge-to-edge (enforced; template sets `edgeToEdgeEnabled=true`) → you must apply insets on Android too. Custom tab bar: use the `insets` prop it receives. Screens inside JS tabs do not need bottom inset (bar sits below content). On web use CSS `env(safe-area-inset-*)` (SDK 58 guidance).

## 9. Reanimated 4.7 + react-native-worklets 0.13

Babel: `babel-preset-expo` auto-adds `react-native-worklets/plugin` (no `babel.config.js` needed; none exists). Exports confirmed: `useSharedValue`, `useAnimatedStyle`, `useDerivedValue`, `useAnimatedReaction`, `useAnimatedScrollHandler`, `useAnimatedRef`, `withTiming`, `withSpring`, `withDelay`, `withRepeat`, `withSequence`, `withDecay`, `withClamp`, `cancelAnimation`, `interpolate`, `interpolateColor`, `Extrapolation`, `Easing`, `Keyframe`, layout animations (`FadeIn/Out[Up|Down|Left|Right]`, `SlideIn/Out*`, `ZoomIn/Out*`, `BounceIn*`, `FlipIn*`, `LightSpeedIn*`, `PinwheelIn`, `RollIn*`, `RotateIn*`, `StretchIn*`), transitions (`LinearTransition`, `FadingTransition`, `SequencedTransition`, `JumpingTransition`, `CurvedTransition`, `EntryExitTransition`), spring presets `GentleSpringConfig`, `SnappySpringConfig`, `WigglySpringConfig`, CSS animations/transitions API (`export * from './css'`). `runOnJS`/`runOnUI` = deprecated → `scheduleOnRN`/`scheduleOnUI` from `react-native-worklets`. Shared values have `.get()` / `.set(v | fn)` — **use these outside worklets** (React Compiler safe).

```tsx
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, SlideInDown, SlideOutDown, ZoomIn, Easing, cancelAnimation,
  interpolate, Extrapolation, useAnimatedStyle, useSharedValue, useDerivedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const pulse = useSharedValue(0);
const startPulse = () => { pulse.set(withRepeat(withSequence(withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 600 })), -1, false)); };
const stopPulse = () => { cancelAnimation(pulse); pulse.set(0); };
const k = useDerivedValue(() => interpolate(pulse.get(), [0, 1], [1, 1.08], Extrapolation.CLAMP));
const style = useAnimatedStyle(() => ({ transform: [{ scale: k.get() }] }));
<Animated.View style={style} entering={FadeInDown.duration(250)} exiting={FadeOut} layout={LinearTransition.springify()} />
<Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(200)} />   // bid toast / sheet
<Animated.Text entering={ZoomIn.delay(100)}>SATILDI!</Animated.Text>
// call JS from a worklet:
scheduleOnRN(onWin, winnerId);
```
Countdown timers: drive the *visual* bar with `withTiming(0, { duration: msLeft, easing: Easing.linear })`; keep the authoritative end time (`endsAt` ms) in the store and compute seconds with a `setInterval` + `useState(Date.now())` (verified compiler-safe).

## 10. Gesture Handler 3.3

Root: `<GestureHandlerRootView style={{ flex: 1 }}>` around the root Stack (and inside RN `<Modal>` content on Android). v3 exports: `GestureDetector`, `usePanGesture`, `useTapGesture`, `useLongPressGesture`, `useFlingGesture`, `usePinchGesture`, `useRotationGesture`, `useHoverGesture`, `useManualGesture`, `useNativeGesture`, composition `useSimultaneousGestures(...g)`, `useExclusiveGestures(...g)`, `useCompetingGestures(...g)`, components `Pressable`, `FlatList`, `ScrollView`, `TextInput`, `Switch`, `RectButton`, `BorderlessButton`, `Touchable`. Legacy builder `Gesture.Pan()…` still exported (types `LegacyPanGesture` etc.) — don't use in new code.
Config callbacks: `onBegin`, `onActivate`, `onUpdate`, `onDeactivate(e)` (`e.canceled`), `onFinalize`, `onTouchesDown/Move/Up/Cancel`; common config `enabled`, `runOnJS` (default false → UI thread), `disableReanimated`, `hitSlop`, `shouldCancelWhenOutside`, `manualActivation`. Pan: `activeOffsetX/Y`, `failOffsetX/Y`, `minDistance`, `minVelocity`; event fields `translationX/Y`, `velocityX/Y`, `changeX/Y`, `x/y`, `absoluteX/Y`. Tap: `numberOfTaps`, `maxDuration`, `maxDelay`, `maxDistance`. LongPress: `minDuration`. Inline callbacks are auto-workletized (callbacks defined elsewhere / in `useCallback` need `'worklet'`). Config values may be SharedValues.

```tsx
import { GestureDetector, useLongPressGesture, usePanGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export function BidButton({ onBid, onSwipeUp }: { onBid: () => void; onSwipeUp: () => void }) {
  const scale = useSharedValue(1);
  const y = useSharedValue(0);
  const tap = useTapGesture({
    onBegin: () => { scale.set(withSpring(0.92)); },
    onActivate: () => { scheduleOnRN(onBid); },
    onFinalize: () => { scale.set(withSpring(1)); },
  });
  const pan = usePanGesture({
    activeOffsetY: [-10, 10],
    onUpdate: (e) => { y.set(Math.min(0, e.translationY)); },
    onDeactivate: (e) => { if (e.translationY < -80) scheduleOnRN(onSwipeUp); y.set(withSpring(0)); },
  });
  const both = useSimultaneousGestures(tap, pan);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }, { scale: scale.get() }] }));
  return <GestureDetector gesture={both}><Animated.View style={style}>{/* "Teklif Ver ₺120" */}</Animated.View></GestureDetector>;
}
// double-tap to like:
const dbl = useTapGesture({ numberOfTaps: 2, onActivate: () => { scheduleOnRN(onLike); } });
```
"Swipe to bid" (Whatnot slider): `usePanGesture` on the knob with `activeOffsetX`, clamp `translationX` to `[0, trackW - knobW]`, on `onDeactivate` if `> 0.85 * max` → `scheduleOnRN(placeBid)` + haptic, else spring back.

## 11. React Native 0.88 specifics

- Types come from `react-native/types_generated` (strict). Deep imports `react-native/Libraries/*` are **untyped** (`types: null`) — don't use them.
- Ref/instance types: `ViewInstance`, `TextInputInstance`, `ScrollViewInstance`, `TextInstance`, `PressableInstance`, `ImageInstance`, `FlatListInstance` (non-generic), `HostInstance`. Verified: `useRef<TextInputInstance>(null)` ✅, `useRef<TextInput>(null)` ❌, `useRef<View>` ❌, `useRef<ScrollView>` ❌, `useRef<FlatList<Item>>(null)` ✅ (+ `useScrollToTop(listRef)` ✅).
- React 19 ref-as-prop (verified):
```tsx
import type { Ref } from 'react';
import { TextInput, type TextInputInstance, type TextInputProps } from 'react-native';
export function TextField({ ref, style, ...rest }: TextInputProps & { ref?: Ref<TextInputInstance> }) {
  return <TextInput ref={ref} style={[{ color: '#fff' }, style]} placeholderTextColor="#777" {...rest} />;
}
```
- Fine to use: `Pressable`, `FlatList` (`pagingEnabled`, `viewabilityConfig`, `onViewableItemsChanged`, `windowSize`, `removeClippedSubviews`, `contentInsetAdjustmentBehavior="automatic"`), `SectionList`, `ScrollView`, `Modal`, `KeyboardAvoidingView` (`behavior={Platform.OS === 'ios' ? 'padding' : undefined}` per Expo guide), `Animated`, `Keyboard`, `Share`, `Alert`, `Linking`, `PlatformColor`, `DynamicColorIOS`, `StatusBar` (prefer `expo-status-bar` `<StatusBar style="light" />`).
- Deprecated (warn at runtime): `SafeAreaView`, `ImageBackground`, `Clipboard` (use `expo-clipboard`), `ProgressBarAndroid`, `PushNotificationIOS`, `InputAccessoryView`, `DrawerLayoutAndroid`, `UTFSequence`.
- RN `Animated.Value` in a component: `const [v] = useState(() => new Animated.Value(0))` — `useRef(new Animated.Value(0)).current` makes the compiler bail out.
- New Architecture only; Hermes; Android `softwareKeyboardLayoutMode` default `resize` (set `"pan"` if the tab bar jumps above the keyboard, or `tabBarHideOnKeyboard: true`).

## 12. Zustand 5 + persist (AsyncStorage 2.2)

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

type CartItem = { id: string; title: string; priceTRY: number; qty: number };
type CartState = { items: CartItem[]; hasHydrated: boolean; add: (i: CartItem) => void; remove: (id: string) => void; clear: () => void };

export const useCart = create<CartState>()(            // note the curried create<T>()(...)
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      add: (item) => set((s) => ({ items: [...s.items.filter((i) => i.id !== item.id), item] })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'mezat-cart-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,                                   // bump + migrate(persisted, version) when shape changes
      partialize: (s) => ({ items: s.items }),      // never persist functions/derived/hydration flags
      onRehydrateStorage: () => () => { useCart.setState({ hasHydrated: true }); },
    },
  ),
);
// selecting several fields → useShallow, otherwise a new object each render = infinite re-render warning
export const useCartSummary = () => useCart(useShallow((s) => ({ count: s.items.length, total: s.items.reduce((t, i) => t + i.priceTRY * i.qty, 0) })));
export const isCartHydrated = () => useCart.persist.hasHydrated();
```
`persist` API on the hook: `.persist.hasHydrated()`, `.onHydrate(fn)`, `.onFinishHydration(fn)` (returns unsubscribe), `.rehydrate()`, `.clearStorage()`, `.setOptions()`, `.getOptions()`. Options: `name`, `storage`, `partialize`, `version`, `migrate`, `merge`, `skipHydration`, `onRehydrateStorage`. AsyncStorage is async → first render shows defaults; gate the UI (root layout already does with `useHydrated()`). Never mutate selected state (`items.push`) — always return new arrays/objects from `set`. Money: store integer kuruş or TRY numbers; format with `new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })` (Hermes supports Intl).

## 13. React Compiler (enabled: `experiments.reactCompiler: true`; plugin auto-configured by `babel-preset-expo`, target 19)

The compiler **silently skips** (does not fail the build — `panicThreshold: 'NONE'` in prod) any component that breaks the rules; it can also change runtime behavior of code that mutates memoized values. Results of running `babel-plugin-react-compiler@1.0.0` on probes:

| Pattern | Result | Fix |
|---|---|---|
| `onPress={() => { sv.value = withSpring(1) }}` | ❌ bail-out “This value cannot be modified” | `sv.set(withSpring(1))`, read with `sv.get()` |
| `sv.value = …` inside `usePanGesture`/`useAnimatedStyle` worklets | ✅ ok (still prefer `.set/.get`) | — |
| `player.muted = x` in handler or `useEffect` | ❌ “Modifying a value returned from a hook” | module-level `setPlayerMuted(player, x)` helper, or setup callback |
| `player.play()/pause()` calls | ✅ | — |
| `ref.current` read/write during render; `useRef(new X()).current` | ❌ “Cannot access refs during render” | `useState(() => new X())[0]`; touch refs only in effects/handlers |
| mutating props (`item.title = …`) | ❌ | copy to a local |
| hook after early `return` / conditional hook | ❌ | hooks first, then early returns |
| `setState` in effect, `setInterval` + `Date.now()` in state updater, `useShallow` selectors, camera ref in handler | ✅ | — |

Also: don't mutate objects you got from zustand selectors/props/context; don't create components inside components; keep `useCallback/useMemo` only where an API needs referential stability (e.g. `useFocusEffect`). Opt a file/function out with `'use no memo'` as the first statement. `npx expo lint` (eslint-config-expo) includes the compiler rules in SDK 55+. **Current repo violation**: `src/components/ui/Pressable.tsx` (`scale.value = …` at lines 21 and 25).

---

## 14. Building for a physical phone

### 14.1 This Mac (checked 2026-10-26)

- Xcode 26.2 (17C52); CocoaPods 1.17.0; Node 26.5.0; `npx eas-cli` 25.3.0 available; Expo CLI 58.1.15.
- Code-signing identities (both team **4N6B7MPCY3**, i.e. a paid Apple Developer team): `Apple Development: dogukankomurcu46@icloud.com (895Z9ASW2D)` (cert subject OU=4N6B7MPCY3) and `Apple Distribution: dogukan komurcu (4N6B7MPCY3)` (expires 2027-08-13). 30 Xcode-managed provisioning profiles present.
- Paired device: **“Dogukan” — iPhone 15 Pro (iPhone16,1)**, CoreDevice id `F133A79F-3B4D-5F79-8A01-A966496A2035`, state `unavailable` at check time (connect via USB/same Wi-Fi, unlock, Trust; iOS: Settings → Privacy & Security → **Developer Mode** on).
- Java: `JAVA_HOME=/opt/homebrew/opt/openjdk@21/...` (JDK 21; Gradle 9.4.1 / AGP 9.2.1 OK). Android SDK at `~/Library/Android/sdk` but **`ANDROID_HOME` is not set and `adb` is not on PATH** → `export ANDROID_HOME=$HOME/Library/Android/sdk; export PATH="$ANDROID_HOME/platform-tools:$PATH"`.
- RN 0.88 needs **compileSdk 37, build-tools 37.0.0, NDK 27.1.12297006** (from `react-native/gradle/libs.versions.toml` + `ExpoRootProjectPlugin.kt`). Installed: platforms 33–36, build-tools 35/36/36.1, NDK 27.1.12297006 ✅. Platform 37 + build-tools 37.0.0 are missing → Gradle auto-downloads them if licenses are accepted (they are), or install: `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platforms;android-37" "build-tools;37.0.0"`.

### 14.2 app.json (verified by a scratch `npx expo prebuild --no-install`)

Current `app.json` still says `mezat-scaffold`. Proposed (prebuild produced `PRODUCT_BUNDLE_IDENTIFIER = com.mezatonline.app`, `DEVELOPMENT_TEAM = 4N6B7MPCY3`, Turkish usage strings in Info.plist, `ITSAppUsesNonExemptEncryption=false`, Android `applicationId 'com.mezatonline.app'`, CAMERA/RECORD_AUDIO granted and storage/overlay permissions `tools:node="remove"`; iOS deployment target 16.4 default):

```json
{
  "expo": {
    "name": "Mezatonline",
    "slug": "mezatonline",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "mezatonline",
    "userInterfaceStyle": "dark",
    "backgroundColor": "#000000",
    "ios": {
      "bundleIdentifier": "com.mezatonline.app",
      "buildNumber": "1",
      "supportsTablet": false,
      "icon": "./assets/expo.icon",
      "config": { "usesNonExemptEncryption": false },
      "infoPlist": { "CFBundleDevelopmentRegion": "tr", "CFBundleAllowMixedLocalizations": true }
    },
    "android": {
      "package": "com.mezatonline.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "backgroundColor": "#000000",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "permissions": ["android.permission.CAMERA", "android.permission.RECORD_AUDIO"],
      "blockedPermissions": ["android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.SYSTEM_ALERT_WINDOW"],
      "softwareKeyboardLayoutMode": "resize",
      "predictiveBackGestureEnabled": false
    },
    "web": { "output": "static", "favicon": "./assets/images/favicon.png" },
    "plugins": [
      "expo-router",
      ["expo-splash-screen", { "backgroundColor": "#000000", "image": "./assets/images/splash-icon.png", "imageWidth": 120 }],
      ["expo-camera", {
        "cameraPermission": "Canlı yayın açmak ve ürün fotoğrafı çekmek için $(PRODUCT_NAME) kameranıza erişmek istiyor.",
        "microphonePermission": "Canlı yayında sesinizin duyulması için $(PRODUCT_NAME) mikrofonunuza erişmek istiyor.",
        "recordAudioAndroid": true,
        "barcodeScannerEnabled": false
      }],
      ["expo-image-picker", {
        "photosPermission": "Satacağınız ürünlerin fotoğraflarını seçmek için $(PRODUCT_NAME) fotoğraflarınıza erişmek istiyor.",
        "cameraPermission": "Canlı yayın açmak ve ürün fotoğrafı çekmek için $(PRODUCT_NAME) kameranıza erişmek istiyor.",
        "microphonePermission": "Canlı yayında sesinizin duyulması için $(PRODUCT_NAME) mikrofonunuza erişmek istiyor."
      }],
      ["expo-video", { "supportsBackgroundPlayback": false, "supportsPictureInPicture": false }],
      "expo-sharing"
    ],
    "experiments": { "typedRoutes": true, "reactCompiler": true }
  }
}
```
Notes: give expo-camera and expo-image-picker the **same** camera/mic strings (both plugins write the same Info.plist keys). `ios.appleTeamId: "4N6B7MPCY3"` is a valid field (writes `DEVELOPMENT_TEAM`), but see the signing caveat below before adding it. If `com.mezatonline.app` is taken on Apple's side, use e.g. `com.dogukankomurcu.mezatonline`. `web.output: "server"` (current) now means per-request SSR in SDK 58 — irrelevant for native; `"static"` is the simpler choice. There is no `newArchEnabled`/`edgeToEdgeEnabled` key any more (always on). Changing `app.json`/plugins requires a new native build (`prebuild` + `run:*`), not just Metro reload.

### 14.3 iOS — local Release build on the iPhone (no EAS)

CLI flags verified with `npx expo run:ios --help`: `--configuration Debug|Release`, `-d, --device [name|UDID|"generic"]`, `--scheme`, `--no-bundler`, `--no-install`, `--no-build-cache`, `--binary <.app|.ipa>`, `-o, --output <dir>`, `-p, --port`.

```bash
cd /Users/dogukan/Desktop/Mezatonline
npx expo prebuild --platform ios            # regenerates ios/ (clean by default in SDK 58; --no-clean to keep)
npx expo run:ios --device "Dogukan" --configuration Release --no-bundler
# omit the device name to get an interactive device picker; Release embeds the JS bundle (no Metro needed)
```
Signing behaviour (read from `@expo/cli/build/src/run/ios/codeSigning/*`):
- If the Xcode project has **no** `DEVELOPMENT_TEAM`, the CLI picks/prompts a signing identity (“Development team for signing the app”; choose `dogukan komurcu (4N6B7MPCY3) - Apple Development: …`; non-interactive picks the first identity), writes the team into the pbxproj, **saves `ios.appleTeamId` into app.json**, and passes `-allowProvisioningUpdates -allowProvisioningDeviceRegistration` to xcodebuild (creates the profile and registers the iPhone automatically).
- If `DEVELOPMENT_TEAM` is already set (e.g. you put `ios.appleTeamId` in app.json before prebuild), the CLI prints “Auto signing app using team(s): 4N6B7MPCY3” and does **not** pass those flags → a brand-new bundle id can fail with “No profiles for 'com.mezatonline.app' were found”. Fix once by opening Xcode (`xed ios` → target → Signing & Capabilities → “Automatically manage signing”, Team 4N6B7MPCY3, build once to the phone), or run xcodebuild yourself with `-allowProvisioningUpdates -allowProvisioningDeviceRegistration DEVELOPMENT_TEAM=4N6B7MPCY3`.
- Xcode must be signed in to the Apple ID of team 4N6B7MPCY3 (Xcode → Settings → Accounts) for automatic provisioning.
- Debug alternative (live reload): `npx expo run:ios --device "Dogukan"` then `npx expo start` on later JS-only changes (phone and Mac on the same network). `expo-dev-client` is **not** installed, so this is a plain debug build (no dev-launcher UI).
- First launch of a development-signed app may need Settings → General → VPN & Device Management → trust the developer.

### 14.4 Android — release APK to the phone

`npx expo run:android --help`: `--variant <name>` (default `debug`; also `release`, `debugOptimized`), `-d, --device [device]`, `--app-id`, `--binary <.apk|.aab>`, `--no-bundler`, `--no-install`, `--no-build-cache`, `-p, --port`.
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH="$ANDROID_HOME/platform-tools:$PATH"
cd /Users/dogukan/Desktop/Mezatonline
npx expo prebuild --platform android
npx expo run:android --variant release --device        # USB debugging on; picks the connected phone
# or build the APK only and side-load it:
cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/release/app-release.apk
```
The SDK 58 template signs `release` with the **debug keystore** (`signingConfig signingConfigs.debug`), so the APK installs on any phone but cannot be uploaded to Play. R8 minify is ON in release (`android.enableMinifyInReleaseBuilds=true`). For a Play upload key see `https://docs.expo.dev/guides/local-app-production.md` (keytool → `android/gradle.properties` `MYAPP_UPLOAD_*` → `./gradlew app:bundleRelease`; never commit the keystore). Never hand-edit `android/`/`ios/` permanently — they are regenerated (git-ignored); configure via app.json/config plugins.

### 14.5 EAS (cloud or `--local`)

Requires `npx eas-cli@latest login` + `npx eas-cli@latest init` (adds `extra.eas.projectId`/`owner` to app config). Proposed `eas.json`:
```json
{
  "cli": { "version": ">= 25.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": {
      "distribution": "internal",
      "ios": { "resourceClass": "medium" },
      "android": { "buildType": "apk" }
    },
    "production": { "autoIncrement": true }
  },
  "submit": { "production": {} }
}
```
- `preview`: iOS = ad hoc (register the phone first: `npx eas-cli@latest device:create`, then build interactively so EAS refreshes the profile; `--refresh-ad-hoc-provisioning-profile` with `--non-interactive`), Android = installable `.apk`.
- `development` needs `npx expo install expo-dev-client` first (not installed now).
- `production`: `.aab` / App Store build; `autoIncrement` bumps `versionCode`/`buildNumber` on EAS servers (`appVersionSource: remote`).
- Commands: `npx eas-cli@latest build -p ios --profile preview`, `npx eas-cli@latest build -p android --profile preview`, local runner `--local [--output ./build/app.ipa]` (experimental; needs Xcode/fastlane/CocoaPods or Android SDK locally), `npx eas-cli@latest build:run -p android --latest`.
- Precompiled Expo modules are on by default (iOS SDK 56+, Android 53+) → faster local builds; disable with `EXPO_USE_PRECOMPILED_MODULES=0` if a native module misbehaves.

---

## 15. Health checks run for this file (project not modified)

| When (+03) | Command | Result |
|---|---|---|
| 2026-10-26 ~00:45 (pristine scaffold) | `npx tsc --noEmit` | **exit 2**, 3 errors: `animated-icon.web.tsx` cannot find `./animated-icon.module.css`; `constants/theme.ts` side-effect import `@/global.css`; `app-tabs.web.tsx` Pressable `ref` type (`ReactNativeElement`) mismatch. First two are caused by the missing generated `expo-env.d.ts` (fixed by `npx expo start`/`npx expo customize tsconfig.json`). |
| 2026-10-26 ~00:45 | `npx expo-doctor` (1.21.5) | **20/20 checks passed. No issues detected!** (exit 0) |
| 2026-10-26 01:06 (after other agents rewrote `src/`, 104 files) | `npx tsc --noEmit` | **exit 0, no errors** |
| 2026-10-26 01:07 | `npx expo-doctor` | **20/20 checks passed** (exit 0) |
| 2026-10-26 01:07 | React Compiler scan of every `src/**/*.tsx` (babel-plugin-react-compiler 1.0.0, logger) | 1 bail-out: `src/components/ui/Pressable.tsx` — `scale.value = withSpring(...)` (lines 21, 25) → switch to `scale.set(withSpring(...))`. |

Re-run before declaring work done: `npx tsc --noEmit && npx expo-doctor && npx expo lint`.
