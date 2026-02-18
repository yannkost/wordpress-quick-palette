<?php
/**
 * Plugin Name: WP Quick Palette
 * Plugin URI:  https://wordpress.org/plugins/wp-quick-palette/
 * Description: A Craft-inspired command palette and quick search for the WordPress admin.
 * Version:     1.2.0
 * Author:      Yann Kost
 * Author URI:  https://example.com
 * License:     GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wp-quick-palette
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 *
 * @package WPQP
 */

defined( 'ABSPATH' ) || exit;

define( 'WPQP_VERSION', '1.2.0' );
define( 'WPQP_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WPQP_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'WPQP_PLUGIN_FILE', __FILE__ );

/**
 * Freemius SDK integration.
 *
 * Initializes the Freemius singleton for license management.
 * Download the SDK from https://freemius.com and place it in the freemius/ directory.
 *
 * @return \Freemius
 */
if ( ! function_exists( 'wpqp_fs' ) ) {
	function wpqp_fs() {
		global $wpqp_fs;

		if ( ! isset( $wpqp_fs ) ) {
			if ( ! file_exists( WPQP_PLUGIN_DIR . 'freemius/start.php' ) ) {
				return null;
			}

			require_once WPQP_PLUGIN_DIR . 'freemius/start.php';

			$wpqp_fs = fs_dynamic_init( array(
				'id'             => '', // Your Freemius plugin ID.
				'slug'           => 'wp-quick-palette',
				'type'           => 'plugin',
				'public_key'     => '', // Your Freemius public key.
				'is_premium'     => false,
				'has_addons'     => false,
				'has_paid_plans' => true,
				'menu'           => array(
					'slug'   => 'wp-quick-palette',
					'parent' => array(
						'slug' => 'options-general.php',
					),
				),
			) );
		}

		return $wpqp_fs;
	}

	wpqp_fs();
}

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
		// Dev override constant.
		if ( defined( 'WPQP_PRO' ) && WPQP_PRO ) {
			return true;
		}

		// Freemius license check.
		$fs = function_exists( 'wpqp_fs' ) ? wpqp_fs() : null;
		if ( $fs && is_object( $fs ) && method_exists( $fs, 'is_paying' ) ) {
			return $fs->is_paying();
		}

		return false;
	}
}

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
