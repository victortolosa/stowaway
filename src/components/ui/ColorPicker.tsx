import { Check } from 'lucide-react'

interface ColorPickerProps {
    colors: string[]
    selectedColor: string
    onColorSelect: (color: string) => void
    defaultColor: string
    label?: string
}

export function ColorPicker({ colors, selectedColor, onColorSelect, defaultColor, label }: ColorPickerProps) {
    return (
        <div className="space-y-3">
            {label && (
                <label className="block text-sm font-medium text-text-primary">
                    {label}
                </label>
            )}

            <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => {
                    const isSelected = selectedColor === color
                    const isDefault = color === defaultColor

                    return (
                        <button
                            key={color}
                            type="button"
                            onClick={() => onColorSelect(color)}
                            className={`relative w-full aspect-square rounded-lg transition-all ${isSelected
                                    ? 'ring-2 ring-offset-2 ring-text-primary scale-105'
                                    : 'hover:scale-105'
                                }`}
                            style={{ backgroundColor: color }}
                            title={isDefault ? 'Default color' : color}
                        >
                            {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Check size={20} className="text-white drop-shadow-lg" strokeWidth={3} />
                                </div>
                            )}
                            {isDefault && !isSelected && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-text-primary rounded-full border-2 border-white" />
                            )}
                        </button>
                    )
                })}
            </div>

            <p className="text-xs text-text-secondary">
                Tip: The color with a dot is the default color for this type
            </p>
        </div>
    )
}
