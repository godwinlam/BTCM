import { useWindowDimensions, Platform } from 'react-native';

/**
 * Robust responsive hook to detect mobile screens.
 * Incorporates window width, User-Agent, coarse touch pointer, and CSS media queries
 * to prevent mobile Safari/Chrome from accidentally falling back to desktop viewports.
 */
export function useIsMobile(breakpoint: number = 880): boolean {
  const { width } = useWindowDimensions();

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua);
    const isCoarsePointer = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const isNarrowMedia = Boolean(window.matchMedia && window.matchMedia(`(max-width: ${breakpoint}px)`).matches);
    const currentInnerWidth = window.innerWidth || width;

    // Mobile user agent with smartphone/tablet portrait dimensions
    if (isMobileUA && currentInnerWidth <= 1024) {
      return true;
    }

    // Media query or inner width below mobile breakpoint
    if (isNarrowMedia || currentInnerWidth < breakpoint) {
      return true;
    }

    // Touch device with narrow/medium viewport
    if (isCoarsePointer && currentInnerWidth < breakpoint) {
      return true;
    }
  }

  return width < breakpoint;
}

export default useIsMobile;

