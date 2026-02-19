/**
 * WP Quick Palette - Copy Module
 * Handles copy-to-clipboard and copy menu UI.
 *
 * @package WPQP
 */

( function( WPQP ) {
	'use strict';

	if ( ! WPQP || WPQP._disabled ) {
		return;
	}

	// =========================================================================
	// Copy Menu
	// =========================================================================

	/**
	 * Toggle copy menu for an item.
	 */
	WPQP.toggleCopyMenu = function( btn, item ) {
		var menuId = 'copy-menu-' + item.id;

		// Close any existing open menu that isn't this one
		if ( WPQP.state.openCopyMenuId && WPQP.state.openCopyMenuId !== menuId ) {
			WPQP.closeAllCopyMenus();
		}

		var existingMenu = document.getElementById( menuId );
		if ( existingMenu ) {
			existingMenu.remove();
			WPQP.state.openCopyMenuId = null;
			btn.setAttribute( 'aria-expanded', 'false' );
			return;
		}

		// Create new menu
		var menu = document.createElement( 'div' );
		menu.className = 'wpqp-copy-menu';
		menu.id = menuId;

		// Copy URL option
		var urlOption = document.createElement( 'button' );
		urlOption.className = 'wpqp-copy-option';
		urlOption.textContent = wpqpData.strings.copyUrl;
		urlOption.addEventListener( 'click', function( e ) {
			e.stopPropagation();
			WPQP.copyToClipboard( item.edit_url || item.url || '' );
			WPQP.showCopyFeedback( btn, wpqpData.strings.copiedUrl );
			menu.remove();
			WPQP.state.openCopyMenuId = null;
		} );

		// Copy Title option
		var titleOption = document.createElement( 'button' );
		titleOption.className = 'wpqp-copy-option';
		titleOption.textContent = wpqpData.strings.copyTitle;
		titleOption.addEventListener( 'click', function( e ) {
			e.stopPropagation();
			WPQP.copyToClipboard( item.title || '' );
			WPQP.showCopyFeedback( btn, wpqpData.strings.copiedTitle );
			menu.remove();
			WPQP.state.openCopyMenuId = null;
		} );

		// Copy ID option
		var idOption = document.createElement( 'button' );
		idOption.className = 'wpqp-copy-option';
		idOption.textContent = wpqpData.strings.copyId;
		idOption.addEventListener( 'click', function( e ) {
			e.stopPropagation();
			WPQP.copyToClipboard( String( item.id || '' ) );
			WPQP.showCopyFeedback( btn, wpqpData.strings.copiedId );
			menu.remove();
			WPQP.state.openCopyMenuId = null;
		} );

		menu.appendChild( urlOption );
		menu.appendChild( titleOption );
		menu.appendChild( idOption );

		// Propagate the palette's resolved theme so dark mode CSS vars apply.
		// The menu is body-level and can't inherit from #wpqp-palette-root.
		var paletteRoot = document.getElementById( 'wpqp-palette-root' );
		if ( paletteRoot ) {
			var resolvedTheme = paletteRoot.getAttribute( 'data-resolved-theme' );
			if ( ! resolvedTheme ) {
				// Not 'auto' mode — use the explicit theme directly.
				resolvedTheme = paletteRoot.getAttribute( 'data-theme' ) || 'light';
			}
			menu.setAttribute( 'data-resolved-theme', resolvedTheme );
		}

		// Append menu to body for proper fixed positioning
		document.body.appendChild( menu );

		// Position menu relative to the button
		var btnRect = btn.getBoundingClientRect();
		menu.style.position   = 'fixed';
		menu.style.zIndex     = '999999';
		menu.style.left       = btnRect.left + 'px';
		menu.style.top        = ( btnRect.bottom + 4 ) + 'px';
		menu.style.display    = 'block';
		menu.style.visibility = 'visible';
		menu.style.opacity    = '1';

		WPQP.state.openCopyMenuId = menuId;
		btn.setAttribute( 'aria-expanded', 'true' );
	};

	/**
	 * Show feedback after copying.
	 */
	WPQP.showCopyFeedback = function( btn, message ) {
		var feedback = document.createElement( 'span' );
		feedback.className = 'wpqp-copy-feedback';
		feedback.textContent = message;
		btn.parentElement.appendChild( feedback );

		setTimeout( function() {
			feedback.remove();
		}, 1500 );
	};

	// =========================================================================
	// Clipboard
	// =========================================================================

	/**
	 * Copy text to clipboard.
	 */
	WPQP.copyToClipboard = function( text ) {
		if ( navigator.clipboard && navigator.clipboard.writeText ) {
			navigator.clipboard.writeText( text ).catch( function( err ) {
				console.error( 'WPQP: Failed to copy to clipboard', err );
				WPQP.fallbackCopyToClipboard( text );
			} );
		} else {
			WPQP.fallbackCopyToClipboard( text );
		}
	};

	/**
	 * Fallback copy method for older browsers.
	 */
	WPQP.fallbackCopyToClipboard = function( text ) {
		var textarea = document.createElement( 'textarea' );
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.left     = '-9999px';
		document.body.appendChild( textarea );
		textarea.select();

		try {
			document.execCommand( 'copy' );
		} catch ( err ) {
			console.error( 'WPQP: Fallback copy failed', err );
		}

		document.body.removeChild( textarea );
	};

	/**
	 * Close all open copy menus.
	 */
	WPQP.closeAllCopyMenus = function() {
		var menus = document.querySelectorAll( '.wpqp-copy-menu' );
		menus.forEach( function( menu ) {
			menu.remove();
		} );

		var copyBtns = document.querySelectorAll( '.wpqp-copy-btn[aria-expanded="true"]' );
		copyBtns.forEach( function( btn ) {
			btn.setAttribute( 'aria-expanded', 'false' );
		} );

		WPQP.state.openCopyMenuId = null;
	};

	/**
	 * Set up click outside to close copy menus and saved searches dropdown.
	 */
	WPQP.setupClickOutsideToCloseCopyMenu = function() {
		document.addEventListener( 'click', function( e ) {
			if (
				WPQP.state.openCopyMenuId &&
				! e.target.closest( '.wpqp-copy-menu' ) &&
				! e.target.closest( '.wpqp-copy-btn' )
			) {
				WPQP.closeAllCopyMenus();
			}
			// Close saved searches dropdown when clicking outside
			if (
				WPQP.state.elements.savedSearchesDropdown &&
				WPQP.state.elements.savedSearchesDropdown.style.display !== 'none'
			) {
				if ( ! e.target.closest( '.wpqp-saved-searches-wrap' ) ) {
					WPQP.closeSavedSearchesDropdown();
				}
			}
		} );
	};

} )( window.WPQP );
