import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './App.css'

gsap.registerPlugin(ScrollTrigger)

// Mobile touch scroll support
ScrollTrigger.config({ ignoreMobileResize: true })
ScrollTrigger.normalizeScroll(true)

/* ─── SVG fetch helper ─── */
async function fetchSvg(url) {
  const text = await fetch(url).then((r) => r.text())
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'image/svg+xml')
  const svgEl = doc.querySelector('svg')
  doc.querySelectorAll('mask').forEach((m) => m.remove())
  const paths = doc.querySelectorAll('path')
  const pathD = Array.from(paths)
    .map((p) => p.getAttribute('d'))
    .filter(Boolean)
    .join(' ')
  return {
    pathD,
    viewBox: svgEl?.getAttribute('viewBox') ?? '0 0 1000 1000',
  }
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

/* ─── SVG Section Component ─── */
function SorrySection({ id, svgData, stroke, fill, accent, autoPlay = false, children }) {
  const outerRef = useRef(null)   // outer tall section (provides scroll space)
  const outlineRef = useRef(null) // SVG outline path (draws on scroll)
  const fillRef = useRef(null)    // SVG fill path (reveals after draw)

  useEffect(() => {
    const outline = outlineRef.current
    const fillPath = fillRef.current
    const outer = outerRef.current
    if (!outline || !fillPath || !outer) return

    const total = outline.getTotalLength()

    // Initial states
    gsap.set(outline, {
      strokeDasharray: total,
      strokeDashoffset: total,
      opacity: 1,
    })
    gsap.set(fillPath, { opacity: 0 })

    const reveals = Array.from(outer.querySelectorAll('[data-reveal]'))
    if (reveals.length) gsap.set(reveals, { opacity: 0, y: 22 })

    if (autoPlay) {
      /* ── Section 1: Page load হলে auto-draw ── */
      const tl = gsap.timeline({ delay: 0.4 })
      tl.to(outline, { strokeDashoffset: 0, duration: 8, ease: 'power1.inOut' })
      tl.to(outline, { opacity: 0, duration: 1, ease: 'power2.in' }, '-=1')
      tl.to(fillPath, { opacity: 1, duration: 1.5, ease: 'power2.out' }, '<')

      // Text staggered entrance
      gsap.to(reveals, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        stagger: 0.22,
        ease: 'power3.out',
        delay: 0.8,
      })

      return () => tl.kill()
    } else {
      /* ── Sections 2-4: CSS sticky + scroll scrub ──
         outer section = 250svh tall (scroll space)
         inner .sticky-frame = sticky top:0, 100svh (stays visible)
         ScrollTrigger tracks outer section's scroll progress
      ── */

      const tl = gsap.timeline({ paused: true })
      tl.to(outline, { strokeDashoffset: 0, ease: 'none', duration: 1 })
      tl.to(outline, { opacity: 0, ease: 'none', duration: 0.12 }, 0.88)
      tl.to(fillPath, { opacity: 1, ease: 'none', duration: 0.2 }, 0.88)

      const st = ScrollTrigger.create({
        trigger: outer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,               // slightly lagged = feels slower & smoother
        animation: tl,
        invalidateOnRefresh: true,
      })

      // Text reveal: fires when sticky content is in view
      const textSt = ScrollTrigger.create({
        trigger: outer,
        start: 'top 15%',
        once: true,
        onEnter() {
          if (reveals.length) {
            gsap.to(reveals, {
              opacity: 1,
              y: 0,
              duration: 1,
              stagger: 0.2,
              ease: 'power3.out',
            })
          }
        },
      })

      return () => {
        st.kill()
        textSt.kill()
      }
    }
  }, [autoPlay])

  return (
    /* Outer section: auto → 100svh | scroll → 250svh */
    <section
      ref={outerRef}
      className={`sorry-section ${autoPlay ? 'section-auto' : 'section-scroll'}`}
      id={id}
      style={{ '--accent': accent }}
    >
      {/* Inner frame: auto → normal | scroll → sticky */}
      <div className={autoPlay ? 'auto-frame' : 'sticky-frame'}>
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

        {/* Gradient scrim for text legibility */}
        <div className="text-scrim" />

        {/* Text overlay */}
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

  // Load all SVGs first, then render
  useEffect(() => {
    Promise.all(SVG_URLS.map(fetchSvg)).then((data) => {
      setSvgs(data)
    })
  }, [])

  // Track which section is visible (for dots)
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
    }, 150)
    return () => clearTimeout(timer)
  }, [svgs])

  if (!svgs) return <LoadingScreen />

  const [plant, butterfly, blue, loader] = svgs

  return (
    <div className="app">
      <ProgressDots count={4} active={active} />

      {/* ── Section 1 · Plant · auto-draw on load ── */}
      <SorrySection
        autoPlay
        id="section-0"
        svgData={plant}
        stroke="rgba(155, 190, 145, 0.95)"
        fill="rgba(100, 150, 85, 0.42)"
        accent="#9bbe91"
      >
        <span data-reveal className="eyebrow">A letter for you</span>
        <h2 data-reveal className="lead">There are words</h2>
        <h2 data-reveal className="lead italic">I've been holding onto.</h2>
        <p data-reveal className="caption">Scroll to keep reading.</p>
      </SorrySection>

      {/* ── Section 2 · Butterfly · draw on scroll ── */}
      <SorrySection
        id="section-1"
        svgData={butterfly}
        stroke="rgba(190, 160, 220, 0.95)"
        fill="rgba(140, 100, 190, 0.4)"
        accent="#bea0dc"
      >
        <h2 data-reveal className="statement">I know I hurt you.</h2>
        <p data-reveal className="body-text">And no matter how much time passes,</p>
        <p data-reveal className="body-text">I will never stop thinking about it.</p>
        <p data-reveal className="body-text italic-dim">You deserved so much better.</p>
      </SorrySection>

      {/* ── Section 3 · Blue · draw on scroll — CLIMAX ── */}
      <SorrySection
        id="section-2"
        svgData={blue}
        stroke="rgba(115, 170, 230, 0.95)"
        fill="rgba(65, 130, 210, 0.35)"
        accent="#73aae6"
      >
        <span data-reveal className="apology-pre">I am</span>
        <h1 data-reveal className="apology">Sorry.</h1>
        <p data-reveal className="apology-post">From the deepest part of who I am.</p>
        <div data-reveal className="divider" />
        <p data-reveal className="apology-note">I should have been more careful with your heart.</p>
      </SorrySection>

      {/* ── Section 4 · Loader · draw on scroll ── */}
      <SorrySection
        id="section-3"
        svgData={loader}
        stroke="rgba(220, 165, 155, 0.95)"
        fill="rgba(185, 110, 100, 0.4)"
        accent="#dca59b"
      >
        <h2 data-reveal className="lead">I can't undo the past.</h2>
        <h2 data-reveal className="lead italic">But I can shape tomorrow.</h2>
        <p data-reveal className="body-text">You are worth every effort.</p>
        <p data-reveal className="body-text">Every apology. Every promise kept.</p>
        <span data-reveal className="heart">♡</span>
      </SorrySection>
    </div>
  )
}
