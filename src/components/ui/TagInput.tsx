import { useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
}

function normalizeTag(raw: string): string {
  return raw.toLowerCase().trim()
}

export function TagInput({ tags, onChange, suggestions = [], placeholder = 'Add a tag...', className }: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = useCallback((raw: string) => {
    const tag = normalizeTag(raw)
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
  }, [tags, onChange])

  const removeTag = useCallback((tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }, [tags, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) {
        // Support comma-separated batch entry
        const parts = input.split(',')
        for (const part of parts) {
          addTag(part)
        }
        setInput('')
        setShowSuggestions(false)
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    setShowSuggestions(val.trim().length > 0)
  }

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion)
    setInput('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase().trim()) && !tags.includes(s.toLowerCase())
  )

  return (
    <div className={cn('relative', className)}>
      <div className="flex flex-wrap gap-1.5 p-2.5 bg-bg-surface border border-border-light rounded-xl min-h-[44px] focus-within:border-accent-blue transition-colors">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-accent-aqua/20 text-accent-aqua text-[12px] font-medium font-body px-2.5 py-1 rounded-pill"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-accent-aqua/70 transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => input.trim() && setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow suggestion click
            setTimeout(() => setShowSuggestions(false), 150)
          }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none font-body"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-bg-elevated border border-border-light rounded-xl shadow-lg max-h-[160px] overflow-y-auto">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSuggestionClick(s)}
              className="w-full text-left px-3 py-2 text-sm font-body text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
