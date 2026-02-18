<?php
/**
 * Options helper for global plugin settings.
 *
 * @package WPQP
 */

namespace WPQP\Helpers;

defined( 'ABSPATH' ) || exit;

class Options {

	const OPTION_NAME = 'wp_quick_palette_options';

	public static function get_defaults() {
		return array(
			'enabled'             => true,
			'shortcut'            => 'ctrl+g',
			'show_admin_bar_icon' => true,
			'default_density'     => 'normal',
			'theme'               => 'auto',
			'search_post_types'   => array( 'post', 'page' ),
			'pro'                 => array(
				'history_limit'         => 50,
				'role_based_settings'   => array(),
			),
		);
	}

	public static function get_all() {
		$stored   = get_option( self::OPTION_NAME, array() );
		$defaults = self::get_defaults();
		$options  = wp_parse_args( $stored, $defaults );

		// Deep merge the 'pro' sub-array.
		if ( isset( $stored['pro'] ) && is_array( $stored['pro'] ) ) {
			$options['pro'] = wp_parse_args( $stored['pro'], $defaults['pro'] );
		}

		return $options;
	}

	public static function get( $key, $default = null ) {
		$options = self::get_all();

		if ( array_key_exists( $key, $options ) ) {
			return $options[ $key ];
		}

		if ( null !== $default ) {
			return $default;
		}

		$defaults = self::get_defaults();
		return isset( $defaults[ $key ] ) ? $defaults[ $key ] : null;
	}

	public static function set( $key, $value ) {
		$options         = self::get_all();
		$options[ $key ] = $value;
		return update_option( self::OPTION_NAME, $options, true );
	}

	public static function set_all( $options ) {
		return update_option( self::OPTION_NAME, $options, true );
	}
}
