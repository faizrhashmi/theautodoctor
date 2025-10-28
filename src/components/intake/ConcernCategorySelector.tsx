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
                  min-h-[100px] sm:min-h-[120px] p-3 sm:p-4
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
                {/* Icon */}
                <span className="text-3xl sm:text-4xl mb-2">
                  {category.icon}
                </span>

                {/* Name */}
                <span className={`
                  text-xs sm:text-sm font-medium text-center
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
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-50"
            >
              <div className="bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div
                  className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-700"
                  style={{ backgroundColor: `${activeCategory.color}20` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl">{activeCategory.icon}</span>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {activeCategory.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                        {activeCategory.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors touch-manipulation"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Sub-categories List */}
                <div className="overflow-y-auto p-4 sm:p-6">
                  <p className="text-sm text-slate-400 mb-4">
                    Select a specific issue:
                  </p>

                  <div className="space-y-2">
                    {activeCategory.subCategories?.map((subCategory) => (
                      <motion.button
                        key={subCategory.id}
                        type="button"
                        onClick={() => handleSubCategoryClick(subCategory)}
                        className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all text-left touch-manipulation min-h-[60px]"
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-sm sm:text-base font-medium text-slate-200">
                          {subCategory.name}
                        </span>
                        <svg
                          className="w-5 h-5 text-slate-500 flex-shrink-0 ml-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
