<?php
/**
 * User preferences controller for AJAX save/retrieval.
 *
 * @package WPQP
 */

namespace WPQP;

use WPQP\Helpers\UserMeta;

defined( 'ABSPATH' ) || exit;

class UserPreferencesController {

	public function __construct() {
		add_action( 'wp_ajax_wpqp_save_preferences', array( $this, 'handle_save' ) );
	}

	/**
	 * Save user preferences via AJAX.
	 */
	public function handle_save() {
		try {
			check_ajax_referer( 'wpqp_search_nonce' );

			if ( ! current_user_can( 'read' ) ) {
				wp_send_json_error(
					array( 'message' => __( 'You do not have permission to save preferences.', 'wp-quick-palette' ) ),
					403
				);
				return;
			}

			$allowed_themes    = array( 'light', 'dark', 'auto' );
			$allowed_densities = array( 'normal', 'compact' );

			$user_id = get_current_user_id();
			$current = UserMeta::get_preferences( $user_id );
			$updated = false;

			if ( isset( $_POST['theme'] ) ) {
				$theme = sanitize_text_field( wp_unslash( $_POST['theme'] ) );
				if ( in_array( $theme, $allowed_themes, true ) ) {
					$current['theme'] = $theme;
					$updated          = true;
				}
			}

			if ( isset( $_POST['density'] ) ) {
				$density = sanitize_text_field( wp_unslash( $_POST['density'] ) );
				if ( in_array( $density, $allowed_densities, true ) ) {
					$current['density'] = $density;
					$updated            = true;
				}
			}

			if ( $updated ) {
				UserMeta::set_preferences( $user_id, $current );
			}

			wp_send_json_success( array(
				'preferences' => $current,
			) );
		} catch ( \Throwable $e ) {
			error_log( 'WPQP: UserPreferencesController handle_save: ' . $e->getMessage() );
			wp_send_json_error( array( 'message' => __( 'An unexpected error occurred.', 'wp-quick-palette' ) ), 500 );
		}
	}
}
