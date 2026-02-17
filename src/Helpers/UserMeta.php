<?php
/**
 * User meta helper for WP Quick Palette.
 *
 * @package WPQP
 */

namespace WPQP\Helpers;

defined( 'ABSPATH' ) || exit;

/**
 * Class UserMeta
 *
 * Manages user-level preferences stored in user meta.
 */
class UserMeta {

	/**
	 * Meta key for user preferences.
	 */
	const META_KEY = 'wpqp_preferences';

	/**
	 * Get default user preferences.
	 *
	 * @return array Default preferences.
	 */
	public static function get_defaults() {
		return array(
			'theme'          => 'auto',
			'density'        => 'normal',
			'inline_visible' => true,
		);
	}

	/**
	 * Get user preferences, merged with defaults.
	 *
	 * @param int|null $user_id User ID. If null, uses current user.
	 * @return array User preferences.
	 */
	public static function get_preferences( $user_id = null ) {
		if ( null === $user_id ) {
			$user_id = get_current_user_id();
		}

		$stored = get_user_meta( $user_id, self::META_KEY, true );

		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return wp_parse_args( $stored, self::get_defaults() );
	}

	/**
	 * Set user preferences.
	 *
	 * @param int   $user_id User ID.
	 * @param array $prefs   Preferences array.
	 * @return bool|int Meta update result.
	 */
	public static function set_preferences( $user_id, $prefs ) {
		return update_user_meta( $user_id, self::META_KEY, $prefs );
	}
}
