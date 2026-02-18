<?php
/**
 * Pro dashboard widget showing the current user's favorites.
 *
 * @package WPQP
 */

namespace WPQP;

defined( 'ABSPATH' ) || exit;

class DashboardWidget {

	/**
	 * Register hooks.
	 */
	public function __construct() {
		add_action( 'wp_dashboard_setup', array( $this, 'register_widget' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_styles' ) );
	}

	/**
	 * Register the dashboard widget.
	 */
	public function register_widget() {
		if ( ! current_user_can( 'read' ) ) {
			return;
		}

		wp_add_dashboard_widget(
			'wpqp_favorites_widget',
			__( 'My Favorites — Quick Palette', 'wp-quick-palette' ),
			array( $this, 'render_widget' )
		);
	}

	/**
	 * Enqueue widget styles on the dashboard only.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue_styles( $hook ) {
		if ( 'index.php' !== $hook ) {
			return;
		}

		wp_enqueue_style(
			'wpqp-dashboard-widget',
			WPQP_PLUGIN_URL . 'assets/css/dashboard-widget.css',
			array(),
			WPQP_VERSION
		);
	}

	/**
	 * Render the widget content.
	 */
	public function render_widget() {
		$user_id   = get_current_user_id();
		$favorites = get_user_meta( $user_id, FavoritesController::META_KEY, true );

		if ( ! is_array( $favorites ) ) {
			$favorites = array();
		}

		// Validate entries and remove stale ones.
		$valid = array();
		foreach ( $favorites as $fav ) {
			if ( empty( $fav['id'] ) || empty( $fav['type'] ) ) {
				continue;
			}

			if ( ! $this->is_valid_entry( $fav ) ) {
				continue;
			}

			$valid[] = $fav;
		}

		if ( empty( $valid ) ) {
			$this->render_empty();
			return;
		}

		echo '<ul class="wpqp-dw-list">';

		foreach ( $valid as $index => $fav ) {
			$post_id    = (int) $fav['id'];
			$post_type  = sanitize_key( $fav['type'] );
			$title      = ! empty( $fav['title'] ) ? $fav['title'] : $this->get_item_title( $fav );
			$edit_url   = ! empty( $fav['edit_url'] ) ? $fav['edit_url'] : $this->get_edit_url( $fav );
			$type_label = $this->get_type_label( $post_type );

			if ( empty( $edit_url ) || empty( $title ) ) {
				continue;
			}

			// Alt+1-9 shortcut badge for first 9 items.
			$shortcut = ( $index < 9 )
				? '<span class="wpqp-dw-shortcut" aria-label="' . esc_attr( sprintf( __( 'Keyboard shortcut: Alt+%d', 'wp-quick-palette' ), $index + 1 ) ) . '">Alt+' . ( $index + 1 ) . '</span>'
				: '';

			printf(
				'<li class="wpqp-dw-item">
					<a href="%1$s" class="wpqp-dw-link" title="%2$s">
						<span class="wpqp-dw-star" aria-hidden="true">&#9733;</span>
						<span class="wpqp-dw-title">%2$s</span>
					</a>
					<span class="wpqp-dw-meta">
						<span class="wpqp-dw-type">%3$s</span>
						%4$s
					</span>
				</li>',
				esc_url( $edit_url ),
				esc_html( $title ),
				esc_html( $type_label ),
				$shortcut // already escaped above
			);
		}

		echo '</ul>';

		$this->render_footer( count( $valid ) );
	}

	/**
	 * Render empty state.
	 */
	private function render_empty() {
		echo '<div class="wpqp-dw-empty">';
		echo '<p>' . esc_html__( 'No favorites yet. Open the palette and star items to pin them here.', 'wp-quick-palette' ) . '</p>';
		$this->render_footer( 0 );
		echo '</div>';
	}

	/**
	 * Render widget footer with open-palette button and count.
	 *
	 * @param int $count Number of favorites shown.
	 */
	private function render_footer( $count ) {
		$shortcut = get_option( 'wp_quick_palette_options' );
		$sc_raw   = isset( $shortcut['shortcut'] ) ? $shortcut['shortcut'] : 'ctrl+g';
		$sc_label = strtoupper( str_replace( '+', ' + ', $sc_raw ) );

		echo '<div class="wpqp-dw-footer">';

		printf(
			'<button type="button" class="button wpqp-dw-open-btn" onclick="if(window.WPQP&&WPQP.openPalette){WPQP.openPalette();}">%s <kbd>%s</kbd></button>',
			esc_html__( 'Open Palette', 'wp-quick-palette' ),
			esc_html( $sc_label )
		);

		if ( $count > 0 ) {
			printf(
				'<span class="wpqp-dw-count">%s</span>',
				esc_html(
					sprintf(
						/* translators: %d: number of favorite items */
						_n( '%d favorite', '%d favorites', $count, 'wp-quick-palette' ),
						$count
					)
				)
			);
		}

		echo '</div>';
	}

	/**
	 * Check whether a favorite entry still refers to a valid item.
	 *
	 * @param array $fav Favorite entry.
	 * @return bool
	 */
	private function is_valid_entry( array $fav ) {
		$type = $fav['type'];

		// User-type favorites: check user still exists.
		if ( 'user' === $type ) {
			return (bool) get_userdata( (int) $fav['id'] );
		}

		// Admin menu items always considered valid (URLs can't be verified statically).
		if ( 'admin' === $type ) {
			return true;
		}

		// Comment favorites: check comment exists.
		if ( 'comment' === $type ) {
			return (bool) get_comment( (int) $fav['id'] );
		}

		// Post-type favorites: check post exists and user can read it.
		$post = get_post( (int) $fav['id'] );
		return $post && current_user_can( 'read_post', $post->ID );
	}

	/**
	 * Get the display title for a favorite, falling back to live data.
	 *
	 * @param array $fav Favorite entry.
	 * @return string
	 */
	private function get_item_title( array $fav ) {
		if ( 'user' === $fav['type'] ) {
			$user = get_userdata( (int) $fav['id'] );
			return $user ? $user->display_name : '';
		}

		if ( 'comment' === $fav['type'] ) {
			$comment = get_comment( (int) $fav['id'] );
			return $comment ? wp_trim_words( wp_strip_all_tags( $comment->comment_content ), 8, '…' ) : '';
		}

		return get_the_title( (int) $fav['id'] );
	}

	/**
	 * Get the edit URL for a favorite, falling back to live data.
	 *
	 * @param array $fav Favorite entry.
	 * @return string
	 */
	private function get_edit_url( array $fav ) {
		if ( 'user' === $fav['type'] ) {
			return get_edit_user_link( (int) $fav['id'] );
		}

		if ( 'admin' === $fav['type'] ) {
			return admin_url( $fav['id'] );
		}

		if ( 'comment' === $fav['type'] ) {
			return admin_url( 'comment.php?action=editcomment&c=' . (int) $fav['id'] );
		}

		return (string) get_edit_post_link( (int) $fav['id'], 'raw' );
	}

	/**
	 * Get a human-readable label for a post type slug.
	 *
	 * @param string $type Post type slug or special type key.
	 * @return string
	 */
	private function get_type_label( $type ) {
		if ( 'user' === $type ) {
			return __( 'User', 'wp-quick-palette' );
		}

		if ( 'admin' === $type ) {
			return __( 'Admin', 'wp-quick-palette' );
		}

		if ( 'comment' === $type ) {
			return __( 'Comment', 'wp-quick-palette' );
		}

		$pt_obj = get_post_type_object( $type );
		return $pt_obj ? $pt_obj->labels->singular_name : ucfirst( $type );
	}
}
