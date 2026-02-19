<?php
/**
 * Pro import/export controller for favorites and saved searches.
 *
 * Exports current user's favorites + custom saved searches (admins only) as JSON.
 * Imports them with merge or replace modes.
 *
 * @package WPQP
 */

namespace WPQP;

defined( 'ABSPATH' ) || exit;

class ImportExportController {

	/**
	 * Nonce action for import/export requests.
	 */
	const NONCE_ACTION = 'wpqp_import_export_nonce';

	/**
	 * Export file format version.
	 */
	const EXPORT_VERSION = '1.0';

	/**
	 * Register hooks.
	 */
	public function __construct() {
		if ( ! function_exists( 'wpqp_is_pro' ) || ! wpqp_is_pro() ) {
			return;
		}

		add_action( 'wp_ajax_wpqp_export_data', array( $this, 'ajax_export' ) );
		add_action( 'wp_ajax_wpqp_import_data', array( $this, 'ajax_import' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_settings_script' ) );
	}

	/**
	 * Enqueue the import/export UI script on the plugin settings page only.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue_settings_script( $hook ) {
		if ( 'settings_page_wp-quick-palette' !== $hook ) {
			return;
		}

		if ( ! current_user_can( 'read' ) ) {
			return;
		}

		wp_enqueue_script(
			'wpqp-import-export',
			WPQP_PLUGIN_URL . 'assets/js/settings-import-export.js',
			array(),
			WPQP_VERSION,
			true
		);

		wp_localize_script(
			'wpqp-import-export',
			'wpqpImportExport',
			array(
				'ajaxUrl'           => admin_url( 'admin-ajax.php' ),
				'nonce'             => wp_create_nonce( self::NONCE_ACTION ),
				'canManageSearches' => current_user_can( 'manage_options' ),
				'strings'           => array(
					'exportSuccess'     => __( 'Data exported successfully.', 'wp-quick-palette' ),
					'importSuccess'     => __( 'Import complete', 'wp-quick-palette' ),
					'importError'       => __( 'Import failed. Please check the file and try again.', 'wp-quick-palette' ),
					'invalidFile'       => __( 'Invalid file. Please select a valid WP Quick Palette export file.', 'wp-quick-palette' ),
					'confirmReplace'    => __( 'This will replace all your current favorites and saved searches. Are you sure?', 'wp-quick-palette' ),
					'noFileSelected'    => __( 'Please select a file or paste JSON data.', 'wp-quick-palette' ),
					'favoritesImported' => __( 'favorites imported', 'wp-quick-palette' ),
					'searchesImported'  => __( 'saved searches imported', 'wp-quick-palette' ),
					'noNewItems'        => __( 'No new items were added (all items already exist).', 'wp-quick-palette' ),
					'exporting'         => __( 'Exporting…', 'wp-quick-palette' ),
					'importing'         => __( 'Importing…', 'wp-quick-palette' ),
					'downloadExport'    => __( 'Download Export File', 'wp-quick-palette' ),
					'import'            => __( 'Import', 'wp-quick-palette' ),
				),
			)
		);
	}

	/**
	 * AJAX handler: export favorites and custom saved searches as JSON.
	 */
	public function ajax_export() {
		try {
			check_ajax_referer( self::NONCE_ACTION );

			if ( ! current_user_can( 'read' ) ) {
				wp_send_json_error(
					array( 'message' => __( 'Permission denied.', 'wp-quick-palette' ) ),
					403
				);
				return;
			}

			$user_id   = get_current_user_id();
			$favorites = get_user_meta( $user_id, FavoritesController::META_KEY, true );

			if ( ! is_array( $favorites ) ) {
				$favorites = array();
			}

			// Only admins export saved searches (they are site-wide, not per-user).
			$saved_searches = array();
			if ( current_user_can( 'manage_options' ) ) {
				$all_saved = get_option( SavedSearchesController::OPTION_NAME );
				if ( is_array( $all_saved ) ) {
					// Exclude built-in presets — they are always present and cannot be imported.
					$saved_searches = array_values(
						array_filter(
							$all_saved,
							function ( $s ) {
								return empty( $s['is_builtin'] );
							}
						)
					);
				}
			}

			$payload = array(
				'plugin'         => 'wp-quick-palette',
				'export_version' => self::EXPORT_VERSION,
				'exported_at'    => gmdate( 'c' ),
				'favorites'      => $favorites,
				'saved_searches' => $saved_searches,
			);

			wp_send_json_success( array( 'data' => $payload ) );
		} catch ( \Throwable $e ) {
			error_log( 'WPQP: ImportExportController ajax_export: ' . $e->getMessage() );
			wp_send_json_error( array( 'message' => __( 'An unexpected error occurred.', 'wp-quick-palette' ) ), 500 );
		}
	}

	/**
	 * AJAX handler: import favorites and saved searches from JSON payload.
	 */
	public function ajax_import() {
		try {
			check_ajax_referer( self::NONCE_ACTION );

			if ( ! current_user_can( 'read' ) ) {
				wp_send_json_error(
					array( 'message' => __( 'Permission denied.', 'wp-quick-palette' ) ),
					403
				);
				return;
			}

			$raw_json = isset( $_POST['data'] ) ? wp_unslash( $_POST['data'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			$mode     = isset( $_POST['mode'] ) ? sanitize_key( wp_unslash( $_POST['mode'] ) ) : 'merge';

			if ( empty( $raw_json ) ) {
				wp_send_json_error(
					array( 'message' => __( 'No data provided.', 'wp-quick-palette' ) ),
					400
				);
				return;
			}

			// Enforce a 1MB size limit to prevent memory exhaustion.
			if ( strlen( $raw_json ) > 1048576 ) {
				wp_send_json_error(
					array( 'message' => __( 'Import data is too large (max 1MB).', 'wp-quick-palette' ) ),
					413
				);
				return;
			}

			$payload = json_decode( $raw_json, true );

			if (
				! is_array( $payload ) ||
				empty( $payload['plugin'] ) ||
				'wp-quick-palette' !== $payload['plugin']
			) {
				wp_send_json_error(
					array( 'message' => __( 'Invalid export file. The file does not appear to be a valid WP Quick Palette export.', 'wp-quick-palette' ) ),
					422
				);
				return;
			}

			$imported_favorites = 0;
			$imported_searches  = 0;

			// Import favorites (always for the current user).
			if ( ! empty( $payload['favorites'] ) && is_array( $payload['favorites'] ) ) {
				$imported_favorites = $this->import_favorites( $payload['favorites'], $mode );
			}

			// Import saved searches (admins only — site-wide data).
			if (
				current_user_can( 'manage_options' ) &&
				! empty( $payload['saved_searches'] ) &&
				is_array( $payload['saved_searches'] )
			) {
				$imported_searches = $this->import_saved_searches( $payload['saved_searches'], $mode );
			}

			wp_send_json_success(
				array(
					'imported_favorites'      => $imported_favorites,
					'imported_saved_searches' => $imported_searches,
				)
			);
		} catch ( \Throwable $e ) {
			error_log( 'WPQP: ImportExportController ajax_import: ' . $e->getMessage() );
			wp_send_json_error( array( 'message' => __( 'An unexpected error occurred.', 'wp-quick-palette' ) ), 500 );
		}
	}

	/**
	 * Import favorites for the current user.
	 *
	 * @param array  $incoming Favorites array from the export payload.
	 * @param string $mode     'merge' or 'replace'.
	 * @return int Number of items actually written.
	 */
	private function import_favorites( array $incoming, $mode ) {
		$sanitized = array();

		foreach ( $incoming as $fav ) {
			if ( empty( $fav['type'] ) || ( '' === $fav['id'] || ( ! is_string( $fav['id'] ) && 0 === (int) $fav['id'] ) ) ) {
				continue;
			}
			$type   = sanitize_text_field( $fav['type'] );
			$id_raw = sanitize_text_field( (string) $fav['id'] );
			// Admin-type favorites use URL slugs as IDs; all other types use integer post/user IDs.
			$id     = ( 'admin' === $type ) ? $id_raw : absint( $id_raw );

			if ( '' === $id || 0 === $id ) {
				continue;
			}

			$sanitized[] = array(
				'type'     => $type,
				'id'       => $id,
				'title'    => isset( $fav['title'] )    ? sanitize_text_field( $fav['title'] )    : '',
				'edit_url' => isset( $fav['edit_url'] ) ? esc_url_raw( $fav['edit_url'] )         : '',
				'added_at' => isset( $fav['added_at'] ) ? absint( $fav['added_at'] )              : time(),
			);
		}

		$user_id = get_current_user_id();

		if ( 'replace' === $mode ) {
			update_user_meta( $user_id, FavoritesController::META_KEY, $sanitized );
			return count( $sanitized );
		}

		// Merge: skip items already in the list (matched by type + id).
		$existing = get_user_meta( $user_id, FavoritesController::META_KEY, true );
		if ( ! is_array( $existing ) ) {
			$existing = array();
		}

		$added = 0;
		foreach ( $sanitized as $fav ) {
			$is_duplicate = false;
			foreach ( $existing as $e ) {
				if ( $e['type'] === $fav['type'] && (string) $e['id'] === (string) $fav['id'] ) {
					$is_duplicate = true;
					break;
				}
			}
			if ( ! $is_duplicate ) {
				$existing[] = $fav;
				$added++;
			}
		}

		update_user_meta( $user_id, FavoritesController::META_KEY, $existing );
		return $added;
	}

	/**
	 * Import custom saved searches (site-wide).
	 *
	 * @param array  $incoming Saved searches from the export payload.
	 * @param string $mode     'merge' or 'replace'.
	 * @return int Number of items actually written.
	 */
	private function import_saved_searches( array $incoming, $mode ) {
		$sanitized = array();

		foreach ( $incoming as $s ) {
			if ( empty( $s['id'] ) || empty( $s['label'] ) ) {
				continue;
			}
			$sanitized[] = array(
				'id'         => sanitize_key( $s['id'] ),
				'label'      => sanitize_text_field( $s['label'] ),
				'roles'      => isset( $s['roles'] ) && is_array( $s['roles'] )
					? array_map( 'sanitize_key', $s['roles'] )
					: array(),
				'is_builtin' => false, // Never import as built-in.
				'query_args' => isset( $s['query_args'] ) && is_array( $s['query_args'] )
					? $this->sanitize_query_args( $s['query_args'] )
					: array(),
			);
		}

		if ( 'replace' === $mode ) {
			update_option( SavedSearchesController::OPTION_NAME, $sanitized );
			return count( $sanitized );
		}

		// Merge: update by ID or append new.
		$existing = get_option( SavedSearchesController::OPTION_NAME );
		if ( ! is_array( $existing ) ) {
			$existing = array();
		}

		// Strip any built-in entries that may have slipped into the option.
		$existing = array_values(
			array_filter(
				$existing,
				function ( $e ) {
					return empty( $e['is_builtin'] );
				}
			)
		);

		$added = 0;
		foreach ( $sanitized as $s ) {
			$found = false;
			foreach ( $existing as &$e ) {
				if ( $e['id'] === $s['id'] ) {
					$e     = $s; // Update in place.
					$found = true;
					break;
				}
			}
			unset( $e );

			if ( ! $found ) {
				$existing[] = $s;
				$added++;
			}
		}

		update_option( SavedSearchesController::OPTION_NAME, $existing );
		return $added;
	}

	/**
	 * Sanitize query_args from an import payload using an allow-list of safe keys.
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
