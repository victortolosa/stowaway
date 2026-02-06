import { MapPin, Box, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Color palettes for different object types
const COLOR_PALETTES = {
    place: ['#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6'], // teal, amber, blue, purple
    container: ['#3B82F6', '#14B8A6', '#F59E0B', '#8B5CF6', '#F97316'], // blue, teal, amber, purple, orange
    item: ['#3B82F6', '#14B8A6', '#F59E0B', '#8B5CF6', '#F97316'], // same as container
}

// Default colors for each object type (first color in palette)
export const DEFAULT_PLACE_COLOR = '#14B8A6' // teal
export const DEFAULT_CONTAINER_COLOR = '#3B82F6' // blue
export const DEFAULT_ITEM_COLOR = '#6B7280' // neutral gray

/**
 * Get the color palette for a specific object type
 */
export function getColorPalette(type: 'place' | 'container' | 'item'): string[] {
    return COLOR_PALETTES[type]
}

/**
 * Get a random color from the palette for the given type
 */
export function getRandomColor(type: 'place' | 'container' | 'item'): string {
    const palette = COLOR_PALETTES[type]
    return palette[Math.floor(Math.random() * palette.length)]
}

/**
 * Get the default icon for places
 */
export function getPlaceIcon(): LucideIcon {
    return MapPin
}

/**
 * Get the default icon for containers
 */
export function getContainerIcon(): LucideIcon {
    return Package
}

/**
 * Get the default icon for items
 */
export function getItemIcon(): LucideIcon {
    return Box
}

/**
 * Check if a string is an emoji
 * Uses a simple regex to detect common emoji ranges
 */
export function isEmoji(str: string | undefined): boolean {
    if (!str) return false

    // Regex to match emoji characters
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu
    return emojiRegex.test(str)
}

/**
 * Render an icon or emoji with the appropriate styling
 * This is a helper that components can use to display either type
 */
export function getIconDisplay(
    iconValue: string | undefined,
    defaultIcon: LucideIcon,
    color: string
): { type: 'emoji' | 'icon'; value: string | LucideIcon; color: string } {
    if (isEmoji(iconValue)) {
        return { type: 'emoji', value: iconValue!, color }
    }
    return { type: 'icon', value: defaultIcon, color }
}
