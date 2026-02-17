<?php
/**
 * General utilities for WP Quick Palette.
 *
 * @package WPQP
 */

namespace WPQP\Helpers;

defined( 'ABSPATH' ) || exit;

/**
 * Class Utils
 *
 * Provides general utility methods for formatting and display.
 */
class Utils {

	/**
	 * Get relative time string from timestamp.
	 *
	 * @param int $timestamp Unix timestamp.
	 * @return string Human-readable relative time (e.g., "2 hours ago").
	 */
	public static function get_relative_time( $timestamp ) {
		return human_time_diff( $timestamp, time() ) . ' ago';
	}

	/**
	 * Get singular label for a post type.
	 *
	 * @param string $post_type Post type slug.
	 * @return string Singular post type label, or ucfirst slug as fallback.
	 */
	public static function get_post_type_label( $post_type ) {
		$post_type_obj = get_post_type_object( $post_type );

		if ( $post_type_obj && isset( $post_type_obj->labels->singular_name ) ) {
			return $post_type_obj->labels->singular_name;
		}

		return ucfirst( $post_type );
	}
}
