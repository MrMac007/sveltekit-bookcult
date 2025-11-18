<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import JoinGroupForm from '$lib/components/groups/join-group-form.svelte';
</script>

<AppLayout title="Join Group">
	<div class="mx-auto max-w-2xl px-4 py-6">
		<JoinGroupForm />
	</div>
</AppLayout>
