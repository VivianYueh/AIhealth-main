import { useEffect, useState } from 'react'

export default function useScrollSpy(sectionIds = []) {
  const [activeSection, setActiveSection] = useState(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(entry => entry.isIntersecting)
        if (visible) {
          setActiveSection(visible.target.id)
        }
      },
      {
        rootMargin: '-30% 0px -60% 0px',
        threshold: 0.3
      }
    )

    const elements = sectionIds
      .map(id => document.getElementById(id))
      .filter(Boolean)

    elements.forEach(el => observer.observe(el))

    return () => {
      elements.forEach(el => observer.unobserve(el))
      observer.disconnect()
    }
  }, [sectionIds.join(',')])  // 使用 join 確保重新建立監聽器

  return activeSection
}

