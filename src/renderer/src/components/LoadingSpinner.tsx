interface LoadingSpinnerProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ text, size = 'md' }: LoadingSpinnerProps): JSX.Element {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${sizeMap[size]} border-2 themed-border-secondary border-t-[#07c160] rounded-full animate-spin`} />
      {text && <p className="text-sm themed-text-muted">{text}</p>}
    </div>
  )
}
