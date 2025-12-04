import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
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
  triggerRef: React.RefObject<HTMLElement>
  contentRef: React.RefObject<HTMLDivElement>
}>({ 
  isOpen: false, 
  setIsOpen: () => {},
  triggerRef: { current: null },
  contentRef: { current: null }
})

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && 
        !triggerRef.current.contains(event.target as Node) &&
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef, contentRef }}>
      {children}
    </DropdownContext.Provider>
  )
}

export function DropdownMenuTrigger({ children, className, asChild }: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen, triggerRef } = React.useContext(DropdownContext)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: triggerRef,
      onClick: handleClick,
      className: cn(children.props.className, className),
      'aria-expanded': isOpen
    })
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      onClick={handleClick}
      className={cn("inline-flex justify-center w-full", className)}
      aria-expanded={isOpen}
    >
      {children}
    </button>
  )
}

export function DropdownMenuContent({ children, align = 'end', side = 'bottom', className }: DropdownMenuContentProps) {
  const { isOpen, triggerRef, contentRef } = React.useContext(DropdownContext)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      
      const newStyle: React.CSSProperties = {
        position: 'fixed',
        zIndex: 50,
      }

      // Vertical positioning
      if (side === 'bottom') {
        newStyle.top = rect.bottom + 8
      } else {
        newStyle.bottom = window.innerHeight - rect.top + 8
      }

      // Horizontal positioning
      if (align === 'end') {
        newStyle.left = rect.right
        newStyle.transform = 'translateX(-100%)'
      } else if (align === 'start') {
        newStyle.left = rect.left
        newStyle.transform = 'translateX(0)'
      } else {
        newStyle.left = rect.left + (rect.width / 2)
        newStyle.transform = 'translateX(-50%)'
      }

      setStyle(newStyle)
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, align, side])

  if (!isOpen) return null

  return createPortal(
    <div
      ref={contentRef}
      style={style}
      className={cn(
        "min-w-[8rem] w-56 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {children}
    </div>,
    document.body
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
