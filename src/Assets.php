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

		wp_enqueue_style(
			'wpqp-admin-css',
			WPQP_PLUGIN_URL . 'assets/css/admin.css',
			array(),
			WPQP_VERSION
		);

		wp_enqueue_script(
			'wpqp-admin-js',
			WPQP_PLUGIN_URL . 'assets/js/admin.js',
			array(),
			WPQP_VERSION,
			true
		);

		$user_prefs   = UserMeta::get_preferences();
		$all_options  = Options::get_all();
		$is_pro       = function_exists( 'wpqp_is_pro' ) && wpqp_is_pro();

		wp_localize_script(
			'wpqp-admin-js',
			'wpqpData',
			array(
				'ajaxUrl'              => admin_url( 'admin-ajax.php' ),
				'nonce'                => wp_create_nonce( 'wpqp_search_nonce' ),
				'shortcut'             => Options::get( 'shortcut' ),
				'density'              => $user_prefs['density'] ?? Options::get( 'default_density' ),
				'theme'                => $user_prefs['theme'] ?? Options::get( 'theme' ),
				'showAdminBarIcon'     => (bool) Options::get( 'show_admin_bar_icon' ),
				'enabled'              => (bool) Options::get( 'enabled' ),
				'isPro'                => $is_pro,
				'historyLimit'         => (int) $all_options['pro']['history_limit'],
			)
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
