import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

/**
 * Meta Pixel Tracking Utility
 * Production-ready modular events and deduplication support
 */

// Generate a unique ID for event deduplication
const generateEventId = () => {
  return 'event_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
};

/**
 * Track a standard or custom Meta Pixel event
 * @param eventName Name of the event (e.g., 'AddToCart', 'Purchase')
 * @param params Additional event data
 */
export const trackMetaEvent = (eventName: string, params: object = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    const eventId = generateEventId();
    const trackingParams = {
      ...params,
      event_id: eventId // Required if combining browser and server events (CAPI)
    };

    if (process.env.NODE_ENV !== 'production') {
      console.info(`[Meta Pixel] Event: ${eventName}`, trackingParams);
    }

    try {
      window.fbq('track', eventName, trackingParams);
    } catch (err) {
      console.error('[Meta Pixel] Tracking error:', err);
    }
  }
};

/**
 * Initialize Pixel script and setup PageView tracking
 */
export const initMetaPixel = (pixelId: string) => {
  if (!pixelId || typeof window === 'undefined') return;

  // Check if pixel is already loaded by index.html or previous call
  if (window.fbq && window.fbq.loaded) {
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    return;
  }

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
  window.fbq('track', 'PageView');
};

/**
 * Provider component to handle real-time configuration from Firestore
 */
export function MetaPixelProvider() {
  const [pixelId, setPixelId] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const id = snapshot.data().metaPixelId;
        if (id) {
          setPixelId(id);
          initMetaPixel(id);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (!pixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
