# WP Quick Palette

A Craft-inspired command palette and quick search for the WordPress admin. Instantly search and open posts, pages, and custom post types with a keyboard shortcut.

## Features

### Lite (Free)

- **Command Palette**: Press `Ctrl+G` (or `Cmd+G` on Mac) to open a fast search overlay
- **Smart Content Search**: Search posts, pages, and public custom post types by title
- **Comments Search**: Find comments by author or content (users with moderate_comments capability)
- **Type Filter Chips**: Click to filter results by post type
- **Grouped Results**: Results organized by post type with item counts (e.g., "Posts (3)")
- **Status Badges**: Color-coded post status indicators (Published, Draft, Pending, Private, Scheduled)
- **Relative Time**: Shows last modified time for each result (e.g., "Updated 2 hours ago")
- **Relevance Sorting**: "Starts-with" matches ranked above "contains" for better results
- **Copy Actions**: Copy URL, Title, or ID for any result item
- **Favorites Panel**: Star/unstar items for instant access (no Pro required)
- **History Panel**: Auto-track recently opened items
- **Keyboard Shortcuts**:
  - `Alt+1` through `Alt+9` jump to first 9 favorites (works even when palette closed)
  - `↑↓` navigate results, `Enter` to open, `Esc` to close
  - `Ctrl+Enter` to open in new tab
- **Drag Reordering**: Rearrange favorites by dragging
- **Highlighted Favorites**: Starred items show subtle accent tint in results
- **Per-User Preferences**: Override theme and density via in-palette gear icon (saved server-side)
- **UI Modes**: Normal and compact density options
- **Themes**: Light, dark, or auto (matches WordPress admin preference)
- **Accessibility**: WCAG 2.1 AA — ARIA combobox pattern, live regions, focus trapping
- **Admin Integration**: Keyboard shortcut and optional toolbar icon
- **Internationalization**: Full i18n support; all strings localizable via wpqpData.strings
- **Animations**: Staggered enter/exit animations on results
- **Settings**: Global configuration for shortcuts, post types, density, and theme

### Pro (Unlockable)

- **Users Search**: Search WordPress users by username, email, or display name (u: prefix)
- **Admin Screens Search**: Search admin menu items and settings pages client-side (a: prefix)
- **Saved Searches**: Create, save, and reorder named search presets for common queries
- **Built-In Presets**: Pre-configured searches like "Draft posts" and "Pending pages"
- **Dashboard Widget**: Display favorites and history on the WordPress dashboard
- **Import/Export**: Download and upload favorites and saved searches as JSON

For complete feature details, see `PLAN.md` in the project root.

## Requirements

- **PHP**: 7.4 or higher
- **WordPress**: 5.8 or higher
- Modern browser with ES6 support (for JavaScript)

No additional dependencies or build tools are required.

## Installation

### For Users

1. Download the plugin from [WordPress.org](https://wordpress.org/plugins/wp-quick-palette/) or clone this repository to `/wp-content/plugins/wp-quick-palette/`.
2. Activate the plugin from the **Plugins** menu in WordPress admin.
3. Navigate to **Settings → Quick Palette** to configure.
4. Press `Ctrl+G` to open the command palette.

### For Developers

1. Clone the repository:
   ```bash
   git clone https://github.com/yannkost/wp-quick-palette.git
   cd wp-quick-palette
   ```

2. Symlink or copy the plugin into a local WordPress installation:
   ```bash
   ln -s /path/to/wp-quick-palette /path/to/wordpress/wp-content/plugins/wp-quick-palette
   ```

3. Activate the plugin in WordPress admin.

4. Visit **Settings → Quick Palette** to test the settings page.

5. Press `Ctrl+G` in the admin to test the command palette.

## Development Workflow

### No Build Tools Required

This plugin uses vanilla JavaScript and CSS—no build tools like Webpack or Gulp are needed. Edit source files directly:

- **JavaScript**: `/assets/js/` (split into 7 modules)
- **CSS**: `/assets/css/` (split into 6 modules)
- **PHP**: `/src/` (all classes)
- **Settings Template**: `/templates/settings-page.php`

### Hot Reload

For local development, use a simple HTTP server or WordPress local environment. Changes to PHP are picked up immediately on page reload. JavaScript and CSS are loaded without any build step.

### Testing the Command Palette

1. Open any WordPress admin page
2. Press `Ctrl+G` (or `Cmd+G`) to open the palette
3. Start typing to search posts or pages
4. Use arrow keys to navigate, Enter to select, ESC to close

### Testing Settings

1. Navigate to **Settings → Quick Palette**
2. Modify settings (post types, theme, density, shortcut)
3. Click **Save Settings**
4. Verify changes take effect in the command palette

## Project Structure

```
wp-quick-palette/
├── wp-quick-palette.php          # Main plugin file (bootstrap, constants, hooks)
├── uninstall.php                 # Cleanup on plugin deletion
├── readme.txt                    # WordPress.org plugin repository description
├── README.md                     # This file
├── PLAN.md                       # Product roadmap and technical design
├── src/
│   ├── Plugin.php                # Main plugin class (orchestration)
│   ├── Assets.php                # Enqueue scripts and styles
│   ├── Settings.php              # Register settings page and options
│   ├── SearchController.php      # AJAX search endpoint (relevance sorting)
│   ├── AdminBar.php              # Admin toolbar integration
│   ├── UserPreferencesController.php # Per-user preference AJAX endpoint
│   ├── Helpers/
│   │   ├── Options.php           # Global option management
│   │   ├── UserMeta.php          # User preference storage
│   │   ├── Capabilities.php      # Role and capability checks
│   │   ├── Response.php          # JSON response formatting
│   │   └── Utils.php             # Utility functions
│   ├── FavoritesController.php   # (Pro) Favorites management (stale cleanup)
│   ├── HistoryController.php     # (Pro) History tracking (clear endpoint)
│   ├── SavedSearchesController.php # (Pro) Saved searches CRUD
│   ├── DashboardWidget.php       # (Pro) Dashboard widget display
│   └── ImportExportController.php # (Pro) JSON import/export
├── assets/
│   ├── css/
│   │   ├── admin-base.css        # Base styles (light default, dark via CSS variables)
│   │   ├── admin-palette.css     # Palette container styles
│   │   ├── admin-items.css       # Result item styles
│   │   ├── admin-panels.css      # Panels (favorites, history) styles
│   │   ├── admin-dropdowns.css   # Dropdown menu styles
│   │   └── admin-states.css      # State/variant styles (draft, pending, etc.)
│   └── js/
│       ├── admin-core.js         # Core palette logic
│       ├── admin-dom.js          # DOM manipulation
│       ├── admin-search.js       # Search functionality
│       ├── admin-prefs.js        # User preferences
│       ├── admin-copy.js         # Copy actions
│       ├── admin-pro.js          # Pro-only features
│       └── admin-init.js         # Initialization
├── templates/
│   └── settings-page.php         # Settings form HTML
├── languages/
│   └── wp-quick-palette.pot      # Translation template
└── PLAN.md                       # Full product roadmap
```

## Key Classes

### `Plugin.php`
Orchestrates the plugin. Instantiates Assets, Settings, SearchController, AdminBar, UserPreferencesController, and (when Pro is active) Pro-specific classes.

### `Assets.php`
Enqueues admin CSS and JavaScript. Localizes configuration data to the frontend (settings, post types, theme, density, user preferences, strings, etc.).

### `Settings.php`
Registers the settings page under **Settings → Quick Palette**. Manages option persistence and sanitization.

### `SearchController.php`
Handles AJAX requests to `/wp-admin/admin-ajax.php?action=wpqp_search`. Queries posts/pages/CPTs and comments, returns JSON results with relevance sorting.

### `AdminBar.php`
Adds optional icon to the WordPress admin toolbar.

### `UserPreferencesController.php`
Handles AJAX endpoint for saving per-user theme and density preferences.

### `Helpers/Options.php`
Centralized access to plugin options with defaults and validation.

### `Helpers/UserMeta.php`
Manages per-user preferences (theme override, density).

### `Helpers/Capabilities.php`
Checks user capabilities for features like comment search.

### `Helpers/Utils.php`
Utility functions including relative time formatting and post type labels.

## Global Options Structure

The plugin stores configuration in the WordPress options table under `wp_quick_palette_options`:

```php
[
    'enabled'              => true,           // Enable/disable
    'shortcut'             => 'ctrl+g',       // Keyboard shortcut (presets: ctrl+g, ctrl+k, ctrl+/)
    'show_admin_bar_icon'  => true,           // Toolbar icon
    'default_density'      => 'normal',       // normal|compact
    'theme'                => 'auto',         // light|dark|auto
    'search_post_types'    => ['post', 'page'],
    'pro' => [                                // Pro settings (when Pro active)
        'saved_searches_limit'  => 20,
        'history_limit'         => 50,
        'favorites_limit'       => 25,
        'enable_users_search'   => true,
        'enable_admin_search'   => true,
    ],
]
```

## User Meta Preferences

Per-user preferences stored under `wpqp_preferences`:

```php
[
    'theme'          => 'auto',    // overrides global theme
    'density'        => 'normal',  // normal|compact
]
```

## Search Implementation

The plugin queries posts via `WP_Query` with title-only search. Comments are queried via `get_comments()`. Results are sorted by relevance (starts-with first, then contains) and limited to 8 items per post type. Response includes:

- `type` — post type slug or 'comment'
- `id` — post ID or comment ID
- `title` — post title or comment snippet
- `status` — post status or 'approved'/'unapproved'
- `relative_time` — "Updated X ago"
- `edit_url` — admin edit link
- `view_url` — front-end permalink (if public)

Search type tabs (Pro):
- `c:` or `content:` — search content (posts, pages, CPTs)
- `u:` or `users:` — search WordPress users
- `a:` or `admin:` — search admin screens

## Hooks & Actions

### Core Hooks

- `plugins_loaded` — Initialize the plugin
- `admin_enqueue_scripts` — Enqueue assets
- `admin_bar_menu` — Add toolbar icon
- `admin_menu` — Register settings page
- `wp_ajax_wpqp_search` — AJAX search endpoint
- `wp_ajax_wpqp_save_preferences` — Save per-user theme/density preferences
- `admin_footer` — Inject palette root container

### Pro Hooks (when Pro active)

- `wp_ajax_wpqp_toggle_favorite` — Star/unstar items
- `wp_ajax_wpqp_get_favorites` — Retrieve favorites
- `wp_ajax_wpqp_record_history` — Record navigation history
- `wp_ajax_wpqp_get_history` — Retrieve history
- `wp_ajax_wpqp_clear_history` — Clear user's history
- `wp_ajax_wpqp_save_search` — Save search preset
- `wp_ajax_wpqp_get_saved_searches` — Retrieve saved searches
- `wp_ajax_wpqp_delete_saved_search` — Delete saved search
- `wp_ajax_wpqp_import_data` — Import favorites/searches
- `wp_ajax_wpqp_export_data` — Export favorites/searches

## Contributing

### Reporting Issues

If you find a bug or have a feature request, open an issue on GitHub with:
- WordPress version
- PHP version
- List of active plugins
- Steps to reproduce
- Expected vs. actual behavior

### Code Style

- **PHP**: Follow WordPress coding standards ([WordPress-Coding-Standards](https://github.com/WordPress/WordPress-Coding-Standards))
- **JavaScript**: Use vanilla JavaScript; avoid jQuery unless necessary
- **CSS**: BEM methodology for class naming
- **Comments**: Document non-obvious logic; use PHPDoc for classes and functions

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test thoroughly
4. Commit with clear, descriptive messages
5. Push and open a pull request against `main`

Before submitting:
- Ensure all PHP files follow WordPress coding standards
- Test the command palette and settings page
- Verify no console errors in browser dev tools
- Update documentation if you add or change features

### Development Tips

- Use `define( 'WPQP_DEBUG', true )` in wp-config.php to enable verbose logging
- Check browser console (F12) for JavaScript errors
- Use WordPress debug log (`wp-content/debug.log`) to monitor PHP warnings
- Test with multiple post types (posts, pages, custom post types)
- Test with various user roles and capabilities

## License

This plugin is licensed under the GPLv2 or later. See `LICENSE` file or [https://www.gnu.org/licenses/gpl-2.0.html](https://www.gnu.org/licenses/gpl-2.0.html) for details.

## Roadmap

See `PLAN.md` for the complete product roadmap, including:
- **Phase 1** (MVP): Core command palette with search — **complete**
- **Phase 2** (Polish): Relevance sorting, status badges, per-user preferences, accessibility — **complete**
- **Phase 3** (Pro): Favorites, history, saved searches, users/admin search — **complete**
- **Phase 4** (planned): Multi-site support, WooCommerce integration, advanced role-based settings

## Support

For questions or support, visit [WordPress.org plugin forum](https://wordpress.org/support/plugin/wp-quick-palette/) or check the FAQ in `readme.txt`.
