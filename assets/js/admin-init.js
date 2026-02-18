/**
 * WP Quick Palette - Init Module
 * Bootstrap: calls WPQP.init() after DOM is ready.
 * This file is enqueued last and depends on all other modules.
 *
 * @package WPQP
 */

( function( WPQP ) {
	if ( typeof WPQP === 'undefined' || WPQP._disabled ) {
		return;
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', function() {
			WPQP.init();
		} );
	} else {
		WPQP.init();
	}
} )( window.WPQP );
