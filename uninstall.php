<?php
/**
 * Uninstall script for WP Quick Palette.
 * Cleans up all plugin data when the plugin is deleted via the WordPress admin.
 *
 * @package WPQP
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// Delete global options.
delete_option( 'wp_quick_palette_options' );
delete_option( 'wp_quick_palette_saved_searches' );

// Delete all user meta keys directly from the usermeta table.
global $wpdb;

$meta_keys = array( 'wpqp_preferences', 'wpqp_favorites', 'wpqp_history' );
foreach ( $meta_keys as $meta_key ) {
	$wpdb->delete( $wpdb->usermeta, array( 'meta_key' => $meta_key ), array( '%s' ) );
}
