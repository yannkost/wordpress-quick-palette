<?php
/**
 * Assets controller for enqueuing scripts and styles.
 *
 * @package WPQP
 */

namespace WPQP;

use WPQP\Helpers\Options;
use WPQP\Helpers\UserMeta;

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
		$user_prefs  = UserMeta::get_preferences();
		$all_options = Options::get_all();
		$is_pro      = function_exists( 'wpqp_is_pro' ) && wpqp_is_pro();

		wp_localize_script(
			'wpqp-admin-core',
			'wpqpData',
			array(
				'ajaxUrl'          => admin_url( 'admin-ajax.php' ),
				'nonce'            => wp_create_nonce( 'wpqp_search_nonce' ),
				'shortcut'         => Options::get( 'shortcut' ),
				'density'          => $user_prefs['density'] ?? Options::get( 'default_density' ),
				'theme'            => $user_prefs['theme']   ?? Options::get( 'theme' ),
				'showAdminBarIcon' => (bool) Options::get( 'show_admin_bar_icon' ),
				'enabled'          => (bool) Options::get( 'enabled' ),
				'isPro'            => $is_pro,
				'historyLimit'     => (int) $all_options['pro']['history_limit'],
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
