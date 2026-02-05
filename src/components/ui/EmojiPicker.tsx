import { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from './Button'

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void
    selectedEmoji?: string
    onClose?: () => void
}

// Emoji data with searchable keywords
const emojiData: { emoji: string; keywords: string[]; category: string }[] = [
    // Objects
    { emoji: '📦', keywords: ['box', 'package', 'delivery', 'shipping', 'storage'], category: 'Objects' },
    { emoji: '📫', keywords: ['mailbox', 'mail', 'letter', 'post'], category: 'Objects' },
    { emoji: '📪', keywords: ['mailbox', 'mail', 'empty'], category: 'Objects' },
    { emoji: '🗂️', keywords: ['folder', 'file', 'dividers', 'organize'], category: 'Objects' },
    { emoji: '📁', keywords: ['folder', 'file', 'directory'], category: 'Objects' },
    { emoji: '🗄️', keywords: ['cabinet', 'file', 'storage', 'office'], category: 'Objects' },
    { emoji: '🧰', keywords: ['toolbox', 'tools', 'repair', 'fix'], category: 'Objects' },
    { emoji: '🛠️', keywords: ['tools', 'hammer', 'wrench', 'repair'], category: 'Objects' },
    { emoji: '🔧', keywords: ['wrench', 'tool', 'fix', 'repair'], category: 'Objects' },
    { emoji: '🔨', keywords: ['hammer', 'tool', 'build', 'construct'], category: 'Objects' },
    { emoji: '🪛', keywords: ['screwdriver', 'tool', 'fix'], category: 'Objects' },
    { emoji: '⚙️', keywords: ['gear', 'settings', 'cog', 'mechanical'], category: 'Objects' },
    { emoji: '🔩', keywords: ['nut', 'bolt', 'screw', 'hardware'], category: 'Objects' },
    { emoji: '⛓️', keywords: ['chain', 'link', 'connected'], category: 'Objects' },
    { emoji: '🗜️', keywords: ['clamp', 'compress', 'tool'], category: 'Objects' },
    { emoji: '🧲', keywords: ['magnet', 'attract', 'magnetic'], category: 'Objects' },
    { emoji: '📱', keywords: ['phone', 'mobile', 'smartphone', 'device'], category: 'Objects' },
    { emoji: '💻', keywords: ['laptop', 'computer', 'tech', 'device'], category: 'Objects' },
    { emoji: '🖥️', keywords: ['desktop', 'computer', 'monitor', 'screen'], category: 'Objects' },
    { emoji: '⌨️', keywords: ['keyboard', 'type', 'computer'], category: 'Objects' },
    { emoji: '🖱️', keywords: ['mouse', 'computer', 'click'], category: 'Objects' },
    { emoji: '💾', keywords: ['floppy', 'disk', 'save', 'storage'], category: 'Objects' },
    { emoji: '📀', keywords: ['dvd', 'disc', 'cd', 'media'], category: 'Objects' },
    { emoji: '🔑', keywords: ['key', 'lock', 'unlock', 'security'], category: 'Objects' },
    { emoji: '🔐', keywords: ['lock', 'secure', 'closed', 'key'], category: 'Objects' },

    // Food
    { emoji: '🍕', keywords: ['pizza', 'food', 'italian', 'slice'], category: 'Food' },
    { emoji: '🍔', keywords: ['burger', 'hamburger', 'food', 'fast food'], category: 'Food' },
    { emoji: '🌮', keywords: ['taco', 'mexican', 'food'], category: 'Food' },
    { emoji: '🍜', keywords: ['noodles', 'ramen', 'asian', 'soup'], category: 'Food' },
    { emoji: '🍱', keywords: ['bento', 'box', 'lunch', 'japanese'], category: 'Food' },
    { emoji: '🍞', keywords: ['bread', 'loaf', 'bakery'], category: 'Food' },
    { emoji: '🧀', keywords: ['cheese', 'dairy', 'yellow'], category: 'Food' },
    { emoji: '🥐', keywords: ['croissant', 'french', 'pastry', 'breakfast'], category: 'Food' },
    { emoji: '🥖', keywords: ['baguette', 'french', 'bread'], category: 'Food' },
    { emoji: '🥯', keywords: ['bagel', 'bread', 'breakfast'], category: 'Food' },
    { emoji: '🍳', keywords: ['egg', 'frying', 'breakfast', 'cooking'], category: 'Food' },
    { emoji: '🥓', keywords: ['bacon', 'meat', 'breakfast'], category: 'Food' },
    { emoji: '🥞', keywords: ['pancakes', 'breakfast', 'stack'], category: 'Food' },
    { emoji: '🧇', keywords: ['waffle', 'breakfast', 'belgian'], category: 'Food' },
    { emoji: '🍗', keywords: ['chicken', 'leg', 'meat', 'drumstick'], category: 'Food' },
    { emoji: '🍖', keywords: ['meat', 'bone', 'ribs'], category: 'Food' },
    { emoji: '🍎', keywords: ['apple', 'red', 'fruit', 'healthy'], category: 'Food' },
    { emoji: '🍊', keywords: ['orange', 'citrus', 'fruit'], category: 'Food' },
    { emoji: '🍋', keywords: ['lemon', 'citrus', 'sour', 'yellow'], category: 'Food' },
    { emoji: '🍇', keywords: ['grapes', 'purple', 'fruit', 'wine'], category: 'Food' },
    { emoji: '🍓', keywords: ['strawberry', 'red', 'fruit', 'berry'], category: 'Food' },
    { emoji: '☕', keywords: ['coffee', 'hot', 'drink', 'cafe', 'morning'], category: 'Food' },

    // Travel & Places
    { emoji: '✈️', keywords: ['airplane', 'plane', 'travel', 'flight', 'airport'], category: 'Travel' },
    { emoji: '🚗', keywords: ['car', 'vehicle', 'drive', 'auto'], category: 'Travel' },
    { emoji: '🚙', keywords: ['suv', 'car', 'vehicle'], category: 'Travel' },
    { emoji: '🚕', keywords: ['taxi', 'cab', 'car', 'yellow'], category: 'Travel' },
    { emoji: '🏠', keywords: ['house', 'home', 'building', 'residence'], category: 'Travel' },
    { emoji: '🏢', keywords: ['office', 'building', 'work', 'business'], category: 'Travel' },
    { emoji: '🏛️', keywords: ['museum', 'building', 'classical', 'government'], category: 'Travel' },
    { emoji: '🏰', keywords: ['castle', 'medieval', 'fortress'], category: 'Travel' },
    { emoji: '🗼', keywords: ['tower', 'tokyo', 'landmark'], category: 'Travel' },
    { emoji: '🌉', keywords: ['bridge', 'night', 'city', 'san francisco'], category: 'Travel' },
    { emoji: '🚂', keywords: ['train', 'locomotive', 'steam', 'railway'], category: 'Travel' },
    { emoji: '🚁', keywords: ['helicopter', 'fly', 'chopper'], category: 'Travel' },
    { emoji: '🚢', keywords: ['ship', 'boat', 'cruise', 'ocean'], category: 'Travel' },
    { emoji: '⛵', keywords: ['sailboat', 'boat', 'sailing', 'water'], category: 'Travel' },
    { emoji: '🏖️', keywords: ['beach', 'umbrella', 'vacation', 'sand'], category: 'Travel' },
    { emoji: '🏔️', keywords: ['mountain', 'snow', 'peak', 'nature'], category: 'Travel' },
    { emoji: '🏕️', keywords: ['camping', 'tent', 'outdoor', 'nature'], category: 'Travel' },
    { emoji: '🌲', keywords: ['tree', 'evergreen', 'forest', 'nature'], category: 'Travel' },

    // Activities & Sports
    { emoji: '⚽', keywords: ['soccer', 'football', 'ball', 'sport'], category: 'Activities' },
    { emoji: '🏀', keywords: ['basketball', 'ball', 'sport', 'nba'], category: 'Activities' },
    { emoji: '🎮', keywords: ['gaming', 'controller', 'video game', 'play'], category: 'Activities' },
    { emoji: '🎯', keywords: ['target', 'bullseye', 'dart', 'aim'], category: 'Activities' },
    { emoji: '🎲', keywords: ['dice', 'game', 'gambling', 'luck'], category: 'Activities' },
    { emoji: '🎸', keywords: ['guitar', 'music', 'rock', 'instrument'], category: 'Activities' },
    { emoji: '🎹', keywords: ['piano', 'keyboard', 'music', 'instrument'], category: 'Activities' },
    { emoji: '📷', keywords: ['camera', 'photo', 'picture', 'photography'], category: 'Activities' },
    { emoji: '📺', keywords: ['television', 'tv', 'watch', 'screen'], category: 'Activities' },
    { emoji: '🎨', keywords: ['art', 'palette', 'paint', 'creative'], category: 'Activities' },
    { emoji: '🎭', keywords: ['theater', 'drama', 'masks', 'acting'], category: 'Activities' },
    { emoji: '🎪', keywords: ['circus', 'tent', 'carnival'], category: 'Activities' },
    { emoji: '🎬', keywords: ['movie', 'film', 'clapperboard', 'cinema'], category: 'Activities' },
    { emoji: '🎤', keywords: ['microphone', 'singing', 'karaoke', 'music'], category: 'Activities' },
    { emoji: '🎧', keywords: ['headphones', 'music', 'audio', 'listen'], category: 'Activities' },
    { emoji: '🏋️', keywords: ['gym', 'weightlifting', 'exercise', 'fitness'], category: 'Activities' },
    { emoji: '🚴', keywords: ['cycling', 'bike', 'bicycle', 'exercise'], category: 'Activities' },
    { emoji: '🏃', keywords: ['running', 'jogging', 'exercise', 'sprint'], category: 'Activities' },

    // Symbols & Misc
    { emoji: '💡', keywords: ['idea', 'lightbulb', 'bright', 'think'], category: 'Symbols' },
    { emoji: '🔔', keywords: ['bell', 'notification', 'alert', 'ring'], category: 'Symbols' },
    { emoji: '📌', keywords: ['pin', 'pushpin', 'location', 'mark'], category: 'Symbols' },
    { emoji: '⭐', keywords: ['star', 'favorite', 'rating', 'gold'], category: 'Symbols' },
    { emoji: '❤️', keywords: ['heart', 'love', 'red', 'like'], category: 'Symbols' },
    { emoji: '💚', keywords: ['heart', 'green', 'love', 'nature'], category: 'Symbols' },
    { emoji: '💙', keywords: ['heart', 'blue', 'love', 'calm'], category: 'Symbols' },
    { emoji: '💜', keywords: ['heart', 'purple', 'love'], category: 'Symbols' },
    { emoji: '✅', keywords: ['check', 'done', 'complete', 'yes'], category: 'Symbols' },
    { emoji: '❌', keywords: ['x', 'cross', 'wrong', 'no', 'delete'], category: 'Symbols' },
    { emoji: '🔥', keywords: ['fire', 'hot', 'flame', 'trending'], category: 'Symbols' },
    { emoji: '⚡', keywords: ['lightning', 'electric', 'power', 'fast'], category: 'Symbols' },
    { emoji: '💎', keywords: ['diamond', 'gem', 'precious', 'jewel'], category: 'Symbols' },
    { emoji: '🎁', keywords: ['gift', 'present', 'birthday', 'wrapped'], category: 'Symbols' },
    { emoji: '🏆', keywords: ['trophy', 'winner', 'award', 'champion'], category: 'Symbols' },
    { emoji: '🎀', keywords: ['ribbon', 'bow', 'gift', 'cute'], category: 'Symbols' },
    { emoji: '💰', keywords: ['money', 'bag', 'cash', 'rich'], category: 'Symbols' },
    { emoji: '💵', keywords: ['dollar', 'money', 'cash', 'bill'], category: 'Symbols' },
    { emoji: '📍', keywords: ['location', 'pin', 'map', 'place'], category: 'Symbols' },
    { emoji: '🏷️', keywords: ['tag', 'label', 'price', 'sale'], category: 'Symbols' },
]

const categories = ['All', 'Objects', 'Food', 'Travel', 'Activities', 'Symbols'] as const

export function EmojiPicker({ onEmojiSelect, selectedEmoji, onClose }: EmojiPickerProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<typeof categories[number]>('All')

    const filteredEmojis = useMemo(() => {
        let emojis = emojiData

        // Filter by category
        if (activeCategory !== 'All') {
            emojis = emojis.filter(e => e.category === activeCategory)
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            emojis = emojiData.filter(e =>
                e.keywords.some(k => k.includes(query)) ||
                e.emoji === query
            )
        }

        return emojis
    }, [searchQuery, activeCategory])

    return (
        <div className="bg-white rounded-xl border border-border-light shadow-lg overflow-hidden w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                <h3 className="font-display text-[16px] font-semibold text-text-primary">
                    Choose Icon
                </h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-bg-surface rounded-lg transition-colors"
                    >
                        <X size={18} className="text-text-tertiary" />
                    </button>
                )}
            </div>

            {/* Search Input */}
            <div className="px-3 py-2 border-b border-border-light">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                        type="text"
                        placeholder="Search emojis..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-[14px] bg-bg-surface rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-accent-aqua/50 focus:border-accent-aqua"
                    />
                </div>
            </div>

            {/* Category Tabs (hidden when searching) */}
            {!searchQuery && (
                <div className="flex gap-1 px-2 py-2 border-b border-border-light overflow-x-auto no-scrollbar">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${activeCategory === category
                                ? 'bg-text-primary text-white'
                                : 'text-text-secondary hover:bg-bg-surface'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji Grid */}
            <div className="p-3 max-h-[280px] overflow-y-auto">
                {filteredEmojis.length > 0 ? (
                    <div className="grid grid-cols-8 gap-2">
                        {filteredEmojis.map(({ emoji }) => (
                            <button
                                key={emoji}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onEmojiSelect(emoji)
                                }}
                                className={`w-10 h-10 flex items-center justify-center text-2xl rounded-lg transition-all hover:bg-bg-surface ${selectedEmoji === emoji
                                    ? 'bg-accent-aqua/10 ring-2 ring-accent-aqua'
                                    : ''
                                    }`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center text-text-tertiary text-[14px]">
                        No emojis found for "{searchQuery}"
                    </div>
                )}
            </div>

            {/* Footer with Clear button */}
            {selectedEmoji && (
                <div className="px-4 py-3 border-t border-border-light flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{selectedEmoji}</span>
                        <span className="text-[13px] text-text-secondary">Selected</span>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEmojiSelect('')}
                    >
                        Clear
                    </Button>
                </div>
            )}
        </div>
    )
}
