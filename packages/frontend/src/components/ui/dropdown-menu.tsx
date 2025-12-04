import React, { useState, useRef, useEffect } from 'react'
import { cn } from './button'

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  className?: string
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  align?: 'start' | 'end' | 'center'
  side?: 'top' | 'bottom'
  className?: string
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  variant?: 'default' | 'destructive'
}

const DropdownContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({ isOpen: false, setIsOpen: () => {} })

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export function DropdownMenuTrigger({ children, className, asChild }: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen } = React.useContext(DropdownContext)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      className: cn(children.props.className, className),
      'aria-expanded': isOpen
    })
  }

  return (
    <button
      onClick={handleClick}
      className={cn("inline-flex justify-center w-full", className)}
      aria-expanded={isOpen}
    >
      {children}
    </button>
  )
}

export function DropdownMenuContent({ children, align = 'end', side = 'bottom', className }: DropdownMenuContentProps) {
  const { isOpen } = React.useContext(DropdownContext)

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "absolute z-50 min-w-[8rem] w-56 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-md animate-in fade-in-0 zoom-in-95",
        {
          'right-0': align === 'end',
          'left-0': align === 'start',
          'left-1/2 -translate-x-1/2': align === 'center',
          'top-full mt-2 origin-top-right': side === 'bottom',
          'bottom-full mb-2 origin-bottom-right': side === 'top',
        },
        className
      )}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ children, onClick, className, disabled, variant = 'default' }: DropdownMenuItemProps) {
  const { setIsOpen } = React.useContext(DropdownContext)

  return (
    <button
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (disabled) return
        onClick?.()
        setIsOpen(false)
      }}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-800 focus:bg-zinc-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        variant === 'destructive' ? "text-red-500 hover:text-red-400 hover:bg-red-900/10 focus:bg-red-900/10" : "text-zinc-200",
        className
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("px-2 py-1.5 text-sm font-semibold text-zinc-400", className)}>
      {children}
    </div>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <div className={cn("-mx-1 my-1 h-px bg-zinc-800", className)} />
  )
}
