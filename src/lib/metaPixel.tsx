import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const initMetaPixel = (pixelId: string) => {
  if (!pixelId || typeof window === 'undefined') return;
  if (window.fbq && window.fbq.initialized) return; // Prevent double init if possible or if already set

  // @ts-ignore
  (function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js'));

  window.fbq('init', pixelId);
  window.fbq.initialized = true;
  window.fbq('track', 'PageView');
};

export const trackMetaEvent = (eventName: string, params?: object) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }
};

export function MetaPixelProvider() {
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const pixelId = snapshot.data().metaPixelId;
        if (pixelId) {
          initMetaPixel(pixelId);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
