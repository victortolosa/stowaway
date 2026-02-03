import { useState } from 'react'
import { Card } from '@/components/ui'
import { Printer } from 'lucide-react'
import { BatchPrintModal } from '@/components/BatchPrintModal'

export function Tools() {
  const [showBatchPrint, setShowBatchPrint] = useState(false)

  const tools = [
    {
      id: 'batch-print',
      title: 'Batch Print',
      description: 'Print multiple QR codes at once',
      icon: Printer,
      color: '#14B8A6',
      onClick: () => setShowBatchPrint(true)
    },
    // More tools can be added here in the future
  ]

  return (
    <div className="flex flex-col gap-6 pb-32">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
          Tools
        </h1>
        <p className="font-body text-[15px] text-text-secondary">
          Helpful utilities for managing your inventory
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Card
              key={tool.id}
              variant="interactive"
              onClick={tool.onClick}
              padding="none"
              className="w-full"
            >
              <div className="flex items-center gap-4 p-6">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: tool.color + '15' }}
                >
                  <Icon size={28} style={{ color: tool.color }} strokeWidth={2} />
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  <h3 className="font-display text-[17px] font-semibold text-text-primary">
                    {tool.title}
                  </h3>
                  <p className="font-body text-[14px] text-text-secondary">
                    {tool.description}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {showBatchPrint && (
        <BatchPrintModal
          isOpen={showBatchPrint}
          onClose={() => setShowBatchPrint(false)}
        />
      )}
    </div>
  )
}
