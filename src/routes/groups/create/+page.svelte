<script lang="ts">
	import AppLayout from '$lib/components/layout/app-layout.svelte';
	import CreateGroupForm from '$lib/components/groups/create-group-form.svelte';
</script>

<AppLayout title="Create Group">
	<div class="mx-auto max-w-2xl px-4 py-6">
		<CreateGroupForm />
	</div>
</AppLayout>
