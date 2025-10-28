'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import {
  CONCERN_CATEGORIES,
  type ConcernCategory,
  type SubCategory,
  getConcernTemplate
} from '@/lib/concernCategories'

interface ConcernCategorySelectorProps {
  onSelect: (category: ConcernCategory, subCategory?: SubCategory, template?: string) => void
  selectedCategory?: string
  className?: string
}

export default function ConcernCategorySelector({
  onSelect,
  selectedCategory,
  className = ''
}: ConcernCategorySelectorProps) {
  const [showSubCategories, setShowSubCategories] = useState(false)
  const [activeCategory, setActiveCategory] = useState<ConcernCategory | null>(null)

  const handleCategoryClick = (category: ConcernCategory) => {
    if (category.subCategories && category.subCategories.length > 0) {
      setActiveCategory(category)
      setShowSubCategories(true)
    } else {
      const template = getConcernTemplate(category.slug)
      onSelect(category, undefined, template)
    }
  }

  const handleSubCategoryClick = (subCategory: SubCategory) => {
    if (activeCategory) {
      const template = getConcernTemplate(activeCategory.slug, subCategory.slug)
      onSelect(activeCategory, subCategory, template)
      setShowSubCategories(false)
      setActiveCategory(null)
    }
  }

  const closeModal = () => {
    setShowSubCategories(false)
    setActiveCategory(null)
  }

  return (
    <>
      {/* Category Grid - Mobile First */}
      <div className={className}>
        <label className="block text-sm font-medium text-slate-200 mb-3">
          What&apos;s your main concern?
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {CONCERN_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.slug

            return (
              <motion.button
                key={category.id}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className={`
                  relative flex flex-col items-center justify-center
                  min-h-[90px] sm:min-h-[110px] p-2.5 sm:p-4
                  rounded-lg border-2 transition-all
                  ${isSelected
                    ? `${category.borderColor} ${category.bgColor} shadow-lg`
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
                  }
                  active:scale-95 touch-manipulation
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Icon - Smaller on mobile */}
                <span className="text-2xl sm:text-3xl lg:text-4xl mb-1.5 sm:mb-2">
                  {category.icon}
                </span>

                {/* Name */}
                <span className={`
                  text-[11px] sm:text-sm font-medium text-center leading-tight
                  ${isSelected ? 'text-white' : 'text-slate-200'}
                `}>
                  {category.name}
                </span>

                {/* Description - Hidden on mobile */}
                <span className="hidden lg:block text-[10px] text-slate-400 text-center mt-1">
                  {category.description}
                </span>

                {/* Badge for sub-categories */}
                {category.subCategories && category.subCategories.length > 0 && (
                  <span className="absolute top-1 right-1 text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                    {category.subCategories.length}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Sub-Category Modal - Mobile Optimized */}
      <AnimatePresence>
        {showSubCategories && activeCategory && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal - Centered Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg mx-auto z-10"
            >
              <div className="bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div
                  className="relative p-4 sm:p-5 border-b border-slate-700"
                  style={{ backgroundColor: `${activeCategory.color}20` }}
                >
                  {/* Close Button - Top Right */}
                  <button
                    onClick={closeModal}
                    className="absolute top-3 right-3 p-2 hover:bg-slate-800/50 rounded-lg transition-colors touch-manipulation z-10"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-slate-300" />
                  </button>

                  {/* Header Content - Centered on Mobile */}
                  <div className="flex flex-col items-center text-center pr-8">
                    <span className="text-4xl sm:text-5xl mb-3">{activeCategory.icon}</span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                      {activeCategory.name}
                    </h3>
                    <p className="text-sm text-slate-300">
                      {activeCategory.description}
                    </p>
                  </div>
                </div>

                {/* Sub-categories List */}
                <div className="overflow-y-auto p-4 sm:p-5">
                  <p className="text-sm text-slate-400 mb-4 text-center font-medium">
                    Select a specific issue:
                  </p>

                  <div className="space-y-3">
                    {activeCategory.subCategories?.map((subCategory) => (
                      <motion.button
                        key={subCategory.id}
                        type="button"
                        onClick={() => handleSubCategoryClick(subCategory)}
                        className="w-full flex items-center justify-between p-4 sm:p-4 rounded-lg border-2 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 active:border-slate-500 transition-all text-left touch-manipulation min-h-[64px]"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <span className="text-base sm:text-base font-medium text-slate-100 flex-1 pr-3">
                          {subCategory.name}
                        </span>
                        <svg
                          className="w-6 h-6 text-slate-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
