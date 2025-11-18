// Utility to group activities by book within a time window

export interface Activity {
  id: string;
  user_id: string;
  activity_type: 'wishlist_add' | 'book_complete' | 'rating_create' | 'rating_update' | 'group_book_add';
  created_at: string;
  book_id?: string;
  metadata: {
    book_title?: string;
    book_cover?: string;
    book_authors?: string[];
    [key: string]: any;
  };
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
}

export interface ActivityGroup {
  book_id: string;
  book_title: string;
  book_cover?: string;
  book_authors?: string[];
  activities: Activity[];
  mostRecentDate: Date;
  oldestDate: Date;
}

export type FeedItem = Activity | ActivityGroup;

export function isActivityGroup(item: FeedItem): item is ActivityGroup {
  return 'activities' in item && Array.isArray((item as any).activities);
}

const GROUPING_WINDOW_DAYS = 7;
const MIN_ACTIVITIES_TO_GROUP = 2;

export function groupActivitiesByBook(activities: Activity[]): FeedItem[] {
  if (!activities || activities.length === 0) return [];

  // Group activities by book_id
  const bookGroups = new Map<string, Activity[]>();

  activities.forEach(activity => {
    const bookId = activity.book_id || activity.metadata.book_id;
    if (!bookId) {
      // Activities without book_id go straight to result (shouldn't happen but safety check)
      return;
    }

    if (!bookGroups.has(bookId)) {
      bookGroups.set(bookId, []);
    }
    bookGroups.get(bookId)!.push(activity);
  });

  const result: FeedItem[] = [];
  const now = new Date();
  const windowMs = GROUPING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Process each book group
  bookGroups.forEach((bookActivities, bookId) => {
    if (bookActivities.length < MIN_ACTIVITIES_TO_GROUP) {
      // Not enough activities to group, add individually
      result.push(...bookActivities);
      return;
    }

    // Sort activities by date (newest first)
    bookActivities.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const mostRecent = new Date(bookActivities[0].created_at);
    const oldest = new Date(bookActivities[bookActivities.length - 1].created_at);

    // Check if all activities are within the time window
    const timeDiff = mostRecent.getTime() - oldest.getTime();

    if (timeDiff <= windowMs) {
      // Group these activities
      const firstActivity = bookActivities[0];
      result.push({
        book_id: bookId,
        book_title: firstActivity.metadata.book_title || 'Unknown Book',
        book_cover: firstActivity.metadata.book_cover,
        book_authors: firstActivity.metadata.book_authors,
        activities: bookActivities,
        mostRecentDate: mostRecent,
        oldestDate: oldest,
      });
    } else {
      // Activities span too long, add individually
      result.push(...bookActivities);
    }
  });

  // Sort result by most recent activity
  result.sort((a, b) => {
    const dateA = isActivityGroup(a)
      ? a.mostRecentDate
      : new Date(a.created_at);
    const dateB = isActivityGroup(b)
      ? b.mostRecentDate
      : new Date(b.created_at);
    return dateB.getTime() - dateA.getTime();
  });

  return result;
}
