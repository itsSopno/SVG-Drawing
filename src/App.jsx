import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import './App.css'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

/* ─── Detect touch/mobile device ─── */
const IS_MOBILE = () =>
  window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768

/* ─── SVG fetch ─── */
async function fetchSvg(url) {
  const text = await fetch(url).then((r) => r.text())
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'image/svg+xml')
  const svgEl = doc.querySelector('svg')
  doc.querySelectorAll('mask').forEach((m) => m.remove())
  const pathD = Array.from(doc.querySelectorAll('path'))
    .map((p) => p.getAttribute('d'))
    .filter(Boolean)
    .join(' ')
  return { pathD, viewBox: svgEl?.getAttribute('viewBox') ?? '0 0 1000 1000' }
}

/* ─── Loading screen ─── */
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loader-dots">
        <span /><span /><span />
      </div>
    </div>
  )
}

/* ─── Scroll-based text reveal – different per element class ─── */
function playTextReveal(reveals, baseDelay = 0.2) {
  reveals.forEach((el, i) => {
    const delay = baseDelay + i * 0.18

    if (el.classList.contains('apology')) {
      // "Sorry." — scale + blur reveal (cinematic)
      gsap.fromTo(el,
        { opacity: 0, scale: 0.55, filter: 'blur(18px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.6, delay, ease: 'expo.out' }
      )
    } else if (el.classList.contains('statement')) {
      // "I know I hurt you." — slides from left + blur
      gsap.fromTo(el,
        { opacity: 0, x: -50, filter: 'blur(8px)' },
        { opacity: 1, x: 0, filter: 'blur(0px)', duration: 1.2, delay, ease: 'power3.out' }
      )
    } else if (el.classList.contains('body-text')) {
      // Body text — alternate left/right slide
      const fromX = i % 2 === 0 ? -30 : 30
      gsap.fromTo(el,
        { opacity: 0, x: fromX },
        { opacity: 1, x: 0, duration: 1, delay, ease: 'power2.out' }
      )
    } else if (el.classList.contains('lead')) {
      // Lead lines — slide up
      gsap.fromTo(el,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 1.1, delay, ease: 'power3.out' }
      )
    } else if (el.classList.contains('apology-pre')) {
      gsap.fromTo(el,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.9, delay, ease: 'power3.out' }
      )
    } else if (el.classList.contains('heart')) {
      // Heart — scale pop
      gsap.fromTo(el,
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.8, delay, ease: 'back.out(2)' }
      )
    } else {
      // Default — fade + slight rise
      gsap.fromTo(el,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.9, delay, ease: 'power3.out' }
      )
    }
  })
}

/* ─── Draw animation timeline ─── */
function buildDrawTl(outline, fillPath, duration = 6) {
  const total = outline.getTotalLength()
  gsap.set(outline, { strokeDasharray: total, strokeDashoffset: total, opacity: 1 })
  gsap.set(fillPath, { opacity: 0 })
  const tl = gsap.timeline({ paused: true })
  tl.to(outline, { strokeDashoffset: 0, ease: 'none', duration: 1 })
  tl.to(outline, { opacity: 0, ease: 'none', duration: 0.12 }, 0.85)
  tl.to(fillPath, { opacity: 1, ease: 'none', duration: 0.2 }, 0.85)
  return tl
}

/* ─── Section component ─── */
function SorrySection({ id, svgData, stroke, fill, accent, autoPlay = false, children }) {
  const outerRef = useRef(null)
  const outlineRef = useRef(null)
  const fillRef = useRef(null)

  useEffect(() => {
    const outline = outlineRef.current
    const fillPath = fillRef.current
    const outer = outerRef.current
    if (!outline || !fillPath || !outer) return

    // Hide text initially
    const reveals = Array.from(outer.querySelectorAll('[data-reveal]'))
    reveals.forEach((el) => gsap.set(el, { opacity: 0 }))

    if (autoPlay) {
      /* ── Section 1: auto-play on load ── */
      const total = outline.getTotalLength()
      gsap.set(outline, { strokeDasharray: total, strokeDashoffset: total, opacity: 1 })
      gsap.set(fillPath, { opacity: 0 })

      const tl = gsap.timeline({ delay: 0.4 })
      tl.to(outline, { strokeDashoffset: 0, duration: 8, ease: 'power1.inOut' })
      tl.to(outline, { opacity: 0, duration: 1, ease: 'power2.in' }, '-=1')
      tl.to(fillPath, { opacity: 1, duration: 1.5, ease: 'power2.out' }, '<')

      // Section 1 text: simple stagger (auto-play, no scroll trigger)
      if (reveals.length) {
        gsap.to(reveals, {
          opacity: 1,
          y: 0,
          duration: 1.1,
          stagger: 0.22,
          ease: 'power3.out',
          delay: 0.8,
        })
      }
      return () => tl.kill()
    }

    /* ── Sections 2-4: CSS sticky + scroll scrub (Unified) ── */
    const tl = buildDrawTl(outline, fillPath)

    const svgST = ScrollTrigger.create({
      trigger: outer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 2.5,
      animation: tl,
      invalidateOnRefresh: true,
    })

    // Text: fires once when the section becomes visible
    const textST = ScrollTrigger.create({
      trigger: outer,
      start: 'top 20%',
      once: true,
      onEnter() {
        if (reveals.length) playTextReveal(reveals, 0.2)
      },
    })

    return () => { svgST.kill(); textST.kill() }
  }, [autoPlay])

  const isScroll = !autoPlay
  return (
    <section
      ref={outerRef}
      className={`sorry-section ${isScroll ? 'section-scroll' : 'section-auto'}`}
      id={id}
      style={{ '--accent': accent }}
    >
      <div className={isScroll ? 'sticky-frame' : 'auto-frame'}>
        {/* SVG illustration */}
        <div className="svg-layer" aria-hidden="true">
          <svg viewBox={svgData.viewBox} xmlns="http://www.w3.org/2000/svg">
            <path
              ref={outlineRef}
              d={svgData.pathD}
              fill="none"
              stroke={stroke}
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              ref={fillRef}
              d={svgData.pathD}
              fill={fill}
              style={{ opacity: 0 }}
            />
          </svg>
        </div>

        <div className="text-scrim" />
        <div className="section-content">{children}</div>
      </div>
    </section>
  )
}

/* ─── Progress dots ─── */
function ProgressDots({ count, active }) {
  return (
    <nav className="progress-dots" aria-label="Scroll progress">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`dot ${i === active ? 'active' : ''}`} />
      ))}
    </nav>
  )
}

/* ─── Main App ─── */
const SVG_URLS = ['/plant.svg', '/butterfly.svg', '/blue.svg', '/loader.svg']

export default function App() {
  const [svgs, setSvgs] = useState(null)
  const [active, setActive] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Initialize Lenis for smooth scrolling
  useEffect(() => {
    const lenis = new Lenis()
    
    lenis.on('scroll', ScrollTrigger.update)

    function update(time) {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(update)
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    Promise.all(SVG_URLS.map(fetchSvg)).then(setSvgs)
  }, [])

  useEffect(() => {
    if (!svgs) return
    const timer = setTimeout(() => {
      ScrollTrigger.refresh()
      const triggers = ['section-0', 'section-1', 'section-2', 'section-3'].map((id, i) =>
        ScrollTrigger.create({
          trigger: `#${id}`,
          start: 'top 60%',
          end: 'bottom 40%',
          onEnter: () => setActive(i),
          onEnterBack: () => setActive(i),
        })
      )
      return () => triggers.forEach((t) => t.kill())
    }, 200)
    return () => clearTimeout(timer)
  }, [svgs])

  if (!svgs) return <LoadingScreen />
  const [plant, butterfly, blue, loader] = svgs

  return (
    <div className="app">
      <ProgressDots count={4} active={active} />

      <SorrySection autoPlay id="section-0"
        svgData={plant}
        stroke="rgba(155,190,145,0.95)" fill="rgba(100,150,85,0.42)" accent="#9bbe91"
      >
        <span data-reveal className="eyebrow">A letter for you</span>
        <h2 data-reveal className="lead">There are words</h2>
        <h2 data-reveal className="lead italic">I've been holding onto.</h2>
        <p data-reveal className="caption">Scroll to keep reading.</p>
      </SorrySection>

      <SorrySection id="section-1"
        svgData={butterfly}
        stroke="rgba(190,160,220,0.95)" fill="rgba(140,100,190,0.4)" accent="#bea0dc"
      >
        <h2 data-reveal className="statement">I know I hurt you.</h2>
        <p data-reveal className="body-text">And no matter how much time passes,</p>
        <p data-reveal className="body-text">I will never stop thinking about it.</p>
        <p data-reveal className="body-text italic-dim">You deserved so much better.</p>
      </SorrySection>

      <SorrySection id="section-2"
        svgData={blue}
        stroke="rgba(115,170,230,0.95)" fill="rgba(65,130,210,0.35)" accent="#73aae6"
      >
        <span data-reveal className="apology-pre">I am</span>
        <h1 data-reveal className="apology">Sorry.</h1>
        <p data-reveal className="apology-post">From the deepest part of who I am.</p>
        <div data-reveal className="divider" />
        <p data-reveal className="apology-note">I should have been more careful with your heart.</p>
      </SorrySection>

      <SorrySection id="section-3"
        svgData={loader}
        stroke="rgba(220,165,155,0.95)" fill="rgba(185,110,100,0.4)" accent="#dca59b"
      >
        <h2 data-reveal className="lead">I can't undo the past.</h2>
        <h2 data-reveal className="lead italic">But I can shape tomorrow.</h2>
        <p data-reveal className="body-text">You are worth every effort.</p>
        <p data-reveal className="body-text">Every apology. Every promise kept.</p>
        <span data-reveal className="heart">♡</span>
        <button data-reveal className="btn-letter" onClick={() => setIsModalOpen(true)}>
          Read Letter
        </button>
      </SorrySection>

      {/* Sorry Letter Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} data-lenis-prevent="true">
            <button className="modal-close" onClick={() => setIsModalOpen(false)} aria-label="Close modal">×</button>
            <div className="modal-body">
              <h3 className="modal-title">My Dearest,</h3>
              <p>
                I am writing this because words sometimes fail me when I'm looking into your eyes. I am so incredibly sorry for the pain I've caused you.
              </p>
              <p>
                You have been nothing but a light in my life, and I took that for granted. I know an apology doesn't instantly heal the wounds, but I want you to know that from the bottom of my heart, I deeply regret my actions.
              </p>
              <p>
                I promise to do better, to be better, and to cherish you the way you truly deserve. Please forgive me.
              </p>
              <p className="signature">Yours Goru</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
