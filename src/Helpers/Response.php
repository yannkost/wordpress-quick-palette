<?php
/**
 * Response helper for WP Quick Palette.
 *
 * @package WPQP
 */

namespace WPQP\Helpers;

defined( 'ABSPATH' ) || exit;

/**
 * Class Response
 *
 * Provides simple wrappers for JSON responses in AJAX handlers.
 */
class Response {

	/**
	 * Send a success JSON response.
	 *
	 * @param mixed $data Data to send in the response.
	 */
	public static function success( $data ) {
		wp_send_json_success( $data );
	}

	/**
	 * Send an error JSON response.
	 *
	 * @param string $message Error message.
	 * @param int    $code    HTTP status code (default 400).
	 */
	public static function error( $message, $code = 400 ) {
		wp_send_json_error( array( 'message' => $message ), $code );
	}
}
