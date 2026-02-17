"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

import { createPortal } from "react-dom";

const DropdownMenuContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
} | null>(null);

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DropdownMenu = ({ children, open: controlledOpen, onOpenChange }: DropdownMenuProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setInternalOpen(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange]
  );
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
};

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(function DropdownMenuTrigger({ children, asChild, onClick, ...props }, ref) {
  const ctx = React.useContext(DropdownMenuContext);
  const internalRef = React.useRef<HTMLButtonElement>(null);

  const setRefs = React.useCallback(
    (node: HTMLButtonElement | null) => {
      (internalRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      if (ctx) (ctx.triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    },
    [ref, ctx]
  );

  if (!ctx) return null;
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    ctx.setOpen(!ctx.open);
    onClick?.(e);
  };
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      ref: setRefs,
      onClick: handleClick,
    } as Record<string, unknown>);
  }
  return (
    <button ref={setRefs} type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
});

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function DropdownMenuContent({ className, children, ...props }, ref) {
  const ctx = React.useContext(DropdownMenuContext);
  const divRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!ctx?.open) return;

    // Position relative to trigger
    if (ctx.triggerRef.current) {
      const rect = ctx.triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right });
    }

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        divRef.current && !divRef.current.contains(target) &&
        ctx.triggerRef.current && !ctx.triggerRef.current.contains(target)
      ) {
        ctx.setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [ctx?.open, ctx]);

  if (!ctx?.open) return null;

  return createPortal(
    <div
      ref={(node) => {
        (divRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateX(-100%)" }}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-card p-1 shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
});

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean; disabled?: boolean }
>(function DropdownMenuItem({ className, asChild, children, onClick, disabled, ...props }, ref) {
  const ctx = React.useContext(DropdownMenuContext);
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onClick?.(e);
    ctx?.setOpen(false);
  };
  const comp = (
    <div
      ref={ref}
      role="menuitem"
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
  if (asChild && React.isValidElement(children)) {
    const childProps = (children as React.ReactElement<{ className?: string; onClick?: (e: React.MouseEvent) => void }>).props;
    return React.cloneElement(children as React.ReactElement, {
      className: cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted",
        childProps?.className,
        className
      ),
      onClick: (e: React.MouseEvent) => {
        ctx?.setOpen(false);
        childProps?.onClick?.(e);
      },
    } as Record<string, unknown>);
  }
  return comp;
});

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
