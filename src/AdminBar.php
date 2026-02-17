<?php
/**
 * Admin Bar integration for WP Quick Palette.
 *
 * Adds a toolbar icon to trigger the quick palette overlay.
 *
 * @package WPQP
 */

namespace WPQP;

defined( 'ABSPATH' ) || exit;

use WPQP\Helpers\Options;

class AdminBar {

	/**
	 * Constructor.
	 * Hook into admin_bar_menu to add the toolbar icon.
	 */
	public function __construct() {
		add_action( 'admin_bar_menu', array( $this, 'add_toolbar_icon' ), 999 );
	}

	/**
	 * Add Quick Palette icon to the admin toolbar.
	 *
	 * @param \WP_Admin_Bar $wp_admin_bar The admin bar instance.
	 */
	public function add_toolbar_icon( $wp_admin_bar ) {
		// Check if admin bar icon is enabled in settings.
		if ( ! Options::get( 'show_admin_bar_icon' ) ) {
			return;
		}

		// Check if plugin is enabled globally.
		if ( ! Options::get( 'enabled' ) ) {
			return;
		}

		$shortcut         = Options::get( 'shortcut', 'ctrl+g' );
		$shortcut_display = strtoupper( str_replace( '+', ' + ', $shortcut ) );

		$wp_admin_bar->add_node(
			array(
				'id'    => 'wpqp-admin-bar-icon',
				'title' => '<span class="ab-icon dashicons dashicons-search"></span><span class="screen-reader-text">' . esc_html__( 'Quick Palette', 'wp-quick-palette' ) . '</span>',
				'href'  => '#',
				'meta'  => array(
					'class' => 'wpqp-admin-bar-trigger',
					'title' => sprintf(
						/* translators: %s: keyboard shortcut */
						esc_attr__( 'Open Quick Palette (%s)', 'wp-quick-palette' ),
						$shortcut_display
					),
				),
			)
		);
	}
}
