<script lang="ts">
	import { page } from '$app/stores';
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
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-gradient-to-t from-background/95 via-background/90 to-background/80 backdrop-blur-xl safe-bottom"
>
	<div class="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
		{#each navItems as item}
			{@const isActive = pathname === item.href}
			{@const Icon = item.icon}

			<a
				href={item.href}
				class={cn(
					'tap-target flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 text-xs font-medium transition-all',
					isActive
						? 'bg-primary/10 text-primary ring-1 ring-primary/20'
						: 'text-muted-foreground hover:text-foreground hover:bg-card/60'
				)}
			>
				<Icon class={cn('h-5 w-5', isActive && 'text-emerald-700')} />
				<span class="uppercase tracking-wide">{item.name}</span>
			</a>
		{/each}
	</div>
</nav>
