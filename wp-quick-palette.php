<?php
/**
 * Plugin Name: WP Quick Palette
 * Plugin URI:  https://wp-quick-palette.cloud/
 * Description: A Craft-inspired command palette and quick search for the WordPress admin.
 * Version:     1.2.0
 * Author:      Yann Kost
 * Author URI:  https://wp-quick-palette.cloud/
 * License:     GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wp-quick-palette
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 *
 * @package WPQP
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( function_exists( 'wqp_fs' ) ) {
	// This block runs when the Pro version activates alongside the free version.
	// Freemius uses set_basename() to auto-deactivate the free copy.
	wqp_fs()->set_basename( true, __FILE__ );
} else {
	/**
	 * DO NOT REMOVE THIS IF, IT IS ESSENTIAL FOR THE
	 * `function_exists` CALL ABOVE TO PROPERLY WORK.
	 */
	if ( ! function_exists( 'wqp_fs' ) ) {
		/**
		 * Freemius SDK integration.
		 *
		 * Initializes the Freemius singleton for license management.
		 *
		 * @return \Freemius
		 */
		function wqp_fs() {
			global $wqp_fs;

			if ( ! isset( $wqp_fs ) ) {
				// Include Freemius SDK.
				require_once dirname( __FILE__ ) . '/vendor/freemius/start.php';

				$wqp_fs = fs_dynamic_init( array(
					'id'                  => '24659',
					'slug'                => 'wp-quick-palette',
					'type'                => 'plugin',
					'public_key'          => 'pk_186ad09ab8ffb19f3c865dbdd1d90',
					'is_premium'          => true,
					'premium_suffix'      => 'Pro',
					'has_premium_version' => true,
					'has_addons'          => false,
					'has_paid_plans'      => true,
					'is_org_compliant'    => true,
					// Automatically removed in the free version.
					'wp_org_gatekeeper'   => 'OA7#BoRiBNqdf52FvzEf!!074aRLPs8fspif$7K1#4u4Csys1fQlCecVcUTOs2mcpeVHi#C2j9d09fOTvbC0HloPT7fFee5WdS3G',
					'menu'                => array(
						'support' => false,
					),
				) );
			}

			return $wqp_fs;
		}

		// Init Freemius.
		wqp_fs();
		// Signal that SDK was initiated.
		do_action( 'wqp_fs_loaded' );
	}

	// =========================================================================
	// Plugin bootstrap
	// =========================================================================

	define( 'WPQP_VERSION', '1.2.0' );
	define( 'WPQP_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
	define( 'WPQP_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
	define( 'WPQP_PLUGIN_FILE', __FILE__ );

	/**
	 * Check if Pro features are active.
	 *
	 * Returns true if the WPQP_PRO constant is defined (dev override)
	 * or if Freemius reports a paying license.
	 *
	 * @return bool
	 */
	if ( ! function_exists( 'wpqp_is_pro' ) ) {
		function wpqp_is_pro() {
			// This entire block is removed from the free version by Freemius at build time.
			if ( function_exists( 'wqp_fs' ) && wqp_fs()->can_use_premium_code__premium_only() ) {
				return true;
			}

			return false;
		}
	}

	/**
	 * Clean up all plugin data on uninstall.
	 * Hooked to Freemius so the uninstall event is also reported to the server.
	 */
	function wqp_fs_uninstall_cleanup() {
		global $wpdb;

		delete_option( 'wp_quick_palette_options' );
		delete_option( 'wp_quick_palette_saved_searches' );

		$meta_keys = array( 'wpqp_preferences', 'wpqp_favorites', 'wpqp_history' );
		foreach ( $meta_keys as $meta_key ) {
			$wpdb->delete( $wpdb->usermeta, array( 'meta_key' => $meta_key ), array( '%s' ) );
		}
	}

	wqp_fs()->add_action( 'after_uninstall', 'wqp_fs_uninstall_cleanup' );

	/**
	 * PSR-4 autoloader for the WPQP namespace.
	 */
	spl_autoload_register( function ( $class ) {
		$prefix   = 'WPQP\\';
		$base_dir = WPQP_PLUGIN_DIR . 'src/';
		$len      = strlen( $prefix );

		if ( strncmp( $prefix, $class, $len ) !== 0 ) {
			return;
		}

		$relative_class = substr( $class, $len );
		$file           = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';

		if ( file_exists( $file ) ) {
			require $file;
		}
	} );

	/**
	 * Activation hook: ensure default options are set.
	 */
	register_activation_hook( __FILE__, function () {
		$options = get_option( \WPQP\Helpers\Options::OPTION_NAME );
		if ( false === $options ) {
			update_option( \WPQP\Helpers\Options::OPTION_NAME, \WPQP\Helpers\Options::get_defaults(), true );
		}
	} );

	/**
	 * Deactivation hook: no-op for now. Options preserved for reactivation.
	 */
	register_deactivation_hook( __FILE__, function () {
		// No-op for now. Options preserved for reactivation.
	} );

	add_action( 'plugins_loaded', function () {
		new \WPQP\Plugin();
	} );
}
