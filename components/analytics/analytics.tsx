import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

/**
 * All analytics are environment-driven and disabled when their ID is unset:
 *   NEXT_PUBLIC_GTM_ID          Google Tag Manager container (GTM-XXXXXXX)
 *   NEXT_PUBLIC_GA4_ID          GA4 measurement ID (G-XXXXXXXXXX) — loaded directly
 *                               only when no GTM container is configured
 *   NEXT_PUBLIC_META_PIXEL_ID   Meta Pixel ID
 *   NEXT_PUBLIC_VERCEL_ANALYTICS=true   Vercel Web Analytics
 * Nothing loads in development unless NEXT_PUBLIC_ANALYTICS_IN_DEV=true.
 */

const ID_PATTERNS = {
  gtm: /^GTM-[A-Z0-9]+$/,
  ga4: /^G-[A-Z0-9]+$/,
  pixel: /^\d{6,20}$/,
};

function configuredId(value: string | undefined, pattern: RegExp) {
  const id = value?.trim();
  return id && pattern.test(id) ? id : null;
}

export function Analytics() {
  const enabled = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ANALYTICS_IN_DEV === "true";
  if (!enabled) return null;

  const gtmId = configuredId(process.env.NEXT_PUBLIC_GTM_ID, ID_PATTERNS.gtm);
  const ga4Id = gtmId ? null : configuredId(process.env.NEXT_PUBLIC_GA4_ID, ID_PATTERNS.ga4);
  const pixelId = configuredId(process.env.NEXT_PUBLIC_META_PIXEL_ID, ID_PATTERNS.pixel);
  const vercel = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true";

  return (
    <>
      {gtmId && (
        <Script id="miti-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}
      {ga4Id && (
        <>
          <Script id="miti-ga4-loader" src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="miti-ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`}
          </Script>
        </>
      )}
      {pixelId && (
        <Script id="miti-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      )}
      {vercel && <VercelAnalytics />}
    </>
  );
}
