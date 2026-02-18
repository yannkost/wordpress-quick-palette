<?php
/**
 * Template for WP Quick Palette settings page.
 *
 * @package WPQP
 */

defined( 'ABSPATH' ) || exit;

?>

<div class="wrap">
	<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

	<form method="post" action="options.php">
		<?php
		settings_fields( 'wpqp_settings' );
		do_settings_sections( 'wp-quick-palette' );
		?>

		<!-- Pro Features Section (Lite - disabled/greyed out) -->
		<?php if ( ! ( function_exists( 'wpqp_is_pro' ) && wpqp_is_pro() ) ) : ?>
			<div class="wpqp-pro-section" style="margin-top: 30px; padding: 20px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; position: relative;">
				<h2 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
					<?php esc_html_e( 'Pro Features', 'wp-quick-palette' ); ?>
					<span style="display: inline-block; background: #2271b1; color: #fff; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
						<?php esc_html_e( 'Pro', 'wp-quick-palette' ); ?>
					</span>
				</h2>
				<p style="color: #646970; margin-bottom: 20px;">
					<?php esc_html_e( 'Unlock additional features with WP Quick Palette Pro.', 'wp-quick-palette' ); ?>
				</p>

				<table class="form-table" role="presentation" style="opacity: 0.6; pointer-events: none;">
					<tbody>
							<!-- History Limit -->
						<tr>
							<th scope="row">
								<?php esc_html_e( 'History Limit', 'wp-quick-palette' ); ?>
							</th>
							<td>
								<input type="number" disabled value="50" min="10" max="200" style="width: 80px;" />
								<p class="description">
									<?php esc_html_e( 'Number of recent items to keep in your history.', 'wp-quick-palette' ); ?>
								</p>
							</td>
						</tr>

						<!-- Favorites -->
						<tr>
							<th scope="row">
								<?php esc_html_e( 'Favorites', 'wp-quick-palette' ); ?>
							</th>
							<td>
								<p class="description" style="margin-top: 0;">
									<?php esc_html_e( 'Star/unstar items from the palette and see them at the top when opening with no query.', 'wp-quick-palette' ); ?>
								</p>
							</td>
						</tr>

						<!-- Saved Searches -->
						<tr>
							<th scope="row">
								<?php esc_html_e( 'Saved Searches', 'wp-quick-palette' ); ?>
							</th>
							<td>
								<p class="description" style="margin-top: 0;">
									<?php esc_html_e( 'Create and save custom search presets with advanced filters (e.g., "Draft posts updated last 7 days").', 'wp-quick-palette' ); ?>
								</p>
							</td>
						</tr>

						<!-- Role-Based Settings -->
						<tr>
							<th scope="row">
								<?php esc_html_e( 'Role-Based Settings', 'wp-quick-palette' ); ?>
							</th>
							<td>
								<p class="description" style="margin-top: 0;">
									<?php esc_html_e( 'Configure Quick Palette behavior per user role (enabled, searchable post types, inline bar visibility).', 'wp-quick-palette' ); ?>
								</p>
							</td>
						</tr>
					</tbody>
				</table>

				<p style="margin-top: 20px;">
					<a href="https://example.com/wp-quick-palette-pro" class="button button-primary" target="_blank" rel="noopener noreferrer">
						<?php esc_html_e( 'Upgrade to Pro', 'wp-quick-palette' ); ?>
					</a>
				</p>
			</div>
		<?php endif; ?>

		<?php submit_button(); ?>
	</form>
</div>
