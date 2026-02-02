import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '$lib/supabase/server';

export async function requireUser(event: RequestEvent) {
	const supabase = createClient(event);
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		throw redirect(303, '/login');
	}

	return { supabase, user };
}
