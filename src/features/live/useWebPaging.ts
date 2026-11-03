/**
 * Web'de dikey sayfalayıcı. react-native-web `onMomentumScrollEnd` çağırmaz ve tarayıcı fare sürüklemesini
 * kaydırmaya çevirmez. Bu kanca kaydırma durunca hangi sayfada kalındığını bildirir (dokunmatik, tekerlek,
 * trackpad) ve fareyle sürükleyerek sayfa değiştirmeyi ekler. iOS ve Android'de hiçbir şey yapmaz.
 */
import { useEffect, useRef, type RefObject } from 'react';
import { Platform } from 'react-native';

/** Son kaydırma olayından bu kadar sonra kaydırma durmuş sayılır */
const SCROLL_END_MS = 150;
/** Bir sayfanın tam üstünde sayılan pay: arada kalan konum henüz yerine oturmamıştır */
const AT_PAGE_PX = 4;
const DRAG_START_PX = 8;
/** Sayfa yüksekliğinin bu oranından uzun sürükleme sayfayı değiştirir */
const PAGE_CHANGE_RATIO = 0.12;
const SETTLE_MS = 260;
/** Bunlardan başlayan sürükleme kaydırmaz (basılı tutarak teklif kazara kaymasın) */
const CONTROLS = 'input,textarea,select,a,[role="button"],[role="switch"],[tabindex="0"]';
/** Yayın sayfasını kaplayan arka plan dokunuşu düğme sayılmaz */
const BACKGROUND_RATIO = 0.8;
/** Aradaki boşluk bundan kısaysa tekerlek olayları tek hareket sayılır (trackpad ataleti birkaç sayfa çevirmesin) */
const WHEEL_GESTURE_MS = 250;

/** Sayfanın içindeki kaydırılabilir liste (sohbet) */
function nestedScroller(target: Element, page: HTMLElement): HTMLElement | null {
  for (let el: HTMLElement | null = target as HTMLElement; el && el !== page; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
  }
  return null;
}

/** Liste bu yönde kaydırılabilir mi. Ters çevrili listede (sohbet) ekranda aşağısı scrollTop'ın azaldığı yöndür. */
function canScroll(list: HTMLElement, deltaY: number) {
  const inverted = new DOMMatrix(getComputedStyle(list).transform).d < 0;
  const down = inverted ? deltaY < 0 : deltaY > 0;
  return down ? list.scrollTop + list.clientHeight < list.scrollHeight - 1 : list.scrollTop > 0;
}

export function useWebPaging(scrollRef: RefObject<unknown>, pageH: number, pageCount: number, onPage: (page: number) => void) {
  const latestOnPage = useRef(onPage);
  useEffect(() => {
    latestOnPage.current = onPage;
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || !pageH) return;
    // Web'de ScrollView ref'i kaydırılan DOM düğümünün kendisidir
    const node = scrollRef.current as HTMLElement | null;
    if (!node) return;

    let scrollEnd: ReturnType<typeof setTimeout> | undefined;
    let settle: number | undefined;
    let pointer: number | null = null;
    let startY = 0;
    let startTop = 0;
    let dragging = false;
    let settling = false;
    let lastWheelAt = 0;

    const onScroll = () => {
      clearTimeout(scrollEnd);
      scrollEnd = setTimeout(() => {
        if (dragging || settling) return;
        const page = Math.round(node.scrollTop / pageH);
        if (Math.abs(node.scrollTop - page * pageH) <= AT_PAGE_PX) latestOnPage.current(page);
      }, SCROLL_END_MS);
    };

    const finish = () => {
      settling = false;
      node.style.scrollSnapType = '';
      node.style.userSelect = '';
      onScroll();
    };

    const settleTo = (page: number) => {
      const from = node.scrollTop;
      const top = Math.max(0, Math.min(pageCount - 1, page)) * pageH;
      const startedAt = performance.now();
      settling = true;
      node.style.scrollSnapType = 'none';
      const step = (now: number) => {
        const t = Math.min(1, (now - startedAt) / SETTLE_MS);
        node.scrollTop = from + (top - from) * (1 - (1 - t) ** 3);
        if (t < 1) settle = requestAnimationFrame(step);
        else finish();
      };
      settle = requestAnimationFrame(step);
    };

    // Sohbet tekerleği kendisi tüketir ve sayfaya aktarmaz: en yeni ya da en eski mesajdayken sayfa çevrilir
    const onWheel = (e: WheelEvent) => {
      const list = nestedScroller(e.target as Element, node);
      if (!list) return;
      const newGesture = e.timeStamp - lastWheelAt > WHEEL_GESTURE_MS;
      lastWheelAt = e.timeStamp;
      if (canScroll(list, e.deltaY)) return;
      e.preventDefault();
      e.stopPropagation();
      if (newGesture && !settling && !dragging && e.deltaY !== 0) settleTo(Math.round(node.scrollTop / pageH) + Math.sign(e.deltaY));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || settling) return;
      const control = (e.target as Element).closest<HTMLElement>(CONTROLS);
      if (control && control.offsetHeight < pageH * BACKGROUND_RATIO) return;
      pointer = e.pointerId;
      startY = e.clientY;
      startTop = node.scrollTop;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dy) < DRAG_START_PX) return;
        dragging = true;
        node.setPointerCapture(e.pointerId);
        // Yakalama açıkken tarayıcı konumu sayfaya geri çekmesin, metin seçilmesin
        node.style.scrollSnapType = 'none';
        node.style.userSelect = 'none';
        window.getSelection()?.removeAllRanges();
      }
      node.scrollTop = startTop - dy;
    };

    /** Sürükleme bırakılınca gelen tıklama alttaki düğmeye ya da arka plana dokunuş sayılmasın */
    const swallowClick = (e: MouseEvent) => e.stopPropagation();

    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (!dragging) return;
      dragging = false;
      node.addEventListener('click', swallowClick, { capture: true, once: true });
      setTimeout(() => node.removeEventListener('click', swallowClick, { capture: true }), 0);
      const dy = e.clientY - startY;
      const threshold = pageH * PAGE_CHANGE_RATIO;
      const from = Math.round(startTop / pageH);
      settleTo(dy < -threshold ? from + 1 : dy > threshold ? from - 1 : from);
    };

    const onDragStart = (e: Event) => e.preventDefault();

    node.addEventListener('scroll', onScroll, { passive: true });
    node.addEventListener('wheel', onWheel, { capture: true, passive: false });
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onPointerEnd);
    node.addEventListener('pointercancel', onPointerEnd);
    node.addEventListener('dragstart', onDragStart);
    return () => {
      clearTimeout(scrollEnd);
      if (settle !== undefined) cancelAnimationFrame(settle);
      node.style.scrollSnapType = '';
      node.style.userSelect = '';
      node.removeEventListener('scroll', onScroll);
      node.removeEventListener('wheel', onWheel, { capture: true });
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerEnd);
      node.removeEventListener('pointercancel', onPointerEnd);
      node.removeEventListener('dragstart', onDragStart);
    };
  }, [scrollRef, pageH, pageCount]);
}
