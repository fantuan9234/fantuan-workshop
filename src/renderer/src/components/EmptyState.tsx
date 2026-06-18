interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && (
        <div className="w-16 h-16 rounded-2xl themed-bg-card flex items-center justify-center themed-text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold themed-text-primary text-center">{title}</h3>
      {description && (
        <p className="text-base themed-text-dimmed mt-2 text-center max-w-sm">{description}</p>
      )}
      <div className="mt-6 flex items-center gap-3">
        {action && (
          <button onClick={action.onClick}
            className="px-5 py-2 rounded-lg themed-btn-primary text-base font-medium transition-colors">
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button onClick={secondaryAction.onClick}
            className="px-5 py-2 rounded-lg text-base themed-text-muted border themed-border-primary hover:themed-border-hover transition-colors">
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}