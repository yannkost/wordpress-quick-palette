<?php
/**
 * Favorites controller for AJAX favorite toggle/retrieval.
 *
 * @package WPQP
 */

namespace WPQP;

defined( 'ABSPATH' ) || exit;

class FavoritesController {

	const META_KEY = 'wpqp_favorites';

	public function __construct() {
		add_action( 'wp_ajax_wpqp_toggle_favorite', array( $this, 'handle_toggle' ) );
		add_action( 'wp_ajax_wpqp_get_favorites', array( $this, 'handle_get' ) );
		add_action( 'wp_ajax_wpqp_reorder_favorites', array( $this, 'handle_reorder' ) );
	}

	/**
	 * Toggle a favorite item for the current user.
	 */
	public function handle_toggle() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to manage favorites.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$type   = isset( $_POST['type'] ) ? sanitize_text_field( wp_unslash( $_POST['type'] ) ) : '';
		// Admin-type favorites use URL slugs as IDs; all other types use integer post/user IDs.
		$id_raw = isset( $_POST['id'] ) ? sanitize_text_field( wp_unslash( $_POST['id'] ) ) : '';
		$id     = ( 'admin' === $type ) ? $id_raw : absint( $id_raw );

		if ( empty( $type ) || ( '' === $id || 0 === $id ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Invalid item.', 'wp-quick-palette' ) ),
				400
			);
			return;
		}

		$title    = isset( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : '';
		$edit_url = isset( $_POST['edit_url'] ) ? esc_url_raw( wp_unslash( $_POST['edit_url'] ) ) : '';

		$user_id   = get_current_user_id();
		$favorites = get_user_meta( $user_id, self::META_KEY, true );

		if ( ! is_array( $favorites ) ) {
			$favorites = array();
		}

		// Check if already favorited.
		$existing_index = null;
		foreach ( $favorites as $index => $fav ) {
			// Use loose string comparison so both int and slug IDs match correctly.
			if ( isset( $fav['type'], $fav['id'] ) && $fav['type'] === $type && (string) $fav['id'] === (string) $id ) {
				$existing_index = $index;
				break;
			}
		}

		if ( null !== $existing_index ) {
			// Remove favorite.
			array_splice( $favorites, $existing_index, 1 );
			$action = 'removed';
		} else {
			// Add favorite.
			$favorites[] = array(
				'type'     => $type,
				'id'       => $id,
				'title'    => $title,
				'edit_url' => $edit_url,
				'added_at' => time(),
			);
			$action = 'added';
		}

		$result = update_user_meta( $user_id, self::META_KEY, $favorites );
		if ( false === $result ) {
			error_log( sprintf( 'WPQP: Failed to update favorites for user %d.', $user_id ) );
		}

		wp_send_json_success( array(
			'action'    => $action,
			'favorites' => $favorites,
		) );
	}

	/**
	 * Get the current user's favorites.
	 *
	 * Filters out entries where the referenced post no longer exists.
	 */
	public function handle_get() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to view favorites.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$user_id   = get_current_user_id();
		$favorites = get_user_meta( $user_id, self::META_KEY, true );

		if ( ! is_array( $favorites ) ) {
			$favorites = array();
		}

		// Filter out stale entries (deleted posts). Skip non-post types (user, admin).
		$non_post_types = array( 'user', 'admin' );
		$original_count = count( $favorites );
		$favorites = array_values( array_filter( $favorites, function ( $fav ) use ( $non_post_types ) {
			if ( isset( $fav['type'], $fav['id'] ) && ! in_array( $fav['type'], $non_post_types, true ) ) {
				if ( false === get_post_status( (int) $fav['id'] ) ) {
					return false;
				}
			}
			return true;
		} ) );

		// Auto-clean stored meta if stale entries were removed.
		if ( count( $favorites ) < $original_count ) {
			update_user_meta( $user_id, self::META_KEY, $favorites );
		}

		wp_send_json_success( array(
			'favorites' => $favorites,
		) );
	}

	/**
	 * Reorder favorites for the current user.
	 */
	public function handle_reorder() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to reorder favorites.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$order = isset( $_POST['order'] ) ? json_decode( wp_unslash( $_POST['order'] ), true ) : array();

		if ( ! is_array( $order ) || empty( $order ) || count( $order ) > 200 ) {
			wp_send_json_error(
				array( 'message' => __( 'Invalid order data.', 'wp-quick-palette' ) ),
				400
			);
			return;
		}

		$user_id = get_current_user_id();

		// Get current favorites to preserve extra data (title, edit_url, etc.)
		$current_favorites = get_user_meta( $user_id, self::META_KEY, true );
		if ( ! is_array( $current_favorites ) ) {
			$current_favorites = array();
		}

		// Build new favorites array in the requested order
		$new_favorites = array();
		foreach ( $order as $item ) {
			$id   = isset( $item['id'] ) ? absint( $item['id'] ) : 0;
			$type = isset( $item['type'] ) ? sanitize_text_field( wp_unslash( $item['type'] ) ) : '';

			if ( empty( $id ) || empty( $type ) ) {
				continue;
			}

			// Find existing entry to preserve extra data
			$existing = null;
			foreach ( $current_favorites as $fav ) {
				if ( isset( $fav['id'], $fav['type'] ) && (int) $fav['id'] === $id && $fav['type'] === $type ) {
					$existing = $fav;
					break;
				}
			}

			if ( $existing ) {
				$new_favorites[] = $existing;
			} else {
				$new_favorites[] = array(
					'type'     => $type,
					'id'       => $id,
					'title'    => '',
					'edit_url' => '',
					'added_at' => time(),
				);
			}
		}

		$result = update_user_meta( $user_id, self::META_KEY, $new_favorites );
		if ( false === $result ) {
			error_log( sprintf( 'WPQP: Failed to reorder favorites for user %d.', $user_id ) );
		}

		wp_send_json_success( array(
			'favorites' => $new_favorites,
		) );
	}
}
