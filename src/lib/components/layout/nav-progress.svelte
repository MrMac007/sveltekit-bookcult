<script lang="ts">
	import { navigating } from '$app/stores';
</script>

{#if $navigating}
	<div class="nav-progress">
		<div class="nav-progress-bar"></div>
	</div>
{/if}

<style>
	.nav-progress {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		z-index: 9999;
		overflow: hidden;
		background: transparent;
	}

	.nav-progress-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 50%, var(--primary) 100%);
		background-size: 200% 100%;
		animation: progress 1.5s ease-in-out infinite, shimmer 2s linear infinite;
		transform-origin: left;
	}

	@keyframes progress {
		0% {
			width: 0%;
		}
		20% {
			width: 30%;
		}
		50% {
			width: 60%;
		}
		80% {
			width: 85%;
		}
		100% {
			width: 95%;
		}
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>

