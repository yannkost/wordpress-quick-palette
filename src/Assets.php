<?php
/**
 * Assets controller for enqueuing scripts and styles.
 *
 * @package WPQP
 */

namespace WPQP;

use WPQP\Helpers\Options;

defined( 'ABSPATH' ) || exit;

class Assets {

	public function __construct() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'admin_footer', array( $this, 'render_palette_root' ) );
	}

	public function enqueue_assets() {
		if ( ! Options::get( 'enabled' ) ) {
			return;
		}

		if ( ! current_user_can( 'read' ) ) {
			return;
		}

		// =====================================================================
		// CSS — ordered chain, each depends on the previous.
		// =====================================================================
		$css_files = array(
			'admin-base',
			'admin-palette',
			'admin-items',
			'admin-panels',
			'admin-dropdowns',
			'admin-states',
		);

		foreach ( $css_files as $i => $name ) {
			wp_enqueue_style(
				'wpqp-' . $name,
				WPQP_PLUGIN_URL . 'assets/css/' . $name . '.css',
				$i === 0 ? array() : array( 'wpqp-' . $css_files[ $i - 1 ] ),
				WPQP_VERSION
			);
		}

		// =====================================================================
		// JS — namespace core first, then modules, init last.
		// =====================================================================

		// Core: creates window.WPQP, state, and all lifecycle / nav functions.
		wp_enqueue_script(
			'wpqp-admin-core',
			WPQP_PLUGIN_URL . 'assets/js/admin-core.js',
			array(),
			WPQP_VERSION,
			true
		);

		// Localize data on the core handle.
		// Read raw stored user prefs (without wp_parse_args defaults) so we can
		// distinguish an explicit user choice from "never set".
		$raw_prefs    = get_user_meta( get_current_user_id(), 'wpqp_preferences', true );
		$raw_prefs    = is_array( $raw_prefs ) ? $raw_prefs : array();
		$all_options  = Options::get_all();
		$global_theme = Options::get( 'theme' );
		$is_pro       = function_exists( 'wpqp_is_pro' ) && wpqp_is_pro();

		// Theme resolution:
		//   'light' or 'dark' in Settings = admin-enforced; applies to all users.
		//   'auto' in Settings = let each user control their own preference.
		if ( 'auto' !== $global_theme ) {
			$effective_theme = $global_theme;
		} else {
			$effective_theme = isset( $raw_prefs['theme'] ) ? $raw_prefs['theme'] : 'auto';
		}

		// Density is always a per-user preference; global 'default_density' is the fallback.
		$effective_density = isset( $raw_prefs['density'] ) ? $raw_prefs['density'] : Options::get( 'default_density' );

		wp_localize_script(
			'wpqp-admin-core',
			'wpqpData',
			array(
				'ajaxUrl'          => admin_url( 'admin-ajax.php' ),
				'postNewUrl'       => admin_url( 'post-new.php' ),
				'adminMenu'        => $is_pro ? $this->get_admin_menu_data() : array(),
				'nonce'            => wp_create_nonce( 'wpqp_search_nonce' ),
				'shortcut'         => Options::get( 'shortcut' ),
				'density'          => $effective_density,
				'theme'            => $effective_theme,
				'globalTheme'      => $global_theme,
				'showAdminBarIcon' => (bool) Options::get( 'show_admin_bar_icon' ),
				'enabled'          => (bool) Options::get( 'enabled' ),
				'isPro'            => $is_pro,
				'historyLimit'     => (int) $all_options['pro']['history_limit'],
				'strings'          => array(
					// Title bar
					'title'            => __( 'Quick Access', 'wp-quick-palette' ),
					'close'            => __( 'Close', 'wp-quick-palette' ),
					'preferences'      => __( 'Preferences', 'wp-quick-palette' ),
					'siteDefault'      => __( 'Default', 'wp-quick-palette' ),
					// Search tabs
					'tabContent'       => __( 'Content', 'wp-quick-palette' ),
					'tabUsers'         => __( 'Users', 'wp-quick-palette' ),
					'tabAdmin'         => __( 'Admin', 'wp-quick-palette' ),
					'proBadge'         => __( 'Pro', 'wp-quick-palette' ),
					// Input bar
					'searchPlaceholder' => __( 'Search posts, pages, and more…', 'wp-quick-palette' ),
					'searchAriaLabel'  => __( 'Search', 'wp-quick-palette' ),
					'saveSearch'       => __( 'Save this search', 'wp-quick-palette' ),
					'savedSearches'    => __( 'Saved searches', 'wp-quick-palette' ),
					'enterHint'        => __( 'Enter ↵', 'wp-quick-palette' ),
					// States
					'searching'        => __( 'Searching…', 'wp-quick-palette' ),
					'noResults'        => __( 'No results found', 'wp-quick-palette' ),
					'typeMore'         => __( 'Type at least 2 characters to search', 'wp-quick-palette' ),
					'searchResults'    => __( 'Search Results', 'wp-quick-palette' ),
					'resultsFound'     => __( 'results found', 'wp-quick-palette' ),
					'openNewTab'       => __( 'Open in new tab', 'wp-quick-palette' ),
					'copyOptions'      => __( 'Copy options', 'wp-quick-palette' ),
					'searchTimeout'    => __( 'Search timed out. Please try again.', 'wp-quick-palette' ),
					'searchFailed'     => __( 'Failed to perform search. Please try again.', 'wp-quick-palette' ),
					'searchError'      => __( 'An error occurred', 'wp-quick-palette' ),
					// Copy menu
					'copyUrl'          => __( 'Copy URL', 'wp-quick-palette' ),
					'copyTitle'        => __( 'Copy Title', 'wp-quick-palette' ),
					'copyId'           => __( 'Copy ID', 'wp-quick-palette' ),
					'copiedUrl'        => __( 'URL copied!', 'wp-quick-palette' ),
					'copiedTitle'      => __( 'Title copied!', 'wp-quick-palette' ),
					'copiedId'         => __( 'ID copied!', 'wp-quick-palette' ),
					// Panels
					'history'          => __( 'History', 'wp-quick-palette' ),
					'favorites'        => __( 'My Favorites', 'wp-quick-palette' ),
					'noHistory'        => __( 'No history yet', 'wp-quick-palette' ),
					'noFavorites'      => __( 'No favorites yet', 'wp-quick-palette' ),
					'startSearching'   => __( 'Start searching to see results. Star items to add favorites.', 'wp-quick-palette' ),
					'filterHistory'    => __( 'Filter history…', 'wp-quick-palette' ),
					// Saved searches
					'mySavedSearches'  => __( 'My Saved Searches', 'wp-quick-palette' ),
					'noSavedSearches'  => __( 'No saved searches yet.', 'wp-quick-palette' ),
					'saveLabel'        => __( 'Save', 'wp-quick-palette' ),
					'cancelLabel'      => __( 'Cancel', 'wp-quick-palette' ),
					'nameYourSearch'   => __( 'Name your search…', 'wp-quick-palette' ),
					'savedConfirm'     => __( 'Saved!', 'wp-quick-palette' ),
					// Preferences dropdown
					'theme'            => __( 'Theme', 'wp-quick-palette' ),
					'density'          => __( 'Density', 'wp-quick-palette' ),
					'themeLight'       => __( 'Light', 'wp-quick-palette' ),
					'themeDark'        => __( 'Dark', 'wp-quick-palette' ),
					'themeAuto'        => __( 'Auto', 'wp-quick-palette' ),
					'densityNormal'    => __( 'Normal', 'wp-quick-palette' ),
					'densityCompact'   => __( 'Compact', 'wp-quick-palette' ),
					// Status labels
					'statusPublished'  => __( 'Published', 'wp-quick-palette' ),
					'statusDraft'      => __( 'Draft', 'wp-quick-palette' ),
					'statusPending'    => __( 'Pending', 'wp-quick-palette' ),
					'statusPrivate'    => __( 'Private', 'wp-quick-palette' ),
					'statusScheduled'  => __( 'Scheduled', 'wp-quick-palette' ),
					'statusTrash'      => __( 'Trash', 'wp-quick-palette' ),
					// Create new action
					'createNewPost'    => __( 'Create a new post titled', 'wp-quick-palette' ),
					// Comment items
					'commentBy'        => __( 'by', 'wp-quick-palette' ),
					'commentOn'        => __( 'on', 'wp-quick-palette' ),
					// Filter chips
					'filterAll'        => __( 'All', 'wp-quick-palette' ),
					// Type labels
					'typePost'         => __( 'Post', 'wp-quick-palette' ),
					'typePage'         => __( 'Page', 'wp-quick-palette' ),
					'typeProduct'      => __( 'Product', 'wp-quick-palette' ),
					'typeMedia'        => __( 'Media', 'wp-quick-palette' ),
					'typeUser'         => __( 'User', 'wp-quick-palette' ),
					'typeAdmin'        => __( 'Admin', 'wp-quick-palette' ),
					'typeComment'      => __( 'Comment', 'wp-quick-palette' ),
				),
			)
		);

		// Feature modules — each depends on core.
		$js_modules = array(
			'admin-dom',
			'admin-search',
			'admin-prefs',
			'admin-copy',
			'admin-pro',
		);

		foreach ( $js_modules as $name ) {
			wp_enqueue_script(
				'wpqp-' . $name,
				WPQP_PLUGIN_URL . 'assets/js/' . $name . '.js',
				array( 'wpqp-admin-core' ),
				WPQP_VERSION,
				true
			);
		}

		// Init — depends on all modules; guaranteed to execute last.
		wp_enqueue_script(
			'wpqp-admin-init',
			WPQP_PLUGIN_URL . 'assets/js/admin-init.js',
			array(
				'wpqp-admin-core',
				'wpqp-admin-dom',
				'wpqp-admin-search',
				'wpqp-admin-prefs',
				'wpqp-admin-copy',
				'wpqp-admin-pro',
			),
			WPQP_VERSION,
			true
		);
	}

	/**
	 * Collect admin menu items for client-side admin search.
	 *
	 * Called during admin_enqueue_scripts, after admin_menu has run, so
	 * $menu and $submenu are fully populated and already filtered for the
	 * current user by WordPress core.
	 *
	 * @return array Flat list of { title, url, parent } objects.
	 */
	private function get_admin_menu_data() {
		global $menu, $submenu;

		$items         = array();
		$parent_titles = array();

		// First pass: index top-level menu titles by their slug/URL.
		if ( ! empty( $menu ) ) {
			foreach ( $menu as $menu_item ) {
				$title = isset( $menu_item[0] ) ? wp_strip_all_tags( $menu_item[0] ) : '';
				$url   = isset( $menu_item[2] ) ? $menu_item[2] : '';

				if ( empty( $title ) || empty( $url ) ) {
					continue;
				}

				$parent_titles[ $url ] = $title;

				$items[] = array(
					'title'  => $title,
					'url'    => $url,
					'parent' => '',
				);
			}
		}

		// Second pass: submenu items.
		if ( ! empty( $submenu ) ) {
			foreach ( $submenu as $parent_slug => $submenu_items ) {
				if ( ! is_array( $submenu_items ) ) {
					continue;
				}

				$parent_title = isset( $parent_titles[ $parent_slug ] ) ? $parent_titles[ $parent_slug ] : '';

				foreach ( $submenu_items as $submenu_item ) {
					$title = isset( $submenu_item[0] ) ? wp_strip_all_tags( $submenu_item[0] ) : '';
					$url   = isset( $submenu_item[2] ) ? $submenu_item[2] : '';

					if ( empty( $title ) ) {
						continue;
					}

					$items[] = array(
						'title'  => $title,
						'url'    => $url,
						'parent' => $parent_title,
					);
				}
			}
		}

		return $items;
	}

	public function render_palette_root() {
		if ( ! Options::get( 'enabled' ) ) {
			return;
		}

		if ( ! current_user_can( 'read' ) ) {
			return;
		}

		echo '<div id="wpqp-palette-root"></div>';
	}
}
