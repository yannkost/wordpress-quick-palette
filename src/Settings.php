<?php
/**
 * Settings page registration and rendering.
 *
 * @package WPQP
 */

namespace WPQP;

use WPQP\Helpers\Options;

defined( 'ABSPATH' ) || exit;

class Settings {

	/**
	 * Initialize settings hooks.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	/**
	 * Register the settings page under Settings menu.
	 */
	public function register_menu() {
		add_options_page(
			__( 'Quick Palette', 'wp-quick-palette' ),
			__( 'Quick Palette', 'wp-quick-palette' ),
			'manage_options',
			'wp-quick-palette',
			array( $this, 'render_page' )
		);
	}

	/**
	 * Register settings, sections, and fields via WordPress Settings API.
	 */
	public function register_settings() {
		// Register the main setting
		register_setting(
			'wpqp_settings',
			Options::OPTION_NAME,
			array(
				'sanitize_callback' => array( $this, 'sanitize_options' ),
			)
		);

		// Section: General
		add_settings_section(
			'wpqp_general',
			__( 'General', 'wp-quick-palette' ),
			array( $this, 'section_general_callback' ),
			'wp-quick-palette'
		);

		add_settings_field(
			'enabled',
			__( 'Enable Quick Palette', 'wp-quick-palette' ),
			array( $this, 'field_enabled' ),
			'wp-quick-palette',
			'wpqp_general'
		);

		add_settings_field(
			'shortcut',
			__( 'Keyboard Shortcut', 'wp-quick-palette' ),
			array( $this, 'field_shortcut' ),
			'wp-quick-palette',
			'wpqp_general'
		);

		add_settings_field(
			'show_admin_bar_icon',
			__( 'Admin Bar Icon', 'wp-quick-palette' ),
			array( $this, 'field_show_admin_bar_icon' ),
			'wp-quick-palette',
			'wpqp_general'
		);

		// Section: Search
		add_settings_section(
			'wpqp_search',
			__( 'Search', 'wp-quick-palette' ),
			array( $this, 'section_search_callback' ),
			'wp-quick-palette'
		);

		add_settings_field(
			'search_post_types',
			__( 'Searchable Post Types', 'wp-quick-palette' ),
			array( $this, 'field_search_post_types' ),
			'wp-quick-palette',
			'wpqp_search'
		);

		// Section: Appearance
		add_settings_section(
			'wpqp_appearance',
			__( 'Appearance', 'wp-quick-palette' ),
			array( $this, 'section_appearance_callback' ),
			'wp-quick-palette'
		);

		add_settings_field(
			'theme',
			__( 'Theme', 'wp-quick-palette' ),
			array( $this, 'field_theme' ),
			'wp-quick-palette',
			'wpqp_appearance'
		);

		add_settings_field(
			'default_density',
			__( 'Density', 'wp-quick-palette' ),
			array( $this, 'field_default_density' ),
			'wp-quick-palette',
			'wpqp_appearance'
		);

		// Section: Pro Features (only when Pro is active).
		if ( function_exists( 'wpqp_is_pro' ) && wpqp_is_pro() ) {
			add_settings_section(
				'wpqp_pro',
				__( 'Pro Features', 'wp-quick-palette' ),
				array( $this, 'section_pro_callback' ),
				'wp-quick-palette'
			);

			add_settings_field(
				'history_limit',
				__( 'History Limit', 'wp-quick-palette' ),
				array( $this, 'field_history_limit' ),
				'wp-quick-palette',
				'wpqp_pro'
			);

			add_settings_field(
				'inline_search_enabled',
				__( 'Inline Search Bar', 'wp-quick-palette' ),
				array( $this, 'field_inline_search_enabled' ),
				'wp-quick-palette',
				'wpqp_pro'
			);

			add_settings_field(
				'saved_searches_list',
				__( 'Saved Searches', 'wp-quick-palette' ),
				array( $this, 'field_saved_searches_list' ),
				'wp-quick-palette',
				'wpqp_pro'
			);
		}
	}

	/**
	 * Sanitize and validate submitted options.
	 *
	 * @param array $input Raw input from form submission.
	 * @return array Sanitized options.
	 */
	public function sanitize_options( $input ) {
		$defaults  = Options::get_defaults();
		$sanitized = array();

		// Enabled: boolean
		$sanitized['enabled'] = ! empty( $input['enabled'] );

		// Shortcut: whitelist
		$allowed_shortcuts = array( 'ctrl+g', 'ctrl+k', 'ctrl+/' );
		$sanitized['shortcut'] = isset( $input['shortcut'] ) && in_array( $input['shortcut'], $allowed_shortcuts, true )
			? $input['shortcut']
			: $defaults['shortcut'];

		// Show admin bar icon: boolean
		$sanitized['show_admin_bar_icon'] = ! empty( $input['show_admin_bar_icon'] );

		// Search post types: validate against registered public post types
		$available_post_types = get_post_types( array( 'public' => true, 'show_ui' => true ) );
		$sanitized['search_post_types'] = array();
		if ( ! empty( $input['search_post_types'] ) && is_array( $input['search_post_types'] ) ) {
			foreach ( $input['search_post_types'] as $pt ) {
				if ( in_array( $pt, $available_post_types, true ) ) {
					$sanitized['search_post_types'][] = sanitize_text_field( $pt );
				}
			}
		}
		// Fallback to defaults if none selected
		if ( empty( $sanitized['search_post_types'] ) ) {
			$sanitized['search_post_types'] = $defaults['search_post_types'];
		}

		// Theme: whitelist
		$allowed_themes = array( 'light', 'dark', 'auto' );
		$sanitized['theme'] = in_array( $input['theme'], $allowed_themes, true )
			? $input['theme']
			: $defaults['theme'];

		// Density: whitelist
		$allowed_densities = array( 'normal', 'compact' );
		$sanitized['default_density'] = in_array( $input['default_density'], $allowed_densities, true )
			? $input['default_density']
			: $defaults['default_density'];

		// Pro settings.
		$current = Options::get_all();
		$sanitized['pro'] = isset( $current['pro'] ) ? $current['pro'] : $defaults['pro'];

		// Pro-only fields: editable when Pro is active.
		if ( function_exists( 'wpqp_is_pro' ) && wpqp_is_pro() ) {
			if ( isset( $input['pro']['history_limit'] ) ) {
				$limit = (int) $input['pro']['history_limit'];
				$sanitized['pro']['history_limit'] = max( 10, min( 200, $limit ) );
			}

			$sanitized['pro']['inline_search_enabled'] = ! empty( $input['pro']['inline_search_enabled'] );
		}

		return $sanitized;
	}

	/**
	 * Render the settings page template.
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		include dirname( __DIR__ ) . '/templates/settings-page.php';
	}

	// Section callbacks

	public function section_general_callback() {
		echo '<p>' . esc_html__( 'Configure core Quick Palette functionality.', 'wp-quick-palette' ) . '</p>';
	}

	public function section_search_callback() {
		echo '<p>' . esc_html__( 'Choose which post types appear in search results.', 'wp-quick-palette' ) . '</p>';
	}

	public function section_appearance_callback() {
		echo '<p>' . esc_html__( 'Customize the look and feel of the Quick Palette.', 'wp-quick-palette' ) . '</p>';
	}

	public function section_pro_callback() {
		echo '<p>' . esc_html__( 'Configure Pro features for favorites and history.', 'wp-quick-palette' ) . '</p>';
	}

	// Field callbacks

	public function field_enabled() {
		$options = Options::get_all();
		$enabled = $options['enabled'];
		?>
		<label>
			<input
				type="checkbox"
				name="<?php echo esc_attr( Options::OPTION_NAME ); ?>[enabled]"
				value="1"
				<?php checked( $enabled, true ); ?>
			/>
			<?php esc_html_e( 'Enable the Quick Palette plugin', 'wp-quick-palette' ); ?>
		</label>
		<?php
	}

	public function field_shortcut() {
		$options  = Options::get_all();
		$shortcut = $options['shortcut'];
		$shortcuts = array(
			'ctrl+g' => 'Ctrl+G',
			'ctrl+k' => 'Ctrl+K',
			'ctrl+/' => 'Ctrl+/',
		);
		?>
		<select name="<?php echo esc_attr( Options::OPTION_NAME ); ?>[shortcut]">
			<?php foreach ( $shortcuts as $value => $label ) : ?>
				<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $shortcut, $value ); ?>>
					<?php echo esc_html( $label ); ?>
				</option>
			<?php endforeach; ?>
		</select>
		<p class="description">
			<?php esc_html_e( 'Choose the keyboard shortcut to open the Quick Palette.', 'wp-quick-palette' ); ?>
		</p>
		<?php
	}

	public function field_show_admin_bar_icon() {
		$options = Options::get_all();
		$show    = $options['show_admin_bar_icon'];
		?>
		<label>
			<input
				type="checkbox"
				name="<?php echo esc_attr( Options::OPTION_NAME ); ?>[show_admin_bar_icon]"
				value="1"
				<?php checked( $show, true ); ?>
			/>
			<?php esc_html_e( 'Show Quick Palette icon in the admin toolbar', 'wp-quick-palette' ); ?>
		</label>
		<?php
	}

	public function field_search_post_types() {
		$options        = Options::get_all();
		$selected_types = $options['search_post_types'];

		$post_types = get_post_types(
			array(
				'public'  => true,
				'show_ui' => true,
			),
			'objects'
		);

		foreach ( $post_types as $post_type ) {
			$checked = in_array( $post_type->name, $selected_types, true );
			?>
			<label style="display: block; margin-bottom: 8px;">
				<input
					type="checkbox"
					name="<?php echo esc_attr( Options::OPTION_NAME ); ?>[search_post_types][]"
					value="<?php echo esc_attr( $post_type->name ); ?>"
					<?php checked( $checked, true ); ?>
				/>
				<?php echo esc_html( $post_type->label ); ?>
			</label>
			<?php
		}
		?>
		<p class="description">
			<?php esc_html_e( 'Select which post types should be searchable via Quick Palette.', 'wp-quick-palette' ); ?>
		</p>
		<?php
	}

	public function field_theme() {
		$options = Options::get_all();
		$theme   = $options['theme'];
		$themes  = array(
			'light' => __( 'Light', 'wp-quick-palette' ),
			'dark'  => __( 'Dark', 'wp-quick-palette' ),
			'auto'  => __( 'Match Admin (Auto)', 'wp-quick-palette' ),
		);
		?>
		<select name="<?php echo esc_attr( Options::OPTION_NAME ); ?>[theme]">
			<?php foreach ( $themes as $value => $label ) : ?>
				<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $theme, $value ); ?>>
					<?php echo esc_html( $label ); ?>
				</option>
			<?php endforeach; ?>
		</select>
		<p class="description">
			<?php esc_html_e( 'Choose the color scheme for the Quick Palette.', 'wp-quick-palette' ); ?>
		</p>
		<?php
	}

	public function field_default_density() {
		$options   = Options::get_all();
		$density   = $options['default_density'];
		$densities = array(
			'normal'  => __( 'Normal', 'wp-quick-palette' ),
			'compact' => __( 'Compact', 'wp-quick-palette' ),
		);
		?>
		<select name="<?php echo esc_attr( Options::OPTION_NAME ); ?>[default_density]">
			<?php foreach ( $densities as $value => $label ) : ?>
				<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $density, $value ); ?>>
					<?php echo esc_html( $label ); ?>
				</option>
			<?php endforeach; ?>
		</select>
		<p class="description">
			<?php esc_html_e( 'Choose the default spacing for items in the Quick Palette.', 'wp-quick-palette' ); ?>
		</p>
		<?php
	}

	public function field_history_limit() {
		$options = Options::get_all();
		$limit   = isset( $options['pro']['history_limit'] ) ? (int) $options['pro']['history_limit'] : 50;
		?>
		<input
			type="number"
			name="<?php echo esc_attr( Options::OPTION_NAME ); ?>[pro][history_limit]"
			value="<?php echo esc_attr( $limit ); ?>"
			min="10"
			max="200"
			style="width: 80px;"
		/>
		<p class="description">
			<?php esc_html_e( 'Number of recent items to keep in your history (10-200).', 'wp-quick-palette' ); ?>
		</p>
		<?php
	}

	public function field_inline_search_enabled() {
		$options = Options::get_all();
		$enabled = ! empty( $options['pro']['inline_search_enabled'] );
		?>
		<label>
			<input
				type="checkbox"
				name="<?php echo esc_attr( Options::OPTION_NAME ); ?>[pro][inline_search_enabled]"
				value="1"
				<?php checked( $enabled, true ); ?>
			/>
			<?php esc_html_e( 'Show a compact search bar in the admin header', 'wp-quick-palette' ); ?>
		</label>
		<p class="description">
			<?php esc_html_e( 'When enabled, a quick search bar appears below the admin toolbar. Users can hide it via their personal preferences.', 'wp-quick-palette' ); ?>
		</p>
		<?php
	}

	public function field_saved_searches_list() {
		$user = wp_get_current_user();
		$role = ! empty( $user->roles ) ? $user->roles[0] : null;

		// Get the controller instance to fetch saved searches
		$saved_searches_controller = new \WPQP\SavedSearchesController();
		$searches = $saved_searches_controller->get_available_searches( $role );

		if ( empty( $searches ) ) {
			echo '<p class="description">' . esc_html__( 'No saved searches available for your role.', 'wp-quick-palette' ) . '</p>';
			return;
		}

		echo '<div class="wpqp-saved-searches-list">';
		echo '<table class="wp-list-table widefat fixed striped" style="max-width: 600px;">';
		echo '<thead><tr><th style="padding: 8px 12px;">' . esc_html__( 'Label', 'wp-quick-palette' ) . '</th>';
		echo '<th style="padding: 8px 12px;">' . esc_html__( 'Type', 'wp-quick-palette' ) . '</th>';
		echo '<th style="padding: 8px 12px;">' . esc_html__( 'Roles', 'wp-quick-palette' ) . '</th></tr></thead>';
		echo '<tbody>';

		foreach ( $searches as $search ) {
			echo '<tr>';
			echo '<td style="padding: 8px 12px;">' . esc_html( $search['label'] ) . '</td>';
			echo '<td style="padding: 8px 12px;">';
			if ( ! empty( $search['is_builtin'] ) ) {
				echo '<span style="color: #2271b1; font-weight: 500;">' . esc_html__( 'Built-in', 'wp-quick-palette' ) . '</span>';
			} else {
				echo '<span style="color: #646970;">' . esc_html__( 'Custom', 'wp-quick-palette' ) . '</span>';
			}
			echo '</td>';
			echo '<td style="padding: 8px 12px;">';
			if ( ! empty( $search['roles'] ) ) {
				echo esc_html( implode( ', ', $search['roles'] ) );
			} else {
				echo '<em>' . esc_html__( 'All roles', 'wp-quick-palette' ) . '</em>';
			}
			echo '</td>';
			echo '</tr>';
		}

		echo '</tbody></table>';
		echo '</div>';

		echo '<p class="description">';
		esc_html_e( 'Built-in saved searches appear in the palette when you open it with no query. Click any saved search to instantly filter results.', 'wp-quick-palette' );
		echo '</p>';

		// Future: Add UI for creating custom saved searches
		if ( current_user_can( 'manage_options' ) ) {
			echo '<p style="margin-top: 10px;">';
			echo '<span style="color: #646970; font-style: italic;">';
			esc_html_e( 'Custom saved search creation coming in a future update.', 'wp-quick-palette' );
			echo '</span>';
			echo '</p>';
		}
	}
}
