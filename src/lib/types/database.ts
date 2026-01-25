export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WallStyle = 'sticky-notes' | 'typewriter' | 'constellation'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          wall_style: WallStyle | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          wall_style?: WallStyle
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          wall_style?: WallStyle
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          admin_id: string
          invite_code: string
          created_at: string
          is_private: boolean
          current_book_id: string | null
          current_book_deadline: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          admin_id: string
          invite_code: string
          created_at?: string
          is_private?: boolean
          current_book_id?: string | null
          current_book_deadline?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          admin_id?: string
          invite_code?: string
          created_at?: string
          is_private?: boolean
          current_book_id?: string | null
          current_book_deadline?: string | null
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          joined_at: string
          role: 'member' | 'admin'
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          joined_at?: string
          role?: 'member' | 'admin'
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          joined_at?: string
          role?: 'member' | 'admin'
        }
      }
      group_books: {
        Row: {
          id: string
          group_id: string
          book_id: string
          added_by: string
          added_at: string
          display_order: number | null
        }
        Insert: {
          id?: string
          group_id: string
          book_id: string
          added_by: string
          added_at?: string
          display_order?: number | null
        }
        Update: {
          id?: string
          group_id?: string
          book_id?: string
          added_by?: string
          added_at?: string
          display_order?: number | null
        }
      }
      books: {
        Row: {
          id: string
          google_books_id: string | null
          open_library_key: string | null
          isbn_13: string | null
          isbn_10: string | null
          title: string
          authors: string[]
          publisher: string | null
          published_date: string | null
          description: string | null
          page_count: number | null
          cover_url: string | null
          categories: string[]
          language: string | null
          last_updated: string
          ai_enhanced: boolean
          ai_enhanced_at: string | null
          // Open Library engagement fields
          edition_count: number | null
          ratings_average: number | null
          ratings_count: number | null
          want_to_read_count: number | null
          currently_reading_count: number | null
          already_read_count: number | null
          popularity_score: number | null
          first_publish_year: number | null
        }
        Insert: {
          id?: string
          google_books_id?: string | null
          open_library_key?: string | null
          isbn_13?: string | null
          isbn_10?: string | null
          title: string
          authors?: string[]
          publisher?: string | null
          published_date?: string | null
          description?: string | null
          page_count?: number | null
          cover_url?: string | null
          categories?: string[]
          language?: string | null
          last_updated?: string
          ai_enhanced?: boolean
          ai_enhanced_at?: string | null
          // Open Library engagement fields
          edition_count?: number | null
          ratings_average?: number | null
          ratings_count?: number | null
          want_to_read_count?: number | null
          currently_reading_count?: number | null
          already_read_count?: number | null
          popularity_score?: number | null
          first_publish_year?: number | null
        }
        Update: {
          id?: string
          google_books_id?: string | null
          open_library_key?: string | null
          isbn_13?: string | null
          isbn_10?: string | null
          title?: string
          authors?: string[]
          publisher?: string | null
          published_date?: string | null
          description?: string | null
          page_count?: number | null
          cover_url?: string | null
          categories?: string[]
          language?: string | null
          last_updated?: string
          ai_enhanced?: boolean
          ai_enhanced_at?: string | null
          // Open Library engagement fields
          edition_count?: number | null
          ratings_average?: number | null
          ratings_count?: number | null
          want_to_read_count?: number | null
          currently_reading_count?: number | null
          already_read_count?: number | null
          popularity_score?: number | null
          first_publish_year?: number | null
        }
      }
      wishlists: {
        Row: {
          id: string
          user_id: string
          book_id: string
          added_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          added_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          added_at?: string
          notes?: string | null
        }
      }
      completed_books: {
        Row: {
          id: string
          user_id: string
          book_id: string
          completed_at: string
          date_confirmed: boolean
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          completed_at?: string
          date_confirmed?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          completed_at?: string
          date_confirmed?: boolean
        }
      }
      ratings: {
        Row: {
          id: string
          user_id: string
          book_id: string
          rating: number
          review: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          rating: number
          review?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          rating?: number
          review?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          activity_type: 'wishlist_add' | 'book_complete' | 'rating_create' | 'rating_update' | 'group_book_add' | 'reading_started'
          book_id: string
          rating_id: string | null
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: 'wishlist_add' | 'book_complete' | 'rating_create' | 'rating_update' | 'group_book_add' | 'reading_started'
          book_id: string
          rating_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: 'wishlist_add' | 'book_complete' | 'rating_create' | 'rating_update' | 'group_book_add' | 'reading_started'
          book_id?: string
          rating_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
      }
      currently_reading: {
        Row: {
          id: string
          user_id: string
          book_id: string
          started_at: string
          group_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          started_at?: string
          group_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          started_at?: string
          group_id?: string | null
        }
      }
      recommendations_cache: {
        Row: {
          id: string
          user_id: string
          recommendations: Json
          generated_at: string
          expires_at: string
          wishlist_adds_since_generation: number
          last_auto_refresh_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recommendations: Json
          generated_at?: string
          expires_at: string
          wishlist_adds_since_generation?: number
          last_auto_refresh_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recommendations?: Json
          generated_at?: string
          expires_at?: string
          wishlist_adds_since_generation?: number
          last_auto_refresh_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_quotes: {
        Row: {
          id: string
          user_id: string
          book_id: string
          quote_text: string
          page_number: number | null
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          quote_text: string
          page_number?: number | null
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          quote_text?: string
          page_number?: number | null
          display_order?: number
          created_at?: string
        }
      }
      favorite_books: {
        Row: {
          id: string
          user_id: string
          book_id: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          display_order: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          display_order?: number
          created_at?: string
        }
      }
      reading_goals: {
        Row: {
          id: string
          user_id: string
          year: number
          target: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          target: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          target?: number
          created_at?: string
        }
      }
      group_reading_goals: {
        Row: {
          id: string
          group_id: string
          year: number
          target: number
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          year: number
          target: number
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          year?: number
          target?: number
          created_at?: string
        }
      }
      group_suggestion_rounds: {
        Row: {
          id: string
          group_id: string
          status: 'open' | 'revealed'
          created_at: string
          revealed_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          status?: 'open' | 'revealed'
          created_at?: string
          revealed_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          status?: 'open' | 'revealed'
          created_at?: string
          revealed_at?: string | null
        }
      }
      group_suggestions: {
        Row: {
          id: string
          round_id: string
          user_id: string
          book_id: string
          rank: number
          created_at: string
        }
        Insert: {
          id?: string
          round_id: string
          user_id: string
          book_id: string
          rank: number
          created_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          user_id?: string
          book_id?: string
          rank?: number
          created_at?: string
        }
      }
      group_suggestion_results: {
        Row: {
          id: string
          round_id: string
          book_id: string
          final_rank: number
          base_score: number
          overlap_bonus: number
          total_score: number
          member_count: number
        }
        Insert: {
          id?: string
          round_id: string
          book_id: string
          final_rank: number
          base_score: number
          overlap_bonus: number
          total_score: number
          member_count: number
        }
        Update: {
          id?: string
          round_id?: string
          book_id?: string
          final_rank?: number
          base_score?: number
          overlap_bonus?: number
          total_score?: number
          member_count?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
