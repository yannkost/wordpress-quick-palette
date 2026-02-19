<?php
/**
 * History controller for AJAX history recording/retrieval.
 *
 * @package WPQP
 */

namespace WPQP;

use WPQP\Helpers\Options;

defined( 'ABSPATH' ) || exit;

class HistoryController {

	const META_KEY = 'wpqp_history';

	public function __construct() {
		add_action( 'wp_ajax_wpqp_record_history', array( $this, 'handle_record' ) );
		add_action( 'wp_ajax_wpqp_get_history', array( $this, 'handle_get' ) );
		add_action( 'wp_ajax_wpqp_clear_history', array( $this, 'handle_clear' ) );

		// Track all post edit page visits (not just palette navigation)
		add_action( 'admin_footer-post.php', array( $this, 'track_edit_page_visit' ), 10 );
		add_action( 'admin_footer-post-new.php', array( $this, 'track_edit_page_visit' ), 10 );
	}

	/**
	 * Record a history entry for the current user.
	 *
	 * Deduplicates by type+id, prepends with timestamp, trims to history_limit.
	 */
	public function handle_record() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to record history.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$type   = isset( $_POST['type'] ) ? sanitize_text_field( wp_unslash( $_POST['type'] ) ) : '';
		$id_raw = isset( $_POST['id'] ) ? sanitize_text_field( wp_unslash( $_POST['id'] ) ) : '';
		// Admin-type history entries use URL slugs as IDs; all other types use integer post/user IDs.
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

		$user_id = get_current_user_id();
		$history = get_user_meta( $user_id, self::META_KEY, true );

		if ( ! is_array( $history ) ) {
			$history = array();
		}

		// Remove existing entry with same type+id (dedup).
		// Use string comparison so both int and slug IDs match correctly.
		$history = array_values( array_filter( $history, function ( $entry ) use ( $type, $id ) {
			return ! ( isset( $entry['type'], $entry['id'] ) && $entry['type'] === $type && (string) $entry['id'] === (string) $id );
		} ) );

		// Prepend new entry.
		array_unshift( $history, array(
			'type'      => $type,
			'id'        => $id,
			'title'     => $title,
			'edit_url'  => $edit_url,
			'last_used' => time(),
		) );

		// Trim to history limit.
		$options       = Options::get_all();
		$history_limit = isset( $options['pro']['history_limit'] ) ? (int) $options['pro']['history_limit'] : 50;
		$history_limit = max( 10, min( 200, $history_limit ) );
		$history       = array_slice( $history, 0, $history_limit );

		$result = update_user_meta( $user_id, self::META_KEY, $history );
		if ( false === $result ) {
			error_log( sprintf( 'WPQP: Failed to record history for user %d.', $user_id ) );
		}

		wp_send_json_success( array(
			'history' => $history,
		) );
	}

	/**
	 * Get the current user's history.
	 *
	 * Filters out entries where the referenced post no longer exists.
	 */
	public function handle_get() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to view history.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$user_id = get_current_user_id();
		$history = get_user_meta( $user_id, self::META_KEY, true );

		if ( ! is_array( $history ) ) {
			$history = array();
		}

		// Filter out stale entries (deleted posts). Skip non-post types (user, admin).
		$non_post_types = array( 'user', 'admin' );
		$original_count = count( $history );
		$history = array_values( array_filter( $history, function ( $entry ) use ( $non_post_types ) {
			if ( isset( $entry['type'], $entry['id'] ) && ! in_array( $entry['type'], $non_post_types, true ) ) {
				if ( false === get_post_status( (int) $entry['id'] ) ) {
					return false;
				}
			}
			return true;
		} ) );

		// Auto-clean stored meta if stale entries were removed.
		if ( count( $history ) < $original_count ) {
			update_user_meta( $user_id, self::META_KEY, $history );
		}

		wp_send_json_success( array(
			'history' => $history,
		) );
	}

	/**
	 * Clear the current user's history.
	 */
	public function handle_clear() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to clear history.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$user_id = get_current_user_id();
		delete_user_meta( $user_id, self::META_KEY );

		wp_send_json_success( array(
			'history' => array(),
		) );
	}

	/**
	 * Track post edit page visits (not just palette navigation).
	 * Fires on all post edit pages to record history.
	 *
	 * @return void
	 */
	public function track_edit_page_visit() {
		global $post;

		if ( ! $post || ! current_user_can( 'read' ) ) {
			return;
		}

		$post_id = $post->ID;
		$post_type = get_post_type( $post );
		$title = get_the_title( $post );
		$edit_url = get_edit_post_link( $post, 'raw' );

		// Skip if this was just recorded (avoid duplicates)
		$history = get_user_meta( get_current_user_id(), self::META_KEY, true );
		if ( is_array( $history ) && ! empty( $history ) ) {
			$last_entry = $history[0];
			if ( isset( $last_entry['type'], $last_entry['id'] )
				&& $last_entry['type'] === $post_type
				&& (int) $last_entry['id'] === $post_id
				&& isset( $last_entry['last_used'] )
				&& ( time() - $last_entry['last_used'] ) < 5 // Within 5 seconds
			) {
				return; // Already recorded recently
			}
		}

		// Record history entry
		$new_entry = array(
			'type'      => $post_type,
			'id'        => $post_id,
			'title'     => $title,
			'edit_url'  => $edit_url,
			'last_used' => time(),
		);

		// Deduplicate and prepend
		$history = is_array( $history ) ? $history : array();
		$history = array_values( array_filter( $history, function( $entry ) use ( $post_type, $post_id ) {
			return ! ( isset( $entry['type'], $entry['id'] )
				&& $entry['type'] === $post_type
				&& (int) $entry['id'] === $post_id );
		} ) );

		array_unshift( $history, $new_entry );

		// Trim to history limit
		$options = Options::get_all();
		$history_limit = isset( $options['pro']['history_limit'] ) ? (int) $options['pro']['history_limit'] : 50;
		$history_limit = max( 10, min( 200, $history_limit ) );
		$history = array_slice( $history, 0, $history_limit );

		$result = update_user_meta( get_current_user_id(), self::META_KEY, $history );
		if ( false === $result ) {
			error_log( sprintf( 'WPQP: Failed to track edit page visit for user %d, post %d.', get_current_user_id(), $post_id ) );
		}
	}
}
