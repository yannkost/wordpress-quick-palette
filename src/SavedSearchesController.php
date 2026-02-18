<?php
/**
 * Saved searches controller (Pro).
 *
 * Manages saved searches with built-in presets and custom searches.
 *
 * @package WPQP
 */

namespace WPQP;

use WPQP\Helpers\Options;

defined( 'ABSPATH' ) || exit;

class SavedSearchesController {

	/**
	 * Option name for saved searches.
	 */
	const OPTION_NAME = 'wp_quick_palette_saved_searches';

	/**
	 * Initialize hooks.
	 */
	public function __construct() {
		add_action( 'wp_ajax_wpqp_get_saved_searches', array( $this, 'ajax_get_saved_searches' ) );
		add_action( 'wp_ajax_wpqp_execute_saved_search', array( $this, 'ajax_execute_saved_search' ) );
		add_action( 'wp_ajax_wpqp_save_saved_search', array( $this, 'ajax_save_saved_search' ) );
		add_action( 'wp_ajax_wpqp_delete_saved_search', array( $this, 'ajax_delete_saved_search' ) );
	}

	/**
	 * Get saved searches option.
	 *
	 * @return array
	 */
	public static function get_saved_searches() {
		$saved = get_option( self::OPTION_NAME );
		if ( ! is_array( $saved ) ) {
			return array();
		}
		return $saved;
	}

	/**
	 * Get all saved searches including built-in presets.
	 *
	 * @param string|null $user_role Optional user role to filter by.
	 * @return array
	 */
	public function get_available_searches( $user_role = null ) {
		$built_in = $this->get_builtin_presets();
		$custom   = self::get_saved_searches();

		// Merge built-in and custom searches
		$all = array_merge( $built_in, $custom );

		// Filter by user role if specified
		if ( $user_role ) {
			$all = array_filter( $all, function( $search ) use ( $user_role ) {
				// If no roles specified, available to all
				if ( empty( $search['roles'] ) ) {
					return true;
				}
				return in_array( $user_role, $search['roles'], true );
			});
		}

		// Re-index array
		return array_values( $all );
	}

	/**
	 * Get built-in preset saved searches.
	 *
	 * @return array
	 */
	private function get_builtin_presets() {
		$presets = array(
			array(
				'id'         => 'draft_posts_week',
				'label'      => __( 'Draft posts (last 7 days)', 'wp-quick-palette' ),
				'roles'      => array( 'editor', 'administrator' ),
				'is_builtin' => true,
				'query_args' => array(
					'post_type'      => 'post',
					'post_status'    => 'draft',
					'posts_per_page' => 20,
					'date_query'     => array(
						array(
							'after' => '7 days ago',
						),
					),
				),
			),
			array(
				'id'         => 'draft_pages_week',
				'label'      => __( 'Draft pages (last 7 days)', 'wp-quick-palette' ),
				'roles'      => array( 'editor', 'administrator' ),
				'is_builtin' => true,
				'query_args' => array(
					'post_type'      => 'page',
					'post_status'    => 'draft',
					'posts_per_page' => 20,
					'date_query'     => array(
						array(
							'after' => '7 days ago',
						),
					),
				),
			),
			array(
				'id'         => 'scheduled_posts',
				'label'      => __( 'Scheduled posts', 'wp-quick-palette' ),
				'roles'      => array( 'editor', 'administrator' ),
				'is_builtin' => true,
				'query_args' => array(
					'post_type'      => 'post',
					'post_status'    => 'future',
					'posts_per_page' => 20,
				),
			),
			array(
				'id'         => 'pending_review',
				'label'      => __( 'Pending review', 'wp-quick-palette' ),
				'roles'      => array( 'editor', 'administrator' ),
				'is_builtin' => true,
				'query_args' => array(
					'post_type'      => array( 'post', 'page' ),
					'post_status'    => 'pending',
					'posts_per_page' => 20,
				),
			),
			array(
				'id'         => 'posts_no_featured',
				'label'      => __( 'Posts without featured image', 'wp-quick-palette' ),
				'roles'      => array( 'editor', 'administrator' ),
				'is_builtin' => true,
				'query_args' => array(
					'post_type'      => 'post',
					'post_status'    => 'publish',
					'posts_per_page' => 20,
					'meta_query'     => array(
						array(
							'key'     => '_thumbnail_id',
							'compare' => 'NOT EXISTS',
						),
					),
				),
			),
			array(
				'id'         => 'pages_no_featured',
				'label'      => __( 'Pages without featured image', 'wp-quick-palette' ),
				'roles'      => array( 'editor', 'administrator' ),
				'is_builtin' => true,
				'query_args' => array(
					'post_type'      => 'page',
					'post_status'    => 'publish',
					'posts_per_page' => 20,
					'meta_query'     => array(
						array(
							'key'     => '_thumbnail_id',
							'compare' => 'NOT EXISTS',
						),
					),
				),
			),
		);

		// Add WooCommerce presets if active
		if ( class_exists( 'WooCommerce' ) ) {
			$woo_presets = array(
				array(
					'id'         => 'wc_orders_on_hold',
					'label'      => __( 'WooCommerce: On Hold orders', 'wp-quick-palette' ),
					'roles'      => array( 'shop_manager', 'administrator' ),
					'is_builtin' => true,
					'query_args' => array(
						'post_type'      => 'shop_order',
						'post_status'    => 'wc-on-hold',
						'posts_per_page' => 20,
					),
				),
				array(
					'id'         => 'wc_orders_processing',
					'label'      => __( 'WooCommerce: Processing orders', 'wp-quick-palette' ),
					'roles'      => array( 'shop_manager', 'administrator' ),
					'is_builtin' => true,
					'query_args' => array(
						'post_type'      => 'shop_order',
						'post_status'    => 'wc-processing',
						'posts_per_page' => 20,
					),
				),
			);
			$presets = array_merge( $presets, $woo_presets );
		}

		return $presets;
	}

	/**
	 * AJAX handler to get saved searches for current user.
	 */
	public function ajax_get_saved_searches() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to view saved searches.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$user  = wp_get_current_user();
		$role  = ! empty( $user->roles ) ? $user->roles[0] : null;

		$searches = $this->get_available_searches( $role );

		wp_send_json_success( array( 'saved_searches' => $searches ) );
	}

	/**
	 * AJAX handler to execute a saved search.
	 */
	public function ajax_execute_saved_search() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to search.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$search_id = isset( $_POST['search_id'] ) ? sanitize_text_field( wp_unslash( $_POST['search_id'] ) ) : '';

		if ( empty( $search_id ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Invalid search ID.', 'wp-quick-palette' ) ),
				400
			);
			return;
		}

		$user    = wp_get_current_user();
		$role    = ! empty( $user->roles ) ? $user->roles[0] : null;
		$searches = $this->get_available_searches( $role );

		// Find the search by ID
		$search = null;
		foreach ( $searches as $s ) {
			if ( $s['id'] === $search_id ) {
				$search = $s;
				break;
			}
		}

		if ( ! $search ) {
			wp_send_json_error(
				array( 'message' => __( 'Saved search not found or access denied.', 'wp-quick-palette' ) ),
				404
			);
			return;
		}

		// Execute the query
		$query_args = isset( $search['query_args'] ) ? $search['query_args'] : array();

		// Ensure required args
		if ( empty( $query_args['post_type'] ) ) {
			$query_args['post_type'] = 'any';
		}

		// Default posts per page
		if ( empty( $query_args['posts_per_page'] ) ) {
			$query_args['posts_per_page'] = 20;
		}

		// Add fields
		$query_args['fields'] = 'ids';

		// Execute query
		$query = new \WP_Query( $query_args );

		$results = array();

		if ( $query->have_posts() ) {
			foreach ( $query->posts as $post_id ) {
				if ( ! current_user_can( 'read_post', $post_id ) ) {
					continue;
				}

				$post_type = get_post_type( $post_id );

				$results[] = array(
					'type'          => $post_type,
					'id'            => $post_id,
					'title'         => get_the_title( $post_id ),
					'status'        => get_post_status( $post_id ),
					'modified_date' => get_post_modified_time( 'c', true, $post_id ),
					'created_date'  => get_post_time( 'c', true, $post_id ),
					'edit_url'      => get_edit_post_link( $post_id, 'raw' ),
					'view_url'      => get_permalink( $post_id ),
				);
			}
		}

		// Group results by post type
		$grouped = array();
		foreach ( $results as $item ) {
			$type = $item['type'];
			if ( ! isset( $grouped[ $type ] ) ) {
				$grouped[ $type ] = array();
			}
			$grouped[ $type ][] = $item;
		}

		wp_send_json_success(
			array(
				'results' => ! empty( $grouped ) ? $grouped : new \stdClass(),
				'meta'    => array(
					'query'      => $search['label'],
					'context'    => 'saved_search',
					'search_id'  => $search_id,
					'total'      => count( $results ),
				),
			)
		);
	}

	/**
	 * AJAX handler to save a custom saved search.
	 */
	public function ajax_save_saved_search() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to save searches.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$id         = isset( $_POST['id'] ) ? sanitize_key( wp_unslash( $_POST['id'] ) ) : '';
		$label      = isset( $_POST['label'] ) ? sanitize_text_field( wp_unslash( $_POST['label'] ) ) : '';
		$query_args = isset( $_POST['query_args'] ) ? json_decode( wp_unslash( $_POST['query_args'] ), true ) : array();
		$query_args = is_array( $query_args ) ? $this->sanitize_query_args( $query_args ) : array();
		$roles      = isset( $_POST['roles'] ) ? array_map( 'sanitize_key', wp_unslash( (array) $_POST['roles'] ) ) : array();

		if ( empty( $id ) || empty( $label ) ) {
			wp_send_json_error(
				array( 'message' => __( 'ID and label are required.', 'wp-quick-palette' ) ),
				400
			);
			return;
		}

		$saved_searches = self::get_saved_searches();

		// Check for duplicate ID
		$existing_index = null;
		foreach ( $saved_searches as $i => $search ) {
			if ( $search['id'] === $id ) {
				$existing_index = $i;
				break;
			}
		}

		$new_search = array(
			'id'         => $id,
			'label'      => $label,
			'roles'      => $roles,
			'is_builtin' => false,
			'query_args' => $query_args,
		);

		if ( null !== $existing_index ) {
			$saved_searches[ $existing_index ] = $new_search;
		} else {
			$saved_searches[] = $new_search;
		}

		update_option( self::OPTION_NAME, $saved_searches );

		wp_send_json_success(
			array(
				'saved_searches' => $this->get_available_searches(),
				'message'        => __( 'Saved search updated.', 'wp-quick-palette' ),
			)
		);
	}

	/**
	 * AJAX handler to delete a custom saved search.
	 */
	public function ajax_delete_saved_search() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to delete searches.', 'wp-quick-palette' ) ),
				403
			);
			return;
		}

		$id = isset( $_POST['id'] ) ? sanitize_key( wp_unslash( $_POST['id'] ) ) : '';

		if ( empty( $id ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Invalid search ID.', 'wp-quick-palette' ) ),
				400
			);
			return;
		}

		$saved_searches = self::get_saved_searches();

		// Find and remove the search (built-in searches cannot be deleted)
		$found = false;
		foreach ( $saved_searches as $i => $search ) {
			if ( $search['id'] === $id && empty( $search['is_builtin'] ) ) {
				unset( $saved_searches[ $i ] );
				$found = true;
				break;
			}
		}

		if ( ! $found ) {
			wp_send_json_error(
				array( 'message' => __( 'Saved search not found or cannot be deleted.', 'wp-quick-palette' ) ),
				404
			);
			return;
		}

		// Re-index array
		$saved_searches = array_values( $saved_searches );

		update_option( self::OPTION_NAME, $saved_searches );

		wp_send_json_success(
			array(
				'saved_searches' => $this->get_available_searches(),
				'message'        => __( 'Saved search deleted.', 'wp-quick-palette' ),
			)
		);
	}

	/**
	 * Sanitize query_args using an allow-list of safe keys.
	 *
	 * @param array $args Raw query args.
	 * @return array Sanitized query args.
	 */
	private function sanitize_query_args( array $args ) {
		$allowed_keys = array(
			'post_type',
			'post_status',
			'posts_per_page',
			'author',
			'orderby',
			'order',
			'meta_key',
			'meta_value',
			'meta_compare',
			'date_query',
			'meta_query',
			'category_name',
			'tag',
			'tax_query',
			's',
		);

		$safe = array();
		foreach ( $args as $key => $value ) {
			if ( in_array( $key, $allowed_keys, true ) ) {
				$safe[ $key ] = $this->deep_sanitize( $value );
			}
		}
		return $safe;
	}

	/**
	 * Recursively sanitize a scalar or array value.
	 *
	 * @param mixed $value Value to sanitize.
	 * @return mixed
	 */
	private function deep_sanitize( $value ) {
		if ( is_array( $value ) ) {
			return array_map( array( $this, 'deep_sanitize' ), $value );
		}
		if ( is_int( $value ) || is_float( $value ) ) {
			return $value;
		}
		return sanitize_text_field( (string) $value );
	}
}
