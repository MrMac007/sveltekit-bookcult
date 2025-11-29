<script lang="ts">
	import { page, navigating } from '$app/stores';
	import { Home, BookMarked, Activity, Users, UserCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	const navItems = [
		{
			name: 'Discover',
			href: '/discover',
			icon: Home
		},
		{
			name: 'My Books',
			href: '/my-books',
			icon: BookMarked
		},
		{
			name: 'Feed',
			href: '/feed',
			icon: Activity
		},
		{
			name: 'Groups',
			href: '/groups',
			icon: Users
		},
		{
			name: 'Profile',
			href: '/profile',
			icon: UserCircle
		}
	];

	let pathname = $derived($page.url.pathname);
	// If navigating, show the destination as active immediately for instant feedback
	let activePathname = $derived($navigating?.to?.url.pathname ?? pathname);
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-xl safe-bottom"
>
	<div class="mx-auto grid h-16 w-full max-w-md grid-cols-5">
		{#each navItems as item}
			{@const isActive = activePathname === item.href}
			{@const Icon = item.icon}

			<a
				href={item.href}
				class={cn(
					'tap-target flex h-full w-full flex-col items-center justify-center gap-1 transition-colors active:scale-95',
					isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
				)}
			>
				<Icon
					class={cn('h-6 w-6 transition-transform duration-200', isActive && '-translate-y-0.5 scale-110')}
					strokeWidth={isActive ? 2.5 : 2}
				/>
				<span class="text-[10px] font-medium tracking-wide">{item.name}</span>
			</a>
		{/each}
	</div>
</nav>
