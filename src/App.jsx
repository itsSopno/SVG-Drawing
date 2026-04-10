import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './App.css'

gsap.registerPlugin(ScrollTrigger)

/* ─── Hook: fetch SVG and extract path data ─── */
function useSvgData(url) {
  const [svgData, setSvgData] = useState({ pathD: null, viewBox: null })

  useEffect(() => {
    if (!url) return
    let cancelled = false

    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return
        const parser = new DOMParser()
        const doc = parser.parseFromString(text, 'image/svg+xml')
        const svgEl = doc.querySelector('svg')
        // Remove mask elements so we don't accidentally grab mask paths
        doc.querySelectorAll('mask').forEach((m) => m.remove())
        const paths = doc.querySelectorAll('path')
        // Combine all path data (handles multi-path SVGs)
        const pathD = Array.from(paths)
          .map((p) => p.getAttribute('d'))
          .filter(Boolean)
          .join(' ')

        setSvgData({
          pathD,
          viewBox: svgEl?.getAttribute('viewBox') ?? '0 0 1000 1000',
        })
      })
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [url])

  return svgData
}

/* ─── Section: animated SVG + content ─── */
function SorrySection({ id, svgUrl, stroke, fill, accent, autoPlay = false, children }) {
  const sectionRef = useRef(null)
  const outlineRef = useRef(null)
  const fillRef = useRef(null)
  const { pathD, viewBox } = useSvgData(svgUrl)

  useEffect(() => {
    if (!pathD || !outlineRef.current || !sectionRef.current) return

    const outline = outlineRef.current
    const fillPath = fillRef.current
    const section = sectionRef.current
    const total = outline.getTotalLength()

    gsap.set(outline, { strokeDasharray: total, strokeDashoffset: total })
    gsap.set(fillPath, { opacity: 0 })

    if (autoPlay) {
      /* ── Section 1: plays automatically on load ── */
      const tl = gsap.timeline({ delay: 0.4 })
      tl.to(outline, { strokeDashoffset: 0, duration: 5.5, ease: 'power1.inOut' })
      tl.to(outline, { opacity: 0, duration: 0.9, ease: 'power2.in' }, '-=0.6')
      tl.to(fillPath, { opacity: 1, duration: 1.2, ease: 'power2.out' }, '<')

      // Text fades in as drawing plays
      const reveals = section.querySelectorAll('[data-reveal]')
      if (reveals.length) {
        gsap.set(reveals, { opacity: 0, y: 24 })
        gsap.to(reveals, {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out',
          delay: 0.7,
        })
      }

      return () => tl.kill()
    } else {
      /* ── Sections 2–4: scrubbed by scroll ── */
      const tl = gsap.timeline({ paused: true })
      tl.to(outline, { strokeDashoffset: 0, ease: 'none', duration: 1 })
      tl.to(outline, { opacity: 0, ease: 'none', duration: 0.25 }, 0.75)
      tl.to(fillPath, { opacity: 1, ease: 'none', duration: 0.5 }, 0.75)

      const st = ScrollTrigger.create({
        trigger: section,
        start: 'top 95%',
        end: 'center 20%',
        scrub: 1.2,
        animation: tl,
        invalidateOnRefresh: true,
      })

      // Text reveals when section enters viewport
      const reveals = section.querySelectorAll('[data-reveal]')
      if (reveals.length) {
        gsap.set(reveals, { opacity: 0, y: 28 })
        ScrollTrigger.create({
          trigger: section,
          start: 'top 55%',
          once: true,
          onEnter() {
            gsap.to(reveals, {
              opacity: 1,
              y: 0,
              duration: 1,
              stagger: 0.18,
              ease: 'power3.out',
            })
          },
        })
      }

      return () => st.kill()
    }
  }, [pathD, autoPlay])

  return (
    <section
      ref={sectionRef}
      className="sorry-section"
      id={id}
      style={{ '--accent': accent }}
    >
      {/* SVG background layer */}
      {pathD && (
        <div className="svg-layer" aria-hidden="true">
          <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
            <path
              ref={outlineRef}
              d={pathD}
              fill="none"
              stroke={stroke}
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
            <path
              ref={fillRef}
              d={pathD}
              fill={fill}
              style={{ opacity: 0 }}
            />
          </svg>
        </div>
      )}

      {/* Bottom gradient for text legibility */}
      <div className="text-scrim" />

      {/* Content */}
      <div className="section-content">{children}</div>
    </section>
  )
}

/* ─── Progress dots ─── */
function ProgressDots({ count, active }) {
  return (
    <nav className="progress-dots" aria-label="Scroll progress">
      {Array.from({ length: count }).map((_, i) => (
        <a
          key={i}
          href={`#section-${i}`}
          className={`dot ${i === active ? 'active' : ''}`}
          aria-label={`Section ${i + 1}`}
        />
      ))}
    </nav>
  )
}

/* ─── Main App ─── */
export default function App() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const ids = ['section-0', 'section-1', 'section-2', 'section-3']
    const triggers = ids.map((id, i) =>
      ScrollTrigger.create({
        trigger: `#${id}`,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => setActive(i),
        onEnterBack: () => setActive(i),
      })
    )
    return () => triggers.forEach((t) => t.kill())
  }, [])

  return (
    <div className="app">
      <ProgressDots count={4} active={active} />

      {/* ── SECTION 1 · Plant · Intro — auto-draws on load ── */}
      <SorrySection
        autoPlay
        id="section-0"
        svgUrl="/plant.svg"
        stroke="rgba(160,185,150,0.75)"
        fill="rgba(100,140,90,0.35)"
        accent="#a0b996"
      >
        <span data-reveal className="eyebrow">A letter for you</span>
        <h2 data-reveal className="lead">
          There are words
        </h2>
        <h2 data-reveal className="lead italic">
          I've been holding onto.
        </h2>
        <p data-reveal className="caption">
          Please keep reading.
        </p>
      </SorrySection>

      {/* ── SECTION 2 · Butterfly · Regret ── */}
      <SorrySection
        id="section-1"
        svgUrl="/butterfly.svg"
        stroke="rgba(190,165,215,0.75)"
        fill="rgba(140,100,185,0.35)"
        accent="#be9fd6"
      >
        <h2 data-reveal className="statement">
          I know I hurt you.
        </h2>
        <p data-reveal className="body-text">
          And no matter how much time passes,
        </p>
        <p data-reveal className="body-text">
          I will never stop thinking about it.
        </p>
        <p data-reveal className="body-text italic-dim">
          You deserved so much better.
        </p>
      </SorrySection>

      {/* ── SECTION 3 · Blue · Sorry (Climax) ── */}
      <SorrySection
        id="section-2"
        svgUrl="/blue.svg"
        stroke="rgba(120,170,220,0.75)"
        fill="rgba(70,130,200,0.3)"
        accent="#78aadc"
      >
        <span data-reveal className="apology-pre">I am</span>
        <h1 data-reveal className="apology">Sorry.</h1>
        <p data-reveal className="apology-post">
          From the deepest part of who I am.
        </p>
        <div data-reveal className="divider" />
        <p data-reveal className="apology-note">
          I should have been more careful with your heart.
        </p>
      </SorrySection>

      {/* ── SECTION 4 · Loader · Promise ── */}
      <SorrySection
        id="section-3"
        svgUrl="/loader.svg"
        stroke="rgba(215,170,160,0.75)"
        fill="rgba(180,110,100,0.35)"
        accent="#d7a8a0"
      >
        <h2 data-reveal className="lead">
          I can't undo the past.
        </h2>
        <h2 data-reveal className="lead italic">
          But I can shape tomorrow.
        </h2>
        <p data-reveal className="body-text">
          You are worth every effort.
        </p>
        <p data-reveal className="body-text">
          Every apology. Every promise kept.
        </p>
        <span data-reveal className="heart">♡</span>
      </SorrySection>
    </div>
  )
}
