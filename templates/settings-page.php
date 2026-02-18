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

	<?php if ( function_exists( 'wpqp_is_pro' ) && wpqp_is_pro() ) : ?>
		<hr style="margin: 30px 0 24px;" />

		<div class="wpqp-import-export-section">
			<h2 style="margin-top: 0;"><?php esc_html_e( 'Import / Export', 'wp-quick-palette' ); ?></h2>
			<p class="description" style="margin-bottom: 20px; max-width: 600px;">
				<?php esc_html_e( 'Export your favorites and saved searches as a JSON file, then import them on another site or after a fresh install.', 'wp-quick-palette' ); ?>
			</p>

			<div id="wpqp-ie-notices" style="margin-bottom: 12px;"></div>

			<!-- Export -->
			<h3 style="margin-top: 0;"><?php esc_html_e( 'Export', 'wp-quick-palette' ); ?></h3>
			<p>
				<button
					type="button"
					id="wpqp-export-btn"
					class="button button-secondary"
				>
					<?php esc_html_e( 'Download Export File', 'wp-quick-palette' ); ?>
				</button>
			</p>
			<p class="description">
				<?php esc_html_e( 'Exports your personal favorites. Administrators also export all custom saved searches.', 'wp-quick-palette' ); ?>
			</p>

			<!-- Import -->
			<h3 style="margin-top: 24px;"><?php esc_html_e( 'Import', 'wp-quick-palette' ); ?></h3>
			<form id="wpqp-import-form">
				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row">
								<label for="wpqp-import-file">
									<?php esc_html_e( 'JSON File', 'wp-quick-palette' ); ?>
								</label>
							</th>
							<td>
								<input type="file" id="wpqp-import-file" accept=".json,application/json" />
								<p class="description">
									<?php esc_html_e( 'Or paste JSON directly in the field below.', 'wp-quick-palette' ); ?>
								</p>
							</td>
						</tr>
						<tr>
							<th scope="row">
								<label for="wpqp-import-json">
									<?php esc_html_e( 'JSON Data', 'wp-quick-palette' ); ?>
								</label>
							</th>
							<td>
								<textarea
									id="wpqp-import-json"
									rows="6"
									style="width:100%;max-width:600px;font-family:monospace;font-size:12px;"
									placeholder="<?php esc_attr_e( 'Paste exported JSON here…', 'wp-quick-palette' ); ?>"
								></textarea>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php esc_html_e( 'Import Mode', 'wp-quick-palette' ); ?></th>
							<td>
								<fieldset>
									<label>
										<input type="radio" name="wpqp_import_mode" value="merge" checked />
										<?php esc_html_e( 'Merge — add new items, keep existing ones', 'wp-quick-palette' ); ?>
									</label>
									<br />
									<label>
										<input type="radio" name="wpqp_import_mode" value="replace" />
										<?php esc_html_e( 'Replace — overwrite all existing favorites and saved searches', 'wp-quick-palette' ); ?>
									</label>
								</fieldset>
							</td>
						</tr>
					</tbody>
				</table>
				<p>
					<button
						type="submit"
						id="wpqp-import-btn"
						class="button button-primary"
					>
						<?php esc_html_e( 'Import', 'wp-quick-palette' ); ?>
					</button>
				</p>
			</form>
		</div>
	<?php endif; ?>
</div>
