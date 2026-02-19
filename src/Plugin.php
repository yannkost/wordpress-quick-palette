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

		// Pro components — stripped from the free build by Freemius at deploy time.
		if ( function_exists( 'wqp_fs' ) && wqp_fs()->can_use_premium_code__premium_only() ) {
			new SavedSearchesController();
			new DashboardWidget();
			new ImportExportController();
		}
	}
}
