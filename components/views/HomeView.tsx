'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { homeContent } from '@/lib/content'
import { formatCount } from '@/lib/format'
import type { CallStats } from '@/types/call'
import type { ViewName } from '@/types/view'

interface HomeViewProps {
  stats: CallStats
  onSelectView: (view: ViewName) => void
}

/**
 * Landing screen: pitch copy plus live queue counters.
 *
 * Every string, both CTA targets, the stat tiles and their colour modifiers
 * come from data/content.json - this component only decides layout. The stat
 * tiles name the CallStats key they read rather than being wired one by one,
 * so adding a counter is a data edit.
 */
export function HomeView({ stats, onSelectView }: HomeViewProps) {
  return (
    <section className="panel">
      <div className="panel-hero">
        <div className="hero-left">
          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {homeContent.heading}
          </motion.h2>
          <p>{homeContent.intro}</p>
          <div className="hero-cta">
            <button className="cta" onClick={() => onSelectView(homeContent.primaryCta.view)}>
              {homeContent.primaryCta.label}
            </button>
            <button
              className="cta ghost"
              onClick={() => onSelectView(homeContent.secondaryCta.view)}
            >
              {homeContent.secondaryCta.label}
            </button>
          </div>
        </div>
        <div className="hero-right">
          <div className="stat-grid">
            {homeContent.stats.map(tile => (
              <div className="stat" key={tile.metric}>
                <div className="stat-label">{tile.label}</div>
                <div className={`stat-value${tile.tone ? ` ${tile.tone}` : ''}`}>
                  {formatCount(stats[tile.metric])}
                </div>
              </div>
            ))}
          </div>
          <div className="selling-points">
            {homeContent.sellingPoints.map(point => (
              <div className="point" key={point}>
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-divider" />

      <div className="value-grid">
        {homeContent.valueCards.map(card => (
          <div className="value-card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
