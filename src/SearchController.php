<?php
/**
 * Search controller for AJAX search endpoint.
 *
 * @package WPQP
 */

namespace WPQP;

use WPQP\Helpers\Options;

defined( 'ABSPATH' ) || exit;

class SearchController {

	public function __construct() {
		add_action( 'wp_ajax_wpqp_search', array( $this, 'handle_search' ) );
	}

	public function handle_search() {
		check_ajax_referer( 'wpqp_search_nonce' );

		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to search.', 'wp-quick-palette' ) ),
				403
			);
		}

		$search_term = isset( $_POST['q'] ) ? sanitize_text_field( wp_unslash( $_POST['q'] ) ) : '';
		$context     = isset( $_POST['context'] ) ? sanitize_text_field( wp_unslash( $_POST['context'] ) ) : 'palette';
		$search_type = isset( $_POST['search_type'] ) ? sanitize_text_field( wp_unslash( $_POST['search_type'] ) ) : 'content';

		if ( strlen( $search_term ) < 2 ) {
			wp_send_json_success(
				array(
					'results' => new \stdClass(),
					'meta'    => array(
						'query'      => $search_term,
						'context'    => $context,
						'search_type' => $search_type,
					),
				)
			);
		}

		$results = array();

		try {
			switch ( $search_type ) {
				case 'users':
					$results = $this->search_users( $search_term );
					break;
				case 'admin':
					$results = $this->search_admin( $search_term );
					break;
				case 'content':
				default:
					$results = $this->search_content( $search_term );
					break;
			}
		} catch ( \Throwable $e ) {
			error_log( sprintf( 'WPQP: Search error for type "%s", term "%s": %s', $search_type, $search_term, $e->getMessage() ) );
			$results = array();
		}

		wp_send_json_success(
			array(
				'results' => ! empty( $results ) ? $results : new \stdClass(),
				'meta'    => array(
					'query'      => $search_term,
					'context'    => $context,
					'search_type' => $search_type,
				),
			)
		);
	}

	/**
	 * Search content (posts, pages, CPTs).
	 *
	 * @param string $search_term Search term.
	 * @return array Search results grouped by post type.
	 */
	private function search_content( $search_term ) {
		$allowed_post_types = Options::get( 'search_post_types', array( 'post', 'page' ) );

		$post_statuses = array( 'publish' );
		if ( current_user_can( 'edit_others_posts' ) ) {
			$post_statuses = array( 'publish', 'draft', 'pending', 'private', 'future' );
		} elseif ( current_user_can( 'edit_posts' ) ) {
			$post_statuses = array( 'publish', 'draft', 'pending' );
		}

		// Restrict search to titles only (WP_Query 's' searches title + content by default).
		$title_only_filter = function ( $search, $query ) {
			if ( $query->get( 'wpqp_title_only' ) ) {
				global $wpdb;
				$term = $query->get( 'wpqp_search_term' );
				if ( ! empty( $term ) ) {
					$like   = '%' . $wpdb->esc_like( $term ) . '%';
					$search = $wpdb->prepare( " AND ({$wpdb->posts}.post_title LIKE %s)", $like );
				}
			}
			return $search;
		};
		add_filter( 'posts_search', $title_only_filter, 10, 2 );

		// Relevance sorting: starts-with matches ranked above contains matches.
		$relevance_orderby = function ( $orderby, $query ) use ( $search_term ) {
			if ( $query->get( 'wpqp_title_only' ) ) {
				global $wpdb;
				$starts_like = $wpdb->esc_like( $search_term ) . '%';
				$orderby     = $wpdb->prepare(
					"CASE WHEN {$wpdb->posts}.post_title LIKE %s THEN 0 ELSE 1 END ASC, {$wpdb->posts}.post_title ASC",
					$starts_like
				);
			}
			return $orderby;
		};
		add_filter( 'posts_orderby', $relevance_orderby, 10, 2 );

		$results = array();

		foreach ( $allowed_post_types as $post_type ) {
			$query = new \WP_Query(
				array(
					'post_type'        => $post_type,
					'post_status'      => $post_statuses,
					's'                => $search_term,
					'wpqp_title_only'  => true,
					'wpqp_search_term' => $search_term,
					'posts_per_page'   => 8,
					'fields'           => 'ids',
				)
			);

			$items = array();

			if ( $query->have_posts() ) {
				foreach ( $query->posts as $post_id ) {
					if ( ! current_user_can( 'read_post', $post_id ) ) {
						continue;
					}

					$items[] = array(
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

			if ( ! empty( $items ) ) {
				$results[ $post_type ] = $items;
			}
		}

		remove_filter( 'posts_search', $title_only_filter, 10 );
		remove_filter( 'posts_orderby', $relevance_orderby, 10 );

		return $results;
	}

	/**
	 * Search WordPress users.
	 *
	 * @param string $search_term Search term.
	 * @return array User search results grouped by type.
	 */
	private function search_users( $search_term ) {
		if ( ! current_user_can( 'list_users' ) ) {
			return array();
		}

		global $wpdb;

		$like = '%' . $wpdb->esc_like( $search_term ) . '%';

		// Search by user_login, user_email, display_name.
		$users = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT ID, user_login, user_email, display_name
				FROM {$wpdb->users}
				WHERE user_login LIKE %s
					OR user_email LIKE %s
					OR display_name LIKE %s
				ORDER BY
					CASE
						WHEN user_login LIKE %s THEN 0
						WHEN display_name LIKE %s THEN 1
						ELSE 2
					END,
					display_name ASC
				LIMIT 20",
				$like,
				$like,
				$like,
				$like,
				$like
			)
		);

		$results = array();

		foreach ( $users as $user ) {
			$user_obj   = new \WP_User( $user->ID );
			$user_roles = $user_obj->roles;
			$role_label = ! empty( $user_roles ) ? translate_user_role( ucfirst( $user_roles[0] ) ) : '';

			$results['user'][] = array(
				'type'       => 'user',
				'id'         => $user->ID,
				'title'      => $user->display_name,
				'edit_url'   => get_edit_user_link( $user->ID ),
				'user_email' => $user->user_email,
				'user_login' => $user->user_login,
				'user_role'  => $role_label,
			);
		}

		return $results;
	}

	/**
	 * Search admin menu items.
	 *
	 * @param string $search_term Search term.
	 * @return array Admin menu search results grouped by type.
	 */
	private function search_admin( $search_term ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return array();
		}

		$search_term_lower = strtolower( $search_term );
		$results           = array();
		$found_menus      = array();

		// Get admin menu from globals.
		global $menu, $submenu;

		// Search top-level menu items.
		if ( ! empty( $menu ) ) {
			foreach ( $menu as $menu_item ) {
				$menu_title = isset( $menu_item[0] ) ? wp_strip_all_tags( $menu_item[0] ) : '';
				$menu_url   = isset( $menu_item[2] ) ? $menu_item[2] : '';

				// Skip empty titles or separators.
				if ( empty( $menu_title ) || $menu_title === ' separator1' || $menu_title === ' separator2' ) {
					continue;
				}

				// Skip menus the user cannot access.
				if ( ! empty( $menu_url ) && $menu_url !== '#' && ! current_user_can( $this->get_menu_capability( $menu_url ) ) ) {
					continue;
				}

				if ( strpos( strtolower( $menu_title ), $search_term_lower ) !== false ) {
					$found_menus[ $menu_url ] = array(
						'id'       => sanitize_title( $menu_title ),
						'title'    => $menu_title,
						'url'      => $menu_url,
						'parent'   => '',
					);
				}
			}
		}

		// Search submenu items.
		if ( ! empty( $submenu ) ) {
			foreach ( $submenu as $parent_slug => $submenu_items ) {
				if ( ! is_array( $submenu_items ) ) {
					continue;
				}

				foreach ( $submenu_items as $submenu_item ) {
					$submenu_title = isset( $submenu_item[0] ) ? wp_strip_all_tags( $submenu_item[0] ) : '';
					$submenu_url   = isset( $submenu_item[2] ) ? $submenu_item[2] : '';

					// Skip empty titles.
					if ( empty( $submenu_title ) ) {
						continue;
					}

					// Skip submenus the user cannot access.
					if ( ! empty( $submenu_url ) && $submenu_url !== '#' && ! current_user_can( $this->get_menu_capability( $submenu_url ) ) ) {
						continue;
					}

					if ( strpos( strtolower( $submenu_title ), $search_term_lower ) !== false ) {
						$parent_title = '';

						// Find parent title from top-level menu.
						if ( ! empty( $menu ) ) {
							foreach ( $menu as $parent_item ) {
								if ( isset( $parent_item[2] ) && $parent_item[2] === $parent_slug ) {
									$parent_title = isset( $parent_item[0] ) ? wp_strip_all_tags( $parent_item[0] ) : '';
									break;
								}
							}
						}

						$found_menus[ $submenu_url ] = array(
							'id'     => sanitize_title( $parent_title . '-' . $submenu_title ),
							'title'  => $submenu_title,
							'url'    => $submenu_url,
							'parent' => $parent_title,
						);
					}
				}
			}
		}

		// Build results array.
		if ( ! empty( $found_menus ) ) {
			foreach ( $found_menus as $menu_url => $menu_data ) {
				// Validate URL.
				$edit_url = '';
				if ( ! empty( $menu_data['url'] ) && $menu_data['url'] !== '#' ) {
					$edit_url = admin_url( $menu_data['url'] );
					if ( strpos( $menu_data['url'], 'http' ) === 0 ) {
						$edit_url = $menu_data['url'];
					}
				}

				$results['admin'][] = array(
					'type'     => 'admin',
					'id'       => $menu_data['id'],
					'title'    => $menu_data['title'],
					'edit_url' => $edit_url,
					'parent'   => $menu_data['parent'],
				);
			}
		}

		return $results;
	}

	/**
	 * Get capability required for a menu URL.
	 *
	 * @param string $menu_url Menu URL.
	 * @return string Capability.
	 */
	private function get_menu_capability( $menu_url ) {
		// Map common admin URLs to capabilities.
		$capability_map = array(
			'index.php'         => 'read',
			'upload.php'        => 'upload_files',
			'link-manager.php'  => 'manage_links',
			'edit.php'          => 'edit_posts',
			'post-new.php'      => 'edit_posts',
			'edit.php?post_type=page' => 'edit_pages',
			'edit-comments.php' => 'edit_posts',
			'themes.php'        => 'switch_themes',
			'widgets.php'       => 'edit_theme_options',
			'nav-menus.php'     => 'edit_theme_options',
			'plugins.php'       => 'activate_plugins',
			'users.php'         => 'list_users',
			'user-new.php'      => 'create_users',
			'tools.php'         => 'edit_posts',
			'options-general.php' => 'manage_options',
			'settings.php'      => 'manage_options',
		);

		// Remove query args for matching.
		$base_url = strtok( $menu_url, '?' );

		if ( isset( $capability_map[ $base_url ] ) ) {
			return $capability_map[ $base_url ];
		}

		// Check for post type specific URLs.
		if ( strpos( $menu_url, 'edit.php?post_type=' ) !== false ) {
			$post_type = str_replace( 'edit.php?post_type=', '', $menu_url );
			$pt_obj    = get_post_type_object( $post_type );
			if ( $pt_obj && isset( $pt_obj->cap->edit_posts ) ) {
				return $pt_obj->cap->edit_posts;
			}
		}

		// Default capability.
		return 'edit_posts';
	}
}
