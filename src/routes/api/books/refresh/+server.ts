import { openLibraryAPI } from '$lib/api/open-library';
import { createClient } from '$lib/supabase/server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type BookRow = {
  id: string;
  title: string | null;
  authors: string[] | null;
  description: string | null;
  categories: string[] | null;
  published_date: string | null;
  publisher: string | null;
  isbn_13: string | null;
  isbn_10: string | null;
  cover_url: string | null;
  page_count: number | null;
  open_library_key: string | null;
};

type RefreshRequestBody = {
  bookId?: string;
};

function mergePrefer<T>(current: T | null | undefined, incoming: T | null | undefined): T | null | undefined {
  return incoming !== undefined && incoming !== null && incoming !== '' ? incoming : current;
}

function mergeArrayPrefer<T>(current: T[] | null | undefined, incoming: T[] | null | undefined): T[] | null | undefined {
  return incoming && incoming.length > 0 ? incoming : current;
}

export const POST: RequestHandler = async (event) => {
  const supabase = createClient(event);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: 'You must be logged in to refresh books' }, { status: 401 });
  }

  let body: RefreshRequestBody | null = null;
  try {
    body = (await event.request.json()) as RefreshRequestBody;
  } catch {
    body = null;
  }

  const bookId = body?.bookId;
  if (!bookId) {
    return json({ error: 'Book ID is required' }, { status: 400 });
  }

  const { data: bookData, error: fetchError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (fetchError || !bookData) {
    return json({ error: 'Book not found' }, { status: 404 });
  }

  const book = bookData as BookRow;
  let openLibraryKey = book.open_library_key || null;

  let olBook = null;
  if (openLibraryKey) {
    olBook = await openLibraryAPI.getBookDetails(openLibraryKey);
  }

  if (!olBook && book.title) {
    const author = book.authors && book.authors.length > 0 ? book.authors[0] : undefined;
    const candidates = await openLibraryAPI.searchAndNormalize(book.title, 5, author);
    olBook = candidates[0] || null;
    openLibraryKey = olBook?.open_library_key || openLibraryKey;
  }

  if (!olBook) {
    return json({ error: 'No matching book found from Open Library' }, { status: 404 });
  }

  const updatePayload = {
    title: mergePrefer(book.title, olBook.title),
    authors: mergeArrayPrefer(book.authors, olBook.authors),
    description: mergePrefer(book.description, olBook.description),
    categories: mergeArrayPrefer(book.categories, olBook.categories),
    published_date: mergePrefer(book.published_date, olBook.published_date),
    publisher: mergePrefer(book.publisher, olBook.publisher),
    isbn_13: mergePrefer(book.isbn_13, olBook.isbn_13),
    isbn_10: mergePrefer(book.isbn_10, olBook.isbn_10),
    cover_url: mergePrefer(book.cover_url, olBook.cover_url),
    page_count: mergePrefer(book.page_count, olBook.page_count),
    open_library_key: mergePrefer(book.open_library_key, openLibraryKey),
    last_updated: new Date().toISOString(),
  };

  const { data: updatedBook, error: updateError } = await supabase
    .from('books')
    .update(updatePayload)
    .eq('id', bookId)
    .select()
    .single();

  if (updateError) {
    console.error('[refresh-book] Error updating book:', updateError);
    return json({ error: 'Failed to update book' }, { status: 500 });
  }

  return json({ success: true, book: updatedBook });
};
