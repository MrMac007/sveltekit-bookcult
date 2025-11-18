import { createClient } from '$lib/supabase/server';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Create Supabase client with event
	const supabase = createClient(event);
	event.locals.supabase = supabase;

	// Get session and user
	const {
		data: { session }
	} = await supabase.auth.getSession();
	
	event.locals.session = session;
	const user = session?.user ?? null;

	// Protected routes
	const protectedRoutes = [
		'/discover',
		'/groups',
		'/profile',
		'/my-books',
		'/wishlist',
		'/completed',
		'/currently-reading',
		'/feed',
		'/users',
		'/book',
		'/rate'
	];

	// Auth routes (redirect if logged in)
	const authRoutes = ['/login', '/signup'];

	const path = event.url.pathname;
	const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
	const isAuthRoute = authRoutes.some((route) => path.startsWith(route));

	// Redirect to login if accessing protected route without auth
	if (!user && isProtectedRoute) {
		const redirectTo = path + event.url.search;
		throw redirect(303, `/login?redirect=${encodeURIComponent(redirectTo)}`);
	}

	// Redirect to discover if already authenticated and trying to access auth pages
	if (user && isAuthRoute) {
		throw redirect(303, '/discover');
	}

	const response = await resolve(event);
	return response;
};
