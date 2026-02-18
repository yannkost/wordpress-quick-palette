<?php
/**
 * Main plugin orchestrator.
 *
 * @package WPQP
 */

namespace WPQP;

defined( 'ABSPATH' ) || exit;

class Plugin {

	public function __construct() {
		$this->load_textdomain();
		$this->init_components();
	}

	private function load_textdomain() {
		load_plugin_textdomain(
			'wp-quick-palette',
			false,
			dirname( plugin_basename( WPQP_PLUGIN_FILE ) ) . '/languages'
		);
	}

	private function init_components() {
		new Assets();
		new Settings();
		new SearchController();
		new AdminBar();
		new UserPreferencesController();

		// History & Favorites - available in Lite too
		new FavoritesController();
		new HistoryController();

		// Pro components.
		if ( function_exists( 'wpqp_is_pro' ) && wpqp_is_pro() ) {
			new SavedSearchesController();
			new DashboardWidget();
			new ImportExportController();
		}
	}
}
