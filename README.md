# WP Quick Palette

A Craft-inspired command palette and quick search for the WordPress admin. Instantly search and open posts, pages, and custom post types with a keyboard shortcut.

## Features

### Lite (Free)

- **Command Palette**: Press `Ctrl+K` (or `Cmd+K` on Mac) to open a fast search overlay
- **Smart Search**: Search posts, pages, and public custom post types by title
- **Relevance Sorting**: "Starts-with" matches ranked above "contains" for better results
- **Grouped Results**: Results organized by post type with color-coded status badges
- **Quick Actions**: Open edit screen or view front-end
- **Per-User Preferences**: Override theme and density via in-palette gear icon
- **UI Modes**: Normal and compact density options
- **Themes**: Light, dark, or auto (matches WordPress admin)
- **Accessibility**: WCAG 2.1 AA — ARIA combobox pattern, live regions, focus trapping
- **Admin Integration**: Keyboard shortcut and optional toolbar icon
- **Settings**: Global configuration for shortcuts, post types, density, and theme

### Pro (Unlockable)

- Favorites (star/unstar items, auto-cleanup of stale entries)
- History (track recently opened posts, clear history button)
- Inline search bar (compact bar below admin toolbar with dropdown results)
- Saved searches (create named filters for common queries — planned)
- Role-based personalization (customize by user role — planned)
- Advanced theming (custom accent colors — planned)
- Developer API for custom commands (planned)

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
4. Press `Ctrl+K` to open the command palette.

### For Developers

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/wp-quick-palette.git
   cd wp-quick-palette
   ```

2. Symlink or copy the plugin into a local WordPress installation:
   ```bash
   ln -s /path/to/wp-quick-palette /path/to/wordpress/wp-content/plugins/wp-quick-palette
   ```

3. Activate the plugin in WordPress admin.

4. Visit **Settings → Quick Palette** to test the settings page.

5. Press `Ctrl+K` in the admin to test the command palette.

## Development Workflow

### No Build Tools Required

This plugin uses vanilla JavaScript and CSS—no build tools like Webpack or Gulp are needed. Edit source files directly:

- **JavaScript**: `/assets/js/admin.js`
- **CSS**: `/assets/css/admin.css`
- **PHP**: `/src/` (all classes)
- **Settings Template**: `/templates/settings-page.php` (created during phase 2)

### Hot Reload

For local development, use a simple HTTP server or WordPress local environment. Changes to PHP are picked up immediately on page reload. JavaScript and CSS are loaded without any build step.

### Testing the Command Palette

1. Open any WordPress admin page
2. Press `Ctrl+K` (or `Cmd+K`) to open the palette
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
│   ├── InlineSearch.php          # (Pro) Header search bar
│   ├── SavedSearchesController.php # (Pro, planned) Saved filters
│   ├── Roles.php                 # (Pro, planned) Role-based settings
│   └── Commands.php              # (Pro, planned) Custom command API
├── assets/
│   ├── css/
│   │   ├── admin.css             # Main stylesheet
│   │   └── admin-dark.css        # (Planned) Dark mode overrides
│   └── js/
│       └── admin.js              # Command palette & UI logic
├── templates/
│   └── settings-page.php         # (Created in phase 2) Settings form HTML
├── languages/
│   └── wp-quick-palette.pot      # (Planned) Translation template
└── pro/                          # (Future) Pro-only code
    ├── ProBootstrap.php
    └── License.php
```

## Key Classes

### `Plugin.php`
Orchestrates the plugin. Instantiates Assets, Settings, SearchController, AdminBar, and (when Pro is active) Pro-specific classes.

### `Assets.php`
Enqueues admin CSS and JavaScript. Localizes configuration data to the frontend (settings, post types, theme, density, etc.).

### `Settings.php`
Registers the settings page under **Settings → Quick Palette**. Manages option persistence and sanitization.

### `SearchController.php`
Handles AJAX requests to `/wp-admin/admin-ajax.php?action=wpqp_search`. Queries posts/pages/CPTs and returns JSON results.

### `AdminBar.php`
Adds optional icon to the WordPress admin toolbar.

### `Helpers/Options.php`
Centralized access to plugin options with defaults and validation.

### `Helpers/UserMeta.php`
Manages per-user preferences (theme override, density, inline bar visibility).

## Global Options Structure

The plugin stores configuration in the WordPress options table under `wp_quick_palette_options`:

```php
[
    'enabled'              => true,           // Enable/disable
    'shortcut'             => 'ctrl+g',       // Keyboard shortcut
    'show_admin_bar_icon'  => true,           // Toolbar icon
    'default_density'      => 'normal',       // normal|compact
    'theme'                => 'auto',         // light|dark|auto
    'search_post_types'    => ['post', 'page'],
    'pro' => [                                // Pro settings
        'inline_search_enabled' => false,
        'history_limit'         => 50,
        'role_based_settings'   => [],
    ],
]
```

## Search Implementation

The plugin queries posts via `WP_Query` with title-only search. Results are sorted by relevance (starts-with first, then contains) and limited to 8 items per post type. Response includes:

- `type` — post type slug
- `id` — post ID
- `title` — post title
- `status` — post status (publish, draft, pending, private, future)
- `modified_date` — ISO 8601 modified date
- `created_date` — ISO 8601 created date
- `edit_url` — admin edit link
- `view_url` — front-end permalink (if public)

## Hooks & Actions

### Filters & Actions

- `plugins_loaded` — Initialize the plugin
- `admin_enqueue_scripts` — Enqueue assets
- `admin_bar_menu` — Add toolbar icon
- `admin_menu` — Register settings page
- `wp_ajax_wpqp_search` — AJAX search endpoint

Lite actions:

- `wp_ajax_wpqp_save_preferences` — Save per-user theme/density preferences

Pro actions:

- `wp_ajax_wpqp_toggle_favorite` — Star/unstar items
- `wp_ajax_wpqp_get_favorites` — Retrieve favorites
- `wp_ajax_wpqp_record_history` — Record navigation history
- `wp_ajax_wpqp_get_history` — Retrieve history
- `wp_ajax_wpqp_clear_history` — Clear user's history

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
- **Phase 3** (Pro): Favorites, history, inline search bar — **complete**
- **Phase 4** (planned): Saved searches, role-based settings, custom commands API

## Support

For questions or support, visit [WordPress.org plugin forum](https://wordpress.org/support/plugin/wp-quick-palette/) or check the FAQ in `readme.txt`.
