import { redirect, json } from '@sveltejs/kit';
import { createClient } from '$lib/supabase/server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	try {
		// Use the supabase client from locals if available, otherwise create a new one
		const supabase = event.locals.supabase || createClient(event);
		const { error } = await supabase.auth.signOut();
		
		if (error) {
			console.error('Sign out error:', error);
			return json({ error: error.message }, { status: 500 });
		}
		
		throw redirect(303, '/');
	} catch (err) {
		// If it's a redirect, re-throw it
		if (err instanceof Response && err.status >= 300 && err.status < 400) {
			throw err;
		}
		console.error('Unexpected sign out error:', err);
		return json({ error: 'Failed to sign out' }, { status: 500 });
	}
};
