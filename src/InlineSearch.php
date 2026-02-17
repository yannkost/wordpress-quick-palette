<?php
/**
 * Inline search bar for the admin header (Pro).
 *
 * @package WPQP
 */

namespace WPQP;

use WPQP\Helpers\Options;
use WPQP\Helpers\UserMeta;

defined( 'ABSPATH' ) || exit;

class InlineSearch {

	public function __construct() {
		add_action( 'admin_footer', array( $this, 'render_inline_bar' ) );
	}

	/**
	 * Render the inline search bar HTML in the admin footer.
	 *
	 * Positioned via CSS to appear below the admin bar.
	 */
	public function render_inline_bar() {
		$options = Options::get_all();

		// Check global option.
		if ( empty( $options['pro']['inline_search_enabled'] ) ) {
			return;
		}

		// Check user preference.
		$user_prefs = UserMeta::get_preferences();
		if ( isset( $user_prefs['inline_visible'] ) && false === $user_prefs['inline_visible'] ) {
			return;
		}

		if ( ! current_user_can( 'read' ) ) {
			return;
		}

		?>
		<div id="wpqp-inline-search-root" class="wpqp-inline-bar">
			<input
				type="text"
				class="wpqp-inline-input"
				placeholder="<?php esc_attr_e( 'Quick search...', 'wp-quick-palette' ); ?>"
				aria-label="<?php esc_attr_e( 'Quick search', 'wp-quick-palette' ); ?>"
				autocomplete="off"
			/>
			<div class="wpqp-inline-dropdown" aria-hidden="true"></div>
		</div>
		<?php
	}
}
