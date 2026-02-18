=== WP Quick Palette ===
Contributors: yannkost
Donate link:
Tags: search, admin, command palette, productivity, navigation
Requires at least: 5.8
Tested up to: 6.7
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
- **Relevance Sorting**: "Starts-with" matches are ranked above "contains" matches
- **Grouped Results**: Results organized by post type for easy scanning
- **Status Badges**: Color-coded post status indicators (Live, Draft, Pending, Private, Scheduled)
- **Quick Actions**:
  - Open the post edit screen
  - View the front-end version (where applicable)
- **Appearance Options**:
  - Normal and compact density modes
  - Light, dark, or auto theme (matches your WordPress admin setting)
  - Per-user preference overrides via in-palette gear icon
- **Accessibility**: WCAG 2.1 AA compliant with full ARIA combobox pattern, screen reader announcements, and focus trapping
- **Admin Integration**:
  - Keyboard shortcut access (always available)
  - Optional admin toolbar icon
- **Global Settings**:
  - Enable/disable the plugin
  - Choose which post types to search
  - Configure your keyboard shortcut
  - Set default UI density and theme

Perfect for developers, agencies, and power editors who work across multiple posts and post types daily.

= Pro Features (Unlock Later) =

Upgrade to WP Quick Palette Pro for advanced personalization and speed:

- **Favorites**: Star your most-used posts and pages for instant access (with automatic stale entry cleanup)
- **History**: Automatically track recently opened items, with clear history option
- **Saved Searches**: Create named filters for common queries (e.g., "Draft posts from last 7 days")
- **Role & User Personalization**: Customize access and preferences by user role
- **Advanced Theming**: Choose custom accent colors and fine-tune UI density per user
- **Developer API**: Register custom commands and extend the palette with your own actions

== Installation ==

1. Download the plugin from WordPress.org or upload the `wp-quick-palette` folder to your `/wp-content/plugins/` directory.
2. Go to **Plugins** in the WordPress admin and activate **WP Quick Palette**.
3. Navigate to **Settings → Quick Palette** to configure the plugin.
4. Press `Ctrl+G` (or `Cmd+G`) to open the command palette and start searching.

== Frequently Asked Questions ==

= What is WP Quick Palette? =

WP Quick Palette is a command palette for WordPress admin that lets you instantly search and navigate to posts, pages, and custom post types. Press Ctrl+G to open it—no mouse required.

= How do I customize the keyboard shortcut? =

Go to **Settings → Quick Palette** and choose from preset shortcuts under the "General" section. You can select from common options like Ctrl+G, Ctrl+P, Cmd+G, and more. Custom shortcuts are coming in a future update.

= What's the difference between Lite and Pro? =

**Lite** (free) gives you the core command palette with smart search across your content and basic customization. **Pro** adds personal favorites, search history, saved searches, role-based settings, and advanced theming. See the Description section for a full feature list.

= Can I search custom post types? =

Yes! WP Quick Palette searches all public custom post types that have `show_in_menu` enabled. Go to Settings → Quick Palette and choose which post types to include in search results.

= Does WP Quick Palette support dark mode? =

Yes. Go to **Settings → Quick Palette → Appearance** and choose "Light", "Dark", or "Auto" (which matches your WordPress admin theme preference). Pro users can customize accent colors too.

= Can I use WP Quick Palette on multiple sites? =

Yes, simply activate it on each site. Each site has its own settings. Pro features can be unlocked with a license key.

= Is there a keyboard shortcut cheat sheet? =

Press Ctrl+G to open the palette, then use arrow keys to navigate results. Press Enter to open an item, or ESC to close the palette. More keyboard shortcuts and customization coming soon.

= What data does WP Quick Palette store? =

The plugin stores only essential data: your chosen settings (keyboard shortcut, post types, theme, density) and—if you upgrade to Pro—your favorites and search history. No data is sent to external servers.

== Screenshots ==

1. **Command palette open** – Press Ctrl+G to open the search overlay and instantly find any post or page.
2. **Search results grouped by type** – Results are organized by post type (Posts, Pages, Products) for easy scanning.
3. **Settings page** – Customize keyboard shortcut, choose searchable post types, and set your preferred theme and density.
4. **Admin bar icon** – Quick access icon in the WordPress admin toolbar (optional).

== Changelog ==

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

= 1.1.0 =
Better search relevance, color-coded status badges, per-user preferences, accessibility improvements, and Pro layer with favorites, history, and saved searches.

= 1.0.0 =
Initial release. Get a powerful command palette for your WordPress admin and say goodbye to clicking through menus!
