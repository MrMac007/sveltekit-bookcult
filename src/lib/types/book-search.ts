export type BookSearchSource = 'database' | 'openlib';

export interface BookSearchResult {
	/** Database UUID when the book already exists */
	id?: string;
	open_library_key: string;
	title: string;
	authors: string[];
	cover_url: string | null;
	first_publish_year?: number;
	source?: BookSearchSource;
}
