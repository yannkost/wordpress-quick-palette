=== WP Quick Palette ===
Contributors: yannkost
Donate link:
Tags: search, admin, command palette, productivity, navigation
Requires at least: 5.8
Tested up to: 6.8
Stable tag: 1.2.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A Craft-inspired command palette and quick search for WordPress admin—instantly find posts, pages, and custom post types.

== Description ==

WP Quick Palette brings a fast, keyboard-driven command palette to your WordPress admin, inspired by Craft CMS and modern development tools.

Simply press `Ctrl+G` (or `Cmd+G` on Mac) to instantly search and open posts, pages, and custom post types. Navigate with arrow keys and press Enter to edit—all without touching the mouse.

= Lite Features (Free) =

- **Command Palette**: Press Ctrl+G / Cmd+G to open a lightning-fast search overlay
- **Smart Search**: Search across posts, pages, and all public custom post types by title
- **Comments Search**: Find comments by content or author (editors and admins)
- **Type Filter Chips**: Filter results to one post type with a single click
- **Relevance Sorting**: "Starts-with" matches are ranked above "contains" matches
- **Grouped Results**: Results organized by post type with heading and count (e.g., "Posts (3)")
- **Status Badges**: Color-coded post status indicators (Published, Draft, Pending, Private, Scheduled)
- **Relative Time**: Shows when each item was last updated (e.g., "2 hours ago")
- **Copy Actions**: Copy URL, Title, or ID for any result item
- **Favorites Panel**: Star your most-used items for instant access (no Pro required)
- **History Panel**: Automatically track recently opened items
- **Keyboard Shortcuts**:
  - Alt+1 through Alt+9 to jump to first 9 favorites (works even when overlay closed)
  - ↑↓ to navigate results, Enter to open, Esc to close
  - Ctrl+Enter to open in new tab
- **Drag-to-Reorder Favorites**: Rearrange your pinned items with drag handles
- **Highlighted Favorites**: Favorited items appear with a subtle accent tint in search results
- **Quick Actions**:
  - Open the post edit screen
  - View the front-end version (where applicable)
  - Open in new tab
- **Appearance Options**:
  - Normal and compact density modes
  - Light, dark, or auto theme (matches your WordPress admin setting)
  - Per-user preference overrides (theme and density saved server-side)
- **Accessibility**: WCAG 2.1 AA compliant with full ARIA combobox pattern, screen reader announcements, and focus trapping
- **Admin Integration**:
  - Keyboard shortcut access (always available)
  - Optional admin toolbar icon
- **Internationalization**: Full i18n support—all UI strings localizable via wpqpData.strings and languages/ folder
- **Smooth Animations**: Staggered enter/exit animations for search results
- **Global Settings**:
  - Enable/disable the plugin
  - Choose which post types to search
  - Configure your keyboard shortcut (presets: Ctrl+G, Ctrl+K, Ctrl+/)
  - Set default UI density and theme

Perfect for developers, agencies, and power editors who work across multiple posts and post types daily.

= Pro Features (Unlock Later) =

Upgrade to WP Quick Palette Pro for advanced personalization and power-user features:

- **Users Search**: Search for WordPress users by username, email, or display name (Pro users can toggle this feature)
- **Admin Screens Search**: Search WordPress admin menu items and settings pages (Pro users can toggle this feature)
- **Saved Searches**: Create and save named search presets for common queries (e.g., "Draft posts from last week")
- **Built-In Presets**: Access pre-configured saved searches like "Draft posts" and "Pending pages"
- **Dashboard Widget**: Display your personal favorites and recent history on the WordPress dashboard
- **Import / Export**: Download and upload your favorites and saved searches as JSON files (great for team migrations)

== Installation ==

1. Download the plugin from WordPress.org or upload the `wp-quick-palette` folder to your `/wp-content/plugins/` directory.
2. Go to **Plugins** in the WordPress admin and activate **WP Quick Palette**.
3. Navigate to **Settings → Quick Palette** to configure the plugin.
4. Press `Ctrl+G` (or `Cmd+G`) to open the command palette and start searching.

== Frequently Asked Questions ==

= What is WP Quick Palette? =

WP Quick Palette is a command palette for WordPress admin that lets you instantly search and navigate to posts, pages, and custom post types. Press Ctrl+G to open it—no mouse required.

= How do I customize the keyboard shortcut? =

Go to **Settings → Quick Palette** and choose from preset shortcuts under the "General" section. You can select from common options like Ctrl+G, Ctrl+K, Ctrl+/, and more. Custom shortcuts are coming in a future update.

= What's the difference between Lite and Pro? =

**Lite** (free) gives you the core command palette with smart search across your content, favorites, history, and basic customization. **Pro** adds powerful features for power users: search for WordPress users, search admin screens, create saved search presets, import/export your data, and a dashboard widget. See the Description section for a full feature list.

= Can I search custom post types? =

Yes! WP Quick Palette searches all public custom post types that have `show_in_menu` enabled. Go to Settings → Quick Palette and choose which post types to include in search results.

= Can I search for comments? =

Yes. Users with the `moderate_comments` capability (typically editors and admins) can search comments by author name or content. This is a Lite feature.

= Does WP Quick Palette support dark mode? =

Yes. Go to **Settings → Quick Palette → Appearance** and choose "Light", "Dark", or "Auto" (which matches your WordPress admin theme preference). Your preference is saved per user.

= Can I use favorites and history? =

Yes, favorites and history are built into the free Lite version. Star any item to add it to your favorites panel, and your recently opened items are automatically tracked. Both panels are always visible in the search overlay.

= How do I use Alt+1–9 to jump to favorites? =

The first 9 items in your favorites panel are assigned keyboard shortcuts Alt+1 through Alt+9. Press Alt+1 to instantly jump to your first favorite from anywhere in the WordPress admin—even if the palette is closed.

= Can I drag to reorder my favorites? =

Yes. In the Favorites panel on the right side of the palette, you can drag items by their handle (≡) to reorder them. The order is saved automatically per user.

= Can I use WP Quick Palette on multiple sites? =

Yes, simply activate it on each site. Each site has its own settings. Pro features can be unlocked with a license key per site.

= Is there a keyboard shortcut cheat sheet? =

Press Ctrl+G to open the palette, then use arrow keys to navigate results. Press Enter to open an item, or ESC to close the palette. Press Alt+1 through Alt+9 to jump to your first 9 favorites. More customization coming soon.

= What data does WP Quick Palette store? =

The plugin stores only essential data: your chosen settings (keyboard shortcut, post types, theme, density), your starred favorites, search history, and—if you upgrade to Pro—your saved searches and import/export data. No data is sent to external servers.

== Screenshots ==

1. **Content search (Lite)** – Press Ctrl+G to open the palette and instantly find any post, page, or custom post type. Results appear as you type with status badges and post type labels.
2. **History & Favorites panels (Lite)** – Open the palette with no query to see your starred favorites and recent visit history side-by-side. Star any result with one click.
3. **Content search (Pro)** – The Pro version adds search tabs (Content / Users / Admin), extended history, and the star button available on every result item.
4. **History & Favorites panels (Pro)** – Pro panels show more history entries, drag-to-reorder favorites, and Alt+1–9 shortcut badges next to your first 9 starred items.

== Changelog ==

= 1.2.0 – Lite Expansion & Pro Foundation =

**New Lite Features:**

* Type filter chips — filter results by post type with one click
* Comments search — find comments by content or author (editors/admins)
* Favorited items highlighted in search results with a subtle accent tint
* Group headings with item count on search result groups (e.g. "Posts (3)")
* Relative time shown on every search result item
* Copy URL, Title, and ID actions per result item
* Favorites and History panels moved to Lite (no Pro license required)
* Alt+1–9 keyboard shortcuts for first 9 favorites (Lite)
* Drag-to-reorder favorites (Lite)
* Staggered enter/exit animations for search results
* All UI strings fully internationalised via wpqpData.strings
* languages/ folder added, ready for translations

**New Pro Features:**

* Dashboard widget showing user favorites on WP dashboard
* Import/Export favorites and saved searches as JSON
* Admin screens search (a: prefix) — search WP admin menu items client-side

**Fixes & Improvements:**

* Star button now visible to all users (was incorrectly Pro-gated before)
* Search prefix stripping (c:, u:, a:) now correctly strips prefix before backend query
* Keyboard navigation skips hidden items when type filter chips are active

= 1.1.0 – Polish & Pro Layer =

**Phase 2 — Polish Lite:**

* Improved search relevance: "starts-with" matches now rank above "contains" matches
* Color-coded post status badges (Live, Draft, Pending, Private, Scheduled) in search results
* Per-user preferences: override global theme and density via gear icon in palette title bar
* Accessibility hardening: full ARIA combobox pattern, aria-activedescendant, live region for screen reader announcements, focus trapping
* Relative time display uses actual post modified date

**Phase 3 — Pro Layer:**

* Favorites: automatic cleanup of stale entries (deleted posts)
* History: stale entry cleanup, new "Clear" button in Recent section
* Freemius SDK bootstrap stub ready for license integration

= 1.0.0 – Initial Release =

**Phase 1 MVP Features:**

* Added command palette overlay with keyboard shortcut (Ctrl+G / Cmd+G)
* Implemented smart search across posts, pages, and public custom post types
* Grouped search results by post type
* Quick actions: open edit screen and view front-end
* Support for normal and compact UI density
* Light, dark, and auto theme modes
* Admin toolbar icon (toggleable)
* Settings page with global configuration
* Support for customizable keyboard shortcuts (preset options)
* Full WordPress.org compatibility (WP 5.8+, PHP 7.4+)

== Upgrade Notice ==

= 1.2.0 =
Big update! Favorites and History are now free (moved from Pro to Lite). New: type filter chips, comments search, copy actions, drag-to-reorder favorites, full internationalization, and more. Pro gets dashboard widget, import/export, and admin screens search.

= 1.1.0 =
Better search relevance, color-coded status badges, per-user preferences, accessibility improvements, and Pro layer with favorites, history, and saved searches.

= 1.0.0 =
Initial release. Get a powerful command palette for your WordPress admin and say goodbye to clicking through menus!
