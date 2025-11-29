# BookCult iOS App Development Guide

## Overview

This guide walks you through building the BookCult iOS app in two phases:
- **Phase 1**: Core features using direct Supabase access (no web API dependencies)
- **Phase 2**: Advanced features using existing SvelteKit web APIs

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Phase 1: Direct Supabase Implementation](#phase-1-direct-supabase-implementation)
4. [Phase 2: Web API Integration](#phase-2-web-api-integration)
5. [Database Schema Reference](#database-schema-reference)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Xcode 15+** (download from Mac App Store)
- **macOS 13+**
- **Swift 5.9+** (comes with Xcode)

### Required Information
You'll need these from your SvelteKit project's `.env` file:

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Optional (for Phase 2)
- Your deployed web app URL (e.g., `https://your-app.vercel.app`)

---

## Initial Setup

### 1. Create New iOS Project

```bash
# Navigate to your projects folder
cd /Users/liam/Documents/GitHub

# Create new folder for iOS app
mkdir bookcult-ios
cd bookcult-ios
```

### 2. Create Xcode Project

1. Open Xcode
2. Click "Create New Project"
3. Select **iOS** > **App**
4. Configure:
   - **Product Name**: BookCult
   - **Team**: Your Apple Developer team (or None for local dev)
   - **Organization Identifier**: com.yourdomain (e.g., com.bookcult)
   - **Interface**: SwiftUI
   - **Language**: Swift
   - **Storage**: None (we'll use Supabase)
5. Save to `/Users/liam/Documents/GitHub/bookcult-ios`

### 3. Install Supabase Swift SDK

1. In Xcode, select your project in the navigator
2. Go to **Project Settings** > **Package Dependencies**
3. Click **+** button
4. Enter URL: `https://github.com/supabase/supabase-swift`
5. Select **Up to Next Major Version**: `2.0.0`
6. Click **Add Package**
7. Select **Supabase** library and click **Add Package**

### 4. Create Configuration File

Create a new Swift file: `Config.swift`

```swift
import Foundation

enum Config {
    static let supabaseURL = URL(string: "https://your-project.supabase.co")!
    static let supabaseAnonKey = "your-anon-key-here"

    // For Phase 2 - leave empty for now
    static let webAPIBaseURL = "" // e.g., "https://your-app.vercel.app"
}
```

**⚠️ Security Note**: For production, use Xcode configuration files or environment variables. Never commit API keys to Git.

### 5. Project Structure

Organize your project like this:

```
BookCult/
├── App/
│   └── BookCultApp.swift          # Main app entry point
│
├── Models/
│   ├── Book.swift                 # Book data model
│   ├── User.swift                 # User profile model
│   ├── Wishlist.swift             # Wishlist model
│   ├── Group.swift                # Group model
│   └── Activity.swift             # Activity feed model
│
├── Services/
│   ├── SupabaseService.swift      # Phase 1: Direct DB access
│   └── APIService.swift           # Phase 2: Web API calls
│
├── Views/
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   └── SignUpView.swift
│   │
│   ├── MyBooks/
│   │   ├── MyBooksView.swift
│   │   ├── WishlistView.swift
│   │   ├── CurrentlyReadingView.swift
│   │   └── CompletedBooksView.swift
│   │
│   ├── Groups/
│   │   ├── GroupsListView.swift
│   │   ├── GroupDetailView.swift
│   │   └── GroupMembersView.swift
│   │
│   ├── Social/
│   │   ├── ProfileView.swift
│   │   ├── ActivityFeedView.swift
│   │   └── FollowersView.swift
│   │
│   └── Shared/
│       ├── BookCardView.swift
│       └── LoadingView.swift
│
├── Config.swift                   # Configuration
└── Info.plist
```

### 6. Initialize Git Repository

```bash
cd /Users/liam/Documents/GitHub/bookcult-ios
git init
echo ".DS_Store" >> .gitignore
echo "*.xcuserstate" >> .gitignore
echo "Config.swift" >> .gitignore  # Don't commit API keys!
git add .
git commit -m "Initial iOS project setup"
```

---

## Phase 1: Direct Supabase Implementation

### Features Included in Phase 1

✅ **Authentication**
- Email/password signup and login
- Google OAuth (optional)
- Session management
- Auto profile creation

✅ **My Books**
- View Wishlist
- View Currently Reading books
- View Completed books
- Add books to lists
- Remove books from lists
- Move books between lists
- Rate and review books

✅ **Groups**
- View all available groups
- View my groups
- Join/leave groups
- View group members
- View group activity (ratings/reviews)

✅ **Social Features**
- View user profiles
- Follow/unfollow users
- View followers/following
- Activity feed (from people you follow)

✅ **Profile**
- View own profile
- Edit profile details
- Sign out

### Implementation Steps

#### Step 1: Data Models

Create `Models/Book.swift`:

```swift
import Foundation

struct Book: Codable, Identifiable {
    let id: String              // google_books_id (primary key)
    let title: String
    let authors: [String]?
    let publishedDate: String?
    let description: String?
    let thumbnail: String?
    let pageCount: Int?
    let categories: [String]?
    let isbn10: String?
    let isbn13: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id = "google_books_id"
        case title
        case authors
        case publishedDate = "published_date"
        case description
        case thumbnail
        case pageCount = "page_count"
        case categories
        case isbn10
        case isbn13
        case createdAt = "created_at"
    }

    // Computed property for author display
    var authorsDisplay: String {
        authors?.joined(separator: ", ") ?? "Unknown Author"
    }
}
```

Create `Models/User.swift`:

```swift
import Foundation

struct UserProfile: Codable, Identifiable {
    let id: UUID
    let email: String?
    let username: String?
    let fullName: String?
    let avatarUrl: String?
    let bio: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case username
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
        case bio
        case createdAt = "created_at"
    }
}
```

Create `Models/Wishlist.swift`:

```swift
import Foundation

struct WishlistItem: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let bookId: String
    let addedAt: Date
    let book: Book?  // Joined from books table

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case bookId = "book_id"
        case addedAt = "added_at"
        case book = "books"  // Supabase join syntax
    }
}

struct CurrentlyReadingItem: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let bookId: String
    let startedAt: Date
    let book: Book?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case bookId = "book_id"
        case startedAt = "started_at"
        case book = "books"
    }
}

struct CompletedBookItem: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let bookId: String
    let completedAt: Date
    let book: Book?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case bookId = "book_id"
        case completedAt = "completed_at"
        case book = "books"
    }
}
```

Create `Models/Group.swift`:

```swift
import Foundation

struct Group: Codable, Identifiable {
    let id: UUID
    let name: String
    let description: String?
    let createdBy: UUID
    let createdAt: Date
    let memberCount: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case createdBy = "created_by"
        case createdAt = "created_at"
        case memberCount = "member_count"
    }
}

struct GroupMember: Codable, Identifiable {
    let id: UUID
    let groupId: UUID
    let userId: UUID
    let joinedAt: Date
    let group: Group?
    let profile: UserProfile?

    enum CodingKeys: String, CodingKey {
        case id
        case groupId = "group_id"
        case userId = "user_id"
        case joinedAt = "joined_at"
        case group = "groups"
        case profile = "profiles"
    }
}
```

Create `Models/Activity.swift`:

```swift
import Foundation

struct Activity: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let type: String  // 'rating', 'wishlist_add', 'book_complete', etc.
    let bookId: String?
    let groupId: UUID?
    let metadata: [String: String]?
    let createdAt: Date
    let profile: UserProfile?
    let book: Book?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case type
        case bookId = "book_id"
        case groupId = "group_id"
        case metadata
        case createdAt = "created_at"
        case profile = "profiles"
        case book = "books"
    }
}
```

#### Step 2: Supabase Service

Create `Services/SupabaseService.swift`:

```swift
import Foundation
import Supabase

@MainActor
class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    let client: SupabaseClient
    @Published var currentUser: User?
    @Published var currentProfile: UserProfile?

    private init() {
        self.client = SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabaseAnonKey
        )

        // Listen for auth state changes
        Task {
            for await state in client.auth.authStateChanges {
                if case let .signedIn(session) = state.event {
                    currentUser = session.user
                    await loadCurrentProfile()
                } else {
                    currentUser = nil
                    currentProfile = nil
                }
            }
        }
    }

    // MARK: - Authentication

    func signUp(email: String, password: String) async throws {
        let response = try await client.auth.signUp(
            email: email,
            password: password
        )
        currentUser = response.user
    }

    func signIn(email: String, password: String) async throws {
        let response = try await client.auth.signIn(
            email: email,
            password: password
        )
        currentUser = response.user
    }

    func signOut() async throws {
        try await client.auth.signOut()
        currentUser = nil
        currentProfile = nil
    }

    func loadCurrentProfile() async {
        guard let userId = currentUser?.id else { return }

        do {
            let profile: UserProfile = try await client
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value

            currentProfile = profile
        } catch {
            print("Error loading profile: \(error)")
        }
    }

    // MARK: - Wishlist

    func getWishlist() async throws -> [WishlistItem] {
        guard let userId = currentUser?.id else { return [] }

        let items: [WishlistItem] = try await client
            .from("wishlists")
            .select("*, books(*)")
            .eq("user_id", value: userId.uuidString)
            .order("added_at", ascending: false)
            .execute()
            .value

        return items
    }

    func addToWishlist(bookId: String) async throws {
        guard let userId = currentUser?.id else { return }

        try await client
            .from("wishlists")
            .insert([
                "user_id": userId.uuidString,
                "book_id": bookId
            ])
            .execute()
    }

    func removeFromWishlist(itemId: UUID) async throws {
        try await client
            .from("wishlists")
            .delete()
            .eq("id", value: itemId.uuidString)
            .execute()
    }

    // MARK: - Currently Reading

    func getCurrentlyReading() async throws -> [CurrentlyReadingItem] {
        guard let userId = currentUser?.id else { return [] }

        let items: [CurrentlyReadingItem] = try await client
            .from("currently_reading")
            .select("*, books(*)")
            .eq("user_id", value: userId.uuidString)
            .order("started_at", ascending: false)
            .execute()
            .value

        return items
    }

    func startReading(bookId: String) async throws {
        guard let userId = currentUser?.id else { return }

        try await client
            .from("currently_reading")
            .insert([
                "user_id": userId.uuidString,
                "book_id": bookId
            ])
            .execute()
    }

    func stopReading(itemId: UUID) async throws {
        try await client
            .from("currently_reading")
            .delete()
            .eq("id", value: itemId.uuidString)
            .execute()
    }

    // MARK: - Completed Books

    func getCompletedBooks() async throws -> [CompletedBookItem] {
        guard let userId = currentUser?.id else { return [] }

        let items: [CompletedBookItem] = try await client
            .from("completed_books")
            .select("*, books(*)")
            .eq("user_id", value: userId.uuidString)
            .order("completed_at", ascending: false)
            .execute()
            .value

        return items
    }

    func markAsCompleted(bookId: String) async throws {
        guard let userId = currentUser?.id else { return }

        // Add to completed
        try await client
            .from("completed_books")
            .insert([
                "user_id": userId.uuidString,
                "book_id": bookId
            ])
            .execute()

        // Remove from currently reading if exists
        try? await client
            .from("currently_reading")
            .delete()
            .eq("user_id", value: userId.uuidString)
            .eq("book_id", value: bookId)
            .execute()
    }

    // MARK: - Groups

    func getAllGroups() async throws -> [Group] {
        let groups: [Group] = try await client
            .from("groups")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value

        return groups
    }

    func getMyGroups() async throws -> [GroupMember] {
        guard let userId = currentUser?.id else { return [] }

        let memberships: [GroupMember] = try await client
            .from("group_members")
            .select("*, groups(*)")
            .eq("user_id", value: userId.uuidString)
            .execute()
            .value

        return memberships
    }

    func joinGroup(groupId: UUID) async throws {
        guard let userId = currentUser?.id else { return }

        try await client
            .from("group_members")
            .insert([
                "group_id": groupId.uuidString,
                "user_id": userId.uuidString
            ])
            .execute()
    }

    func leaveGroup(groupId: UUID) async throws {
        guard let userId = currentUser?.id else { return }

        try await client
            .from("group_members")
            .delete()
            .eq("group_id", value: groupId.uuidString)
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    // MARK: - Social

    func followUser(userId: UUID) async throws {
        guard let currentUserId = currentUser?.id else { return }

        try await client
            .from("follows")
            .insert([
                "follower_id": currentUserId.uuidString,
                "following_id": userId.uuidString
            ])
            .execute()
    }

    func unfollowUser(userId: UUID) async throws {
        guard let currentUserId = currentUser?.id else { return }

        try await client
            .from("follows")
            .delete()
            .eq("follower_id", value: currentUserId.uuidString)
            .eq("following_id", value: userId.uuidString)
            .execute()
    }

    func getActivityFeed() async throws -> [Activity] {
        guard let userId = currentUser?.id else { return [] }

        // Get users I'm following
        let following: [Follow] = try await client
            .from("follows")
            .select("following_id")
            .eq("follower_id", value: userId.uuidString)
            .execute()
            .value

        let followingIds = following.map { $0.followingId.uuidString }

        // Get activities from followed users
        let activities: [Activity] = try await client
            .from("activities")
            .select("*, profiles(*), books(*)")
            .in("user_id", values: followingIds)
            .order("created_at", ascending: false)
            .limit(50)
            .execute()
            .value

        return activities
    }
}

// Helper model for follows
struct Follow: Codable {
    let followerId: UUID
    let followingId: UUID

    enum CodingKeys: String, CodingKey {
        case followerId = "follower_id"
        case followingId = "following_id"
    }
}
```

#### Step 3: Basic Views

Create `Views/Auth/LoginView.swift`:

```swift
import SwiftUI

struct LoginView: View {
    @StateObject private var supabase = SupabaseService.shared
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("BookCult")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                    .textFieldStyle(.roundedBorder)

                SecureField("Password", text: $password)
                    .textContentType(.password)
                    .textFieldStyle(.roundedBorder)

                if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                }

                Button {
                    Task { await signIn() }
                } label: {
                    if isLoading {
                        ProgressView()
                    } else {
                        Text("Sign In")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading)

                NavigationLink("Don't have an account? Sign up") {
                    SignUpView()
                }
                .font(.caption)
            }
            .padding()
        }
    }

    private func signIn() async {
        isLoading = true
        errorMessage = nil

        do {
            try await supabase.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
```

Create `Views/MyBooks/MyBooksView.swift`:

```swift
import SwiftUI

struct MyBooksView: View {
    @StateObject private var supabase = SupabaseService.shared
    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            VStack {
                Picker("List Type", selection: $selectedTab) {
                    Text("Wishlist").tag(0)
                    Text("Reading").tag(1)
                    Text("Completed").tag(2)
                }
                .pickerStyle(.segmented)
                .padding()

                switch selectedTab {
                case 0:
                    WishlistView()
                case 1:
                    CurrentlyReadingView()
                case 2:
                    CompletedBooksView()
                default:
                    EmptyView()
                }
            }
            .navigationTitle("My Books")
        }
    }
}
```

Create `Views/MyBooks/WishlistView.swift`:

```swift
import SwiftUI

struct WishlistView: View {
    @StateObject private var supabase = SupabaseService.shared
    @State private var wishlistItems: [WishlistItem] = []
    @State private var isLoading = false

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if wishlistItems.isEmpty {
                ContentUnavailableView(
                    "No Books in Wishlist",
                    systemImage: "books.vertical",
                    description: Text("Add books to your wishlist to see them here")
                )
            } else {
                List(wishlistItems) { item in
                    if let book = item.book {
                        BookRow(book: book) {
                            Task {
                                try? await supabase.removeFromWishlist(itemId: item.id)
                                await loadWishlist()
                            }
                        }
                    }
                }
            }
        }
        .task {
            await loadWishlist()
        }
        .refreshable {
            await loadWishlist()
        }
    }

    private func loadWishlist() async {
        isLoading = true
        do {
            wishlistItems = try await supabase.getWishlist()
        } catch {
            print("Error loading wishlist: \(error)")
        }
        isLoading = false
    }
}

struct BookRow: View {
    let book: Book
    let onDelete: () -> Void

    var body: some View {
        HStack {
            AsyncImage(url: URL(string: book.thumbnail ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                Rectangle()
                    .fill(.gray.opacity(0.3))
            }
            .frame(width: 60, height: 90)
            .cornerRadius(4)

            VStack(alignment: .leading, spacing: 4) {
                Text(book.title)
                    .font(.headline)
                    .lineLimit(2)

                Text(book.authorsDisplay)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                if let date = book.publishedDate {
                    Text(date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            Button(action: onDelete) {
                Image(systemName: "trash")
                    .foregroundColor(.red)
            }
        }
        .padding(.vertical, 4)
    }
}
```

#### Step 4: Main App Entry Point

Update `App/BookCultApp.swift`:

```swift
import SwiftUI

@main
struct BookCultApp: App {
    @StateObject private var supabase = SupabaseService.shared

    var body: some Scene {
        WindowGroup {
            if supabase.currentUser != nil {
                MainTabView()
            } else {
                LoginView()
            }
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            MyBooksView()
                .tabItem {
                    Label("My Books", systemImage: "books.vertical")
                }

            GroupsListView()
                .tabItem {
                    Label("Groups", systemImage: "person.3")
                }

            ActivityFeedView()
                .tabItem {
                    Label("Feed", systemImage: "newspaper")
                }

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
        }
    }
}
```

### Phase 1 Testing Checklist

Before moving to Phase 2, verify:

- [ ] User can sign up with email/password
- [ ] User can login with existing credentials
- [ ] Wishlist loads existing books from database
- [ ] User can remove books from wishlist
- [ ] Currently Reading list works
- [ ] Completed books list works
- [ ] Groups list shows all available groups
- [ ] User can join/leave groups
- [ ] Group members list displays correctly
- [ ] Activity feed shows activities from followed users
- [ ] User can follow/unfollow other users
- [ ] Profile displays user information
- [ ] Sign out works correctly
- [ ] App works offline (after initial data load)
- [ ] Real-time updates work (if using Supabase Realtime)

---

## Phase 2: Web API Integration

### Features Added in Phase 2

🔍 **Discovery**
- Search for books (Open Library + database)
- View book details
- Add search results to wishlist

🤖 **AI Features**
- Personalized book recommendations
- AI-enhanced book metadata
- Smart suggestions based on reading history

### Setup Steps

#### Step 1: Update Config

Update `Config.swift`:

```swift
enum Config {
    static let supabaseURL = URL(string: "https://your-project.supabase.co")!
    static let supabaseAnonKey = "your-anon-key-here"

    // Phase 2: Add your web app URL
    static let webAPIBaseURL = "https://your-app.vercel.app"
}
```

#### Step 2: Create API Service

Create `Services/APIService.swift`:

```swift
import Foundation

class APIService {
    static let shared = APIService()

    private let baseURL: String
    private let session: URLSession

    private init() {
        self.baseURL = Config.webAPIBaseURL
        self.session = URLSession.shared
    }

    // MARK: - Book Search

    func searchBooks(query: String, source: String = "both") async throws -> [Book] {
        var components = URLComponents(string: "\(baseURL)/api/books/search")!
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "source", value: source)
        ]

        guard let url = components.url else {
            throw URLError(.badURL)
        }

        let (data, _) = try await session.data(from: url)
        let response = try JSONDecoder().decode(BookSearchResponse.self, from: data)
        return response.books
    }

    // MARK: - Recommendations

    func getRecommendations() async throws -> [Book] {
        guard let url = URL(string: "\(baseURL)/api/recommendations") else {
            throw URLError(.badURL)
        }

        // Include auth token from Supabase
        var request = URLRequest(url: url)
        if let session = try? await SupabaseService.shared.client.auth.session {
            request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, _) = try await session.data(for: request)
        let response = try JSONDecoder().decode(RecommendationsResponse.self, from: data)
        return response.recommendations
    }

    // MARK: - Fetch Single Book

    func fetchBook(googleBooksId: String) async throws -> Book {
        var components = URLComponents(string: "\(baseURL)/api/books/fetch")!
        components.queryItems = [
            URLQueryItem(name: "id", value: googleBooksId)
        ]

        guard let url = components.url else {
            throw URLError(.badURL)
        }

        let (data, _) = try await session.data(from: url)
        let book = try JSONDecoder().decode(Book.self, from: data)
        return book
    }
}

// Response models
struct BookSearchResponse: Codable {
    let books: [Book]
}

struct RecommendationsResponse: Codable {
    let recommendations: [Book]
}
```

#### Step 3: Add Discovery View

Create `Views/Discovery/DiscoveryView.swift`:

```swift
import SwiftUI

struct DiscoveryView: View {
    @StateObject private var apiService = APIService.shared
    @StateObject private var supabase = SupabaseService.shared

    @State private var searchQuery = ""
    @State private var searchResults: [Book] = []
    @State private var isSearching = false
    @State private var recommendations: [Book] = []

    var body: some View {
        NavigationStack {
            VStack {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)

                    TextField("Search books...", text: $searchQuery)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit {
                            Task { await performSearch() }
                        }

                    if !searchQuery.isEmpty {
                        Button {
                            searchQuery = ""
                            searchResults = []
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }
                }
                .padding()

                if isSearching {
                    ProgressView()
                        .padding()
                } else if !searchResults.isEmpty {
                    // Search results
                    List(searchResults) { book in
                        SearchResultRow(book: book)
                    }
                } else if !recommendations.isEmpty {
                    // Recommendations
                    ScrollView {
                        VStack(alignment: .leading) {
                            Text("Recommended for You")
                                .font(.title2)
                                .fontWeight(.bold)
                                .padding(.horizontal)

                            LazyVStack {
                                ForEach(recommendations) { book in
                                    RecommendationCard(book: book)
                                }
                            }
                        }
                    }
                } else {
                    ContentUnavailableView(
                        "Discover Books",
                        systemImage: "book.circle",
                        description: Text("Search for books or view recommendations")
                    )
                }
            }
            .navigationTitle("Discover")
            .task {
                await loadRecommendations()
            }
        }
    }

    private func performSearch() async {
        guard !searchQuery.isEmpty else { return }

        isSearching = true
        do {
            searchResults = try await APIService.shared.searchBooks(query: searchQuery)
        } catch {
            print("Search error: \(error)")
        }
        isSearching = false
    }

    private func loadRecommendations() async {
        do {
            recommendations = try await APIService.shared.getRecommendations()
        } catch {
            print("Recommendations error: \(error)")
        }
    }
}

struct SearchResultRow: View {
    let book: Book
    @StateObject private var supabase = SupabaseService.shared
    @State private var isAdding = false

    var body: some View {
        HStack {
            AsyncImage(url: URL(string: book.thumbnail ?? "")) { image in
                image.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                Rectangle().fill(.gray.opacity(0.3))
            }
            .frame(width: 60, height: 90)
            .cornerRadius(4)

            VStack(alignment: .leading, spacing: 4) {
                Text(book.title)
                    .font(.headline)
                    .lineLimit(2)

                Text(book.authorsDisplay)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Button {
                Task { await addToWishlist() }
            } label: {
                if isAdding {
                    ProgressView()
                } else {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(.blue)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func addToWishlist() async {
        isAdding = true
        do {
            try await supabase.addToWishlist(bookId: book.id)
        } catch {
            print("Error adding to wishlist: \(error)")
        }
        isAdding = false
    }
}
```

#### Step 4: Update Main Tab View

Update `MainTabView` in `BookCultApp.swift`:

```swift
struct MainTabView: View {
    var body: some View {
        TabView {
            DiscoveryView()  // NEW!
                .tabItem {
                    Label("Discover", systemImage: "magnifyingglass")
                }

            MyBooksView()
                .tabItem {
                    Label("My Books", systemImage: "books.vertical")
                }

            GroupsListView()
                .tabItem {
                    Label("Groups", systemImage: "person.3")
                }

            ActivityFeedView()
                .tabItem {
                    Label("Feed", systemImage: "newspaper")
                }

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
        }
    }
}
```

#### Step 5: CORS Configuration (Web App Side)

You'll need to add CORS headers to your SvelteKit API routes to allow iOS app requests.

In your SvelteKit project, update each API endpoint's `+server.ts`:

```typescript
// Example: src/routes/api/books/search/+server.ts
export const GET: RequestHandler = async (event) => {
    // ... your existing code ...

    return json(data, {
        headers: {
            'Access-Control-Allow-Origin': '*', // Or specify your iOS app domain
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
};
```

### Phase 2 Testing Checklist

- [ ] Book search returns results from web API
- [ ] Search results can be added to wishlist
- [ ] Recommendations load on Discovery tab
- [ ] Book details view shows complete information
- [ ] AI-enhanced features work correctly
- [ ] CORS allows iOS app to access APIs
- [ ] Error handling for network failures
- [ ] Loading states display correctly

---

## Database Schema Reference

### Tables Used in Phase 1

#### `books`
- `google_books_id` (text, primary key)
- `title` (text)
- `authors` (text[])
- `published_date` (text)
- `description` (text)
- `thumbnail` (text)
- `page_count` (integer)
- `categories` (text[])
- `isbn_10` (text)
- `isbn_13` (text)
- `created_at` (timestamp)

#### `wishlists`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → profiles)
- `book_id` (text, foreign key → books)
- `added_at` (timestamp)

#### `currently_reading`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → profiles)
- `book_id` (text, foreign key → books)
- `started_at` (timestamp)

#### `completed_books`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → profiles)
- `book_id` (text, foreign key → books)
- `completed_at` (timestamp)

#### `groups`
- `id` (uuid, primary key)
- `name` (text)
- `description` (text)
- `created_by` (uuid, foreign key → profiles)
- `created_at` (timestamp)

#### `group_members`
- `id` (uuid, primary key)
- `group_id` (uuid, foreign key → groups)
- `user_id` (uuid, foreign key → profiles)
- `joined_at` (timestamp)

#### `follows`
- `follower_id` (uuid, foreign key → profiles)
- `following_id` (uuid, foreign key → profiles)
- Primary key: `(follower_id, following_id)`

#### `activities`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → profiles)
- `type` (text)
- `book_id` (text, foreign key → books)
- `group_id` (uuid, foreign key → groups)
- `metadata` (jsonb)
- `created_at` (timestamp)

#### `profiles`
- `id` (uuid, primary key, references auth.users)
- `email` (text)
- `username` (text)
- `full_name` (text)
- `avatar_url` (text)
- `bio` (text)
- `created_at` (timestamp)

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:
- Users can only read/write their own data (wishlists, etc.)
- Public read access for books, groups, profiles
- Group members can see group-specific content
- Activity feed respects follow relationships

---

## Troubleshooting

### Common Issues

#### "Failed to connect to Supabase"
- Verify `Config.swift` has correct URL and anon key
- Check internet connection
- Ensure Supabase project is not paused

#### "No books showing in lists"
- Books must exist in `books` table first
- Use web app to search/add books initially
- Or manually insert book records via Supabase dashboard

#### "Authentication fails"
- Check email confirmation requirement in Supabase Auth settings
- Verify RLS policies allow user creation
- Check Supabase logs for auth errors

#### "CORS errors in Phase 2"
- Add CORS headers to SvelteKit API routes
- Verify web app is deployed and accessible
- Check API endpoint URLs are correct

#### "Realtime updates not working"
- Ensure Supabase Realtime is enabled for your project
- Check database replication settings
- Subscribe to table changes in Swift code

### Getting Help

1. **Supabase Docs**: https://supabase.com/docs
2. **Swift Supabase SDK**: https://github.com/supabase/supabase-swift
3. **SwiftUI Tutorials**: https://developer.apple.com/tutorials/swiftui

---

## Next Steps

### After Phase 2

Consider adding:
- [ ] Offline support with local caching (Core Data or SwiftData)
- [ ] Push notifications for group activities
- [ ] In-app book reader integration
- [ ] Barcode scanner for ISBN lookup
- [ ] Share books with friends
- [ ] Reading goals and statistics
- [ ] Dark mode support
- [ ] iPad optimization
- [ ] Widget for currently reading book

### Deployment

When ready to publish:
1. Configure app icons and launch screen
2. Set up provisioning profiles in Xcode
3. Configure app capabilities (if using push notifications)
4. Test on physical devices
5. Submit to TestFlight for beta testing
6. Submit to App Store

---

## Project Timeline Estimate

**Phase 1**: 2-3 weeks
- Week 1: Setup, models, Supabase service, authentication
- Week 2: My Books views, Groups views
- Week 3: Social features, polish, testing

**Phase 2**: 1-2 weeks
- Week 1: API service, discovery view
- Week 2: Recommendations, polish, testing

**Total**: 3-5 weeks for full-featured iOS app

---

## Conclusion

This phased approach allows you to:
1. ✅ Start quickly with direct Supabase access
2. ✅ Build and test core features independently
3. ✅ Add advanced features when ready
4. ✅ Reuse existing backend infrastructure
5. ✅ Maintain separate codebases with shared data

**Start with Phase 1 to validate the iOS app concept, then expand with Phase 2 when you're ready for advanced features!**

Good luck! 🚀
