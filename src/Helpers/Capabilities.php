<?php
/**
 * Capabilities helper for WP Quick Palette.
 *
 * @package WPQP
 */

namespace WPQP\Helpers;

defined( 'ABSPATH' ) || exit;

/**
 * Class Capabilities
 *
 * Centralizes capability checks for palette usage and settings management.
 */
class Capabilities {

	/**
	 * Check if current user can use the palette.
	 *
	 * @return bool True if user can use palette.
	 */
	public static function can_use_palette() {
		return current_user_can( 'read' );
	}

	/**
	 * Check if current user can manage plugin settings.
	 *
	 * @return bool True if user can manage settings.
	 */
	public static function can_manage_settings() {
		return current_user_can( 'manage_options' );
	}
}
