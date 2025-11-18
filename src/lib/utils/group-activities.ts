export type ActivityType =
  | 'wishlist_add'
  | 'book_complete'
  | 'rating_create'
  | 'rating_update'
  | 'group_book_add'
  | 'reading_started'

export interface ActivityProfile {
  id: string
  username: string
  display_name: string | null
}

export interface Activity {
  id: string
  user_id: string
  activity_type: ActivityType
  created_at: string
  book_id?: string | null
  metadata: Record<string, any>
  profiles: ActivityProfile | null
}

export interface ActivityGroup {
  book_id: string
  book_title: string
  book_cover?: string | null
  book_authors?: string[]
  activities: Activity[]
  mostRecentDate: string
  oldestDate: string
}

export type FeedItem = Activity | ActivityGroup

export function isActivityGroup(item: FeedItem): item is ActivityGroup {
  return 'activities' in item && Array.isArray((item as ActivityGroup).activities)
}

const GROUPING_WINDOW_DAYS = 7
const MIN_ACTIVITIES_TO_GROUP = 2

export function groupActivitiesByBook(activities: Activity[]): FeedItem[] {
  if (!activities?.length) return []

  const bookGroups = new Map<string, Activity[]>()

  for (const activity of activities) {
    const bookId = activity.book_id || activity.metadata?.book_id
    if (!bookId) {
      continue
    }

    if (!bookGroups.has(bookId)) {
      bookGroups.set(bookId, [])
    }
    bookGroups.get(bookId)!.push(activity)
  }

  const result: FeedItem[] = []
  const windowMs = GROUPING_WINDOW_DAYS * 24 * 60 * 60 * 1000

  for (const [bookId, bookActivities] of bookGroups.entries()) {
    if (bookActivities.length < MIN_ACTIVITIES_TO_GROUP) {
      result.push(...bookActivities)
      continue
    }

    bookActivities.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const mostRecent = new Date(bookActivities[0].created_at)
    const oldest = new Date(bookActivities[bookActivities.length - 1].created_at)
    const timeDiff = mostRecent.getTime() - oldest.getTime()

    if (timeDiff <= windowMs) {
      const firstActivity = bookActivities[0]
      result.push({
        book_id: bookId,
        book_title: firstActivity.metadata?.book_title || 'Unknown Book',
        book_cover: firstActivity.metadata?.book_cover || null,
        book_authors: firstActivity.metadata?.book_authors || [],
        activities: bookActivities,
        mostRecentDate: mostRecent.toISOString(),
        oldestDate: oldest.toISOString(),
      })
    } else {
      result.push(...bookActivities)
    }
  }

  result.sort((a, b) => {
    const dateA = isActivityGroup(a)
      ? new Date(a.mostRecentDate)
      : new Date(a.created_at)
    const dateB = isActivityGroup(b)
      ? new Date(b.mostRecentDate)
      : new Date(b.created_at)
    return dateB.getTime() - dateA.getTime()
  })

  return result
}
