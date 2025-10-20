'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type AnimatedHeroProps = {
  children: ReactNode
}

export default function AnimatedHero({ children }: AnimatedHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}
