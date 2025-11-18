<script lang="ts">
  import { cn } from '$lib/utils';

  type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';
  type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

  interface Props {
    variant?: ButtonVariant;
    size?: ButtonSize;
    class?: string;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    href?: string;
    rel?: string;
    target?: string;
    children: import('svelte').Snippet;
  }

  let {
    variant = 'default',
    size = 'default',
    class: className,
    disabled = false,
    type = 'button',
    onclick,
    href,
    rel,
    target,
    children
  }: Props = $props();

  const variants = {
    default:
      'bg-primary text-primary-foreground hover:bg-primary/90',
    outline:
      'border border-border bg-card text-foreground hover:bg-muted/60',
    ghost:
      'bg-transparent text-foreground hover:bg-muted/40',
    destructive:
      'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300/60'
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-11 px-6',
    icon: 'h-9 w-9'
  };
</script>

<svelte:element
  this={href ? 'a' : 'button'}
  type={href ? undefined : type}
  disabled={href ? undefined : disabled}
  aria-disabled={href && disabled ? 'true' : undefined}
  tabindex={href && disabled ? -1 : undefined}
  href={href}
  rel={href ? rel : undefined}
  target={href ? target : undefined}
  on:click={onclick}
  class={cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    href && disabled ? 'pointer-events-none opacity-50' : undefined,
    variants[variant],
    sizes[size],
    className
  )}
>
  {@render children()}
</svelte:element>
