declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

export function initAnalytics(): void {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) {
    return
  }

  if (document.querySelector(`script[data-ga-id="${GA_MEASUREMENT_ID}"]`)) {
    return
  }

  window.dataLayer = window.dataLayer || []

  function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  }

  window.gtag = gtag

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  script.dataset.gaId = GA_MEASUREMENT_ID
  document.head.appendChild(script)

  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
  })
}

export {}
