/**
 * WP Quick Palette - Preferences Module
 * Handles theme and density preference management.
 *
 * @package WPQP
 */

( function( WPQP ) {
	'use strict';

	if ( ! WPQP || WPQP._disabled ) {
		return;
	}

	// =========================================================================
	// Preferences Dropdown
	// =========================================================================

	/**
	 * Toggle preferences dropdown.
	 */
	WPQP.togglePrefsDropdown = function() {
		if ( WPQP.state.prefsDropdownOpen ) {
			WPQP.closePrefsDropdown();
		} else {
			WPQP.openPrefsDropdown();
		}
	};

	/**
	 * Open preferences dropdown.
	 */
	WPQP.openPrefsDropdown = function() {
		WPQP.state.prefsDropdownOpen = true;
		WPQP.state.elements.prefsDropdown.style.display = 'block';
	};

	/**
	 * Close preferences dropdown.
	 */
	WPQP.closePrefsDropdown = function() {
		WPQP.state.prefsDropdownOpen = false;
		if ( WPQP.state.elements.prefsDropdown ) {
			WPQP.state.elements.prefsDropdown.style.display = 'none';
		}
	};

	// =========================================================================
	// Theme & Density Changes
	// =========================================================================

	/**
	 * Change theme preference.
	 */
	WPQP.changeTheme = function( theme ) {
		wpqpData.theme = theme;
		WPQP.state.elements.root.setAttribute( 'data-theme', theme );

		if ( theme === 'auto' ) {
			WPQP.updateAutoTheme();
		}

		// Update active state in dropdown
		var options = WPQP.state.elements.prefsDropdown.querySelectorAll( '[data-theme]' );
		options.forEach( function( opt ) {
			if ( opt.getAttribute( 'data-theme' ) === theme ) {
				opt.classList.add( 'wpqp-prefs-option--active' );
			} else {
				opt.classList.remove( 'wpqp-prefs-option--active' );
			}
		} );

		WPQP.savePreference( 'theme', theme );
		WPQP.closePrefsDropdown();
	};

	/**
	 * Change density preference.
	 */
	WPQP.changeDensity = function( density ) {
		wpqpData.density = density;
		WPQP.state.elements.root.setAttribute( 'data-density', density );

		// Update active state in dropdown
		var options = WPQP.state.elements.prefsDropdown.querySelectorAll( '[data-density]' );
		options.forEach( function( opt ) {
			if ( opt.getAttribute( 'data-density' ) === density ) {
				opt.classList.add( 'wpqp-prefs-option--active' );
			} else {
				opt.classList.remove( 'wpqp-prefs-option--active' );
			}
		} );

		WPQP.savePreference( 'density', density );
		WPQP.closePrefsDropdown();
	};

	/**
	 * Save preference via AJAX.
	 */
	WPQP.savePreference = function( key, value ) {
		var formData = new FormData();
		formData.append( 'action', 'wpqp_save_preferences' );
		formData.append( '_ajax_nonce', wpqpData.nonce );
		formData.append( key, value );

		fetch( wpqpData.ajaxUrl, {
			method:      'POST',
			body:        formData,
			credentials: 'same-origin'
		} ).catch( function( err ) {
			console.error( 'WPQP save preference error:', err );
		} );
	};

	// =========================================================================
	// Theme Application
	// =========================================================================

	/**
	 * Apply theme and density data attributes.
	 */
	WPQP.applyThemeAndDensity = function() {
		var root = WPQP.state.elements.root;
		if ( ! root ) {
			return;
		}

		var theme   = wpqpData.theme   || 'auto';
		var density = wpqpData.density || 'normal';

		root.setAttribute( 'data-theme', theme );
		root.setAttribute( 'data-density', density );

		if ( theme === 'auto' ) {
			WPQP.updateAutoTheme();
		}
	};

	/**
	 * Update auto theme based on system preference.
	 */
	WPQP.updateAutoTheme = function() {
		var root = WPQP.state.elements.root;
		if ( ! root ) {
			return;
		}

		var prefersDark = window.matchMedia && window.matchMedia( '(prefers-color-scheme: dark)' ).matches;
		root.setAttribute( 'data-resolved-theme', prefersDark ? 'dark' : 'light' );
	};

	/**
	 * Listen for system theme changes.
	 */
	WPQP.setupThemeListener = function() {
		if ( ! window.matchMedia ) {
			return;
		}

		var mediaQuery = window.matchMedia( '(prefers-color-scheme: dark)' );

		// Always register the listener; check active theme inside handler
		// so it works even if the user switches to 'auto' mid-session.
		var handler = function() {
			var root = document.getElementById( 'wpqp-palette-root' );
			if ( root && root.getAttribute( 'data-theme' ) === 'auto' ) {
				WPQP.updateAutoTheme();
			}
		};

		// Modern browsers
		if ( mediaQuery.addEventListener ) {
			mediaQuery.addEventListener( 'change', handler );
		}
		// Legacy browsers
		else if ( mediaQuery.addListener ) {
			mediaQuery.addListener( handler );
		}
	};

} )( window.WPQP );
