/**
 * WP Quick Palette - Core Module
 * Sets up the WPQP namespace, shared state, palette lifecycle,
 * keyboard shortcuts, navigation, and focus management.
 *
 * @package WPQP
 */

// Bail if wpqpData is not available.
if ( typeof wpqpData === 'undefined' ) {
	// Define a no-op namespace so other modules don't throw.
	window.WPQP = { _disabled: true };
} else {
	window.WPQP = {};

	// =========================================================================
	// Shared State
	// =========================================================================

	WPQP.state = {
		isOpen: false,
		searchTerm: '',
		results: {},
		selectedIndex: -1,
		flatItems: [],
		debounceTimer: null,
		requestId: 0,
		lastFocusedElement: null,
		elements: {},
		// Pro state
		favorites: [],
		history: [],
		savedSearches: [],
		proDataLoaded: false,
		// Preferences dropdown state
		prefsDropdownOpen: false,
		// Tab state - search type: content, users, admin
		activeSearchType: 'content',
		// Copy menu state
		openCopyMenuId: null,
		// Abort controller for search requests
		searchAbortController: null,
		// Active type filter for filter chips (set by setTypeFilter)
		activeTypeFilter: 'all'
	};

	// Item ID counter for ARIA
	WPQP.itemIdCounter = 0;

	// =========================================================================
	// Init
	// =========================================================================

	/**
	 * Initialize the palette on DOM ready.
	 * Called by admin-init.js after all modules are loaded.
	 */
	WPQP.init = function() {
		var root = document.getElementById( 'wpqp-palette-root' );
		if ( ! root ) {
			return;
		}

		WPQP.createPaletteDOM();
		WPQP.applyThemeAndDensity();
		WPQP.setupKeyboardShortcut();
		WPQP.setupGlobalAltShortcuts();
		WPQP.setupAdminBarIcon();
		WPQP.setupThemeListener();
		WPQP.setupClickOutsideToCloseCopyMenu();
	};

	// =========================================================================
	// Palette Lifecycle
	// =========================================================================

	/**
	 * Toggle palette open/close.
	 */
	WPQP.togglePalette = function() {
		if ( WPQP.state.isOpen ) {
			WPQP.closePalette();
		} else {
			WPQP.openPalette();
		}
	};

	/**
	 * Open the palette.
	 */
	WPQP.openPalette = function() {
		if ( WPQP.state.isOpen ) {
			return;
		}

		WPQP.state.isOpen = true;
		WPQP.state.lastFocusedElement = document.activeElement;

		var overlay = WPQP.state.elements.overlay;
		var input   = WPQP.state.elements.input;

		overlay.classList.add( 'wpqp-open' );
		overlay.setAttribute( 'aria-hidden', 'false' );

		// Focus input
		if ( input ) {
			input.value = '';
			input.focus();
		}

		// Clear previous results
		WPQP.state.searchTerm      = '';
		WPQP.state.results         = {};
		WPQP.state.selectedIndex   = -1;
		WPQP.state.flatItems       = [];
		WPQP.state.activeSearchType = 'content';
		WPQP.state.proDataLoaded   = false;

		// Update tab UI
		WPQP.updateSearchTabsUI();

		// Always show panels (Lite or Pro)
		WPQP.showSearchTabs( true );

		// Load data and render
		WPQP.loadPanelData( function() {
			if ( wpqpData.isPro ) {
				WPQP.renderProSections();
			} else {
				WPQP.renderPanels();
			}
		} );

		// Trap focus
		document.addEventListener( 'keydown', WPQP.trapFocus );
	};

	/**
	 * Close the palette.
	 */
	WPQP.closePalette = function() {
		if ( ! WPQP.state.isOpen ) {
			return;
		}

		WPQP.state.isOpen = false;

		// Abort any pending search so stale results don't render after close.
		if ( WPQP.state.searchAbortController ) {
			WPQP.state.searchAbortController.abort();
			WPQP.state.searchAbortController = null;
		}

		var overlay = WPQP.state.elements.overlay;

		overlay.classList.remove( 'wpqp-open' );
		overlay.setAttribute( 'aria-hidden', 'true' );

		// Reset ARIA attributes
		WPQP.state.elements.input.setAttribute( 'aria-expanded', 'false' );
		WPQP.state.elements.input.setAttribute( 'aria-activedescendant', '' );

		// Close preferences dropdown if open
		WPQP.closePrefsDropdown();

		// Close saved searches dropdown
		WPQP.closeSavedSearchesDropdown();

		// Close any open copy menus
		WPQP.closeAllCopyMenus();

		// Restore focus
		if ( WPQP.state.lastFocusedElement && WPQP.state.lastFocusedElement.focus ) {
			WPQP.state.lastFocusedElement.focus();
		}

		// Remove focus trap
		document.removeEventListener( 'keydown', WPQP.trapFocus );
	};

	/**
	 * Trap focus within the palette.
	 */
	WPQP.trapFocus = function( e ) {
		if ( e.key !== 'Tab' ) {
			// Close prefs dropdown on Escape
			if ( e.key === 'Escape' && WPQP.state.prefsDropdownOpen ) {
				e.preventDefault();
				WPQP.closePrefsDropdown();
				return;
			}
			// Close copy menu on Escape
			if ( e.key === 'Escape' && WPQP.state.openCopyMenuId ) {
				e.preventDefault();
				WPQP.closeAllCopyMenus();
				return;
			}
			return;
		}

		var panel = WPQP.state.elements.panel;
		if ( ! panel ) {
			return;
		}

		var focusableElements = panel.querySelectorAll(
			'input, button, a[href], [tabindex]:not([tabindex="-1"])'
		);

		if ( focusableElements.length === 0 ) {
			return;
		}

		var firstElement = focusableElements[ 0 ];
		var lastElement  = focusableElements[ focusableElements.length - 1 ];

		if ( e.shiftKey ) {
			if ( document.activeElement === firstElement ) {
				e.preventDefault();
				lastElement.focus();
			}
		} else {
			if ( document.activeElement === lastElement ) {
				e.preventDefault();
				firstElement.focus();
			}
		}
	};

	// =========================================================================
	// Keyboard Shortcuts
	// =========================================================================

	/**
	 * Set up keyboard shortcut listener.
	 */
	WPQP.setupKeyboardShortcut = function() {
		var shortcut = WPQP.parseShortcut( wpqpData.shortcut || 'ctrl+g' );

		document.addEventListener( 'keydown', function( e ) {
			var key      = e.key.toLowerCase();
			var ctrl     = e.ctrlKey;
			var meta     = e.metaKey;
			var shift    = e.shiftKey;
			var modifierPressed = WPQP.isMac() ? meta : ctrl;

			// Match shortcut pattern
			if ( key === shortcut.key && modifierPressed === shortcut.ctrl && shift === shortcut.shift ) {
				e.preventDefault();
				WPQP.togglePalette();
			}

			// Alt+1 through Alt+9 for favorites — when palette is OPEN
			if ( WPQP.state.isOpen && key >= '1' && key <= '9' && e.altKey ) {
				e.preventDefault();
				WPQP.activateFavoriteByIndex( parseInt( key, 10 ) - 1 );
			}
		} );
	};

	/**
	 * Set up global Alt+1–9 shortcuts when palette is CLOSED.
	 */
	WPQP.setupGlobalAltShortcuts = function() {
		document.addEventListener( 'keydown', function( e ) {
			// Only handle when palette is NOT open
			if ( WPQP.state.isOpen ) {
				return;
			}

			var key = e.key.toLowerCase();

			if ( key >= '1' && key <= '9' && e.altKey ) {
				e.preventDefault();
				WPQP.activateFavoriteByIndexGlobal( parseInt( key, 10 ) - 1 );
			}
		} );
	};

	/**
	 * Activate a favorite by index when palette is CLOSED.
	 */
	WPQP.activateFavoriteByIndexGlobal = function( index ) {
		if ( WPQP.state.favorites.length === 0 ) {
			return;
		}

		var fav = WPQP.state.favorites[ index ];
		if ( fav && ( fav.edit_url || fav.url ) ) {
			window.location.href = fav.edit_url || fav.url;
		}
	};

	/**
	 * Activate a favorite by index (Alt+1 through Alt+9) when palette is open.
	 */
	WPQP.activateFavoriteByIndex = function( index ) {
		if ( ! wpqpData.isPro || WPQP.state.favorites.length === 0 ) {
			return;
		}

		var fav = WPQP.state.favorites[ index ];
		if ( fav && ( fav.edit_url || fav.url ) ) {
			window.location.href = fav.edit_url || fav.url;
		}
	};

	/**
	 * Set up admin bar icon click listener.
	 */
	WPQP.setupAdminBarIcon = function() {
		var icon = document.querySelector( '#wp-admin-bar-wpqp-admin-bar-icon a' );
		if ( icon ) {
			icon.addEventListener( 'click', function( e ) {
				e.preventDefault();
				WPQP.openPalette();
			} );
		}
	};

	/**
	 * Parse shortcut string into components.
	 */
	WPQP.parseShortcut = function( shortcut ) {
		var parts = shortcut.toLowerCase().split( '+' );
		return {
			ctrl:  parts.indexOf( 'ctrl' ) !== -1,
			shift: parts.indexOf( 'shift' ) !== -1,
			key:   parts[ parts.length - 1 ] // Last part is the key
		};
	};

	/**
	 * Detect macOS.
	 */
	WPQP.isMac = function() {
		if ( navigator.userAgentData && navigator.userAgentData.platform ) {
			return navigator.userAgentData.platform.toLowerCase().indexOf( 'mac' ) !== -1;
		}
		return navigator.platform.toLowerCase().indexOf( 'mac' ) !== -1;
	};

	// =========================================================================
	// Item Selection & Navigation
	// =========================================================================

	/**
	 * Open item in new tab.
	 */
	WPQP.openInNewTab = function( item ) {
		if ( ! item || ! ( item.edit_url || item.url ) ) {
			return;
		}
		window.open( item.edit_url || item.url, '_blank' );
	};

	/**
	 * Navigate to an item.
	 */
	WPQP.navigateToItem = function( item ) {
		if ( ! item || ! ( item.edit_url || item.url ) ) {
			return;
		}

		// Record history (Pro or Lite)
		WPQP.recordHistory( item );

		// Navigate to edit URL
		window.location.href = item.edit_url || item.url;
	};

	/**
	 * Select an item by index.
	 */
	WPQP.selectItem = function( index ) {
		var allItems = WPQP.state.elements.results.querySelectorAll( '.wpqp-item' );

		allItems.forEach( function( item, i ) {
			if ( i === index ) {
				item.classList.add( 'wpqp-item--selected' );
				item.setAttribute( 'aria-selected', 'true' );
			} else {
				item.classList.remove( 'wpqp-item--selected' );
				item.setAttribute( 'aria-selected', 'false' );
			}
		} );

		WPQP.state.selectedIndex = index;

		// Update aria-activedescendant
		WPQP.state.elements.input.setAttribute(
			'aria-activedescendant',
			allItems[ index ] ? allItems[ index ].id : ''
		);
	};

	/**
	 * Scroll item into view.
	 */
	WPQP.scrollItemIntoView = function( element ) {
		if ( ! element ) {
			return;
		}

		if ( element.scrollIntoView ) {
			element.scrollIntoView( {
				behavior: 'smooth',
				block: 'nearest'
			} );
		}
	};

	/**
	 * Handle keyboard navigation within the search input.
	 */
	WPQP.handleKeyboardNav = function( e ) {
		var key = e.key;

		// Escape closes palette (or prefs / copy menu if open)
		if ( key === 'Escape' ) {
			e.preventDefault();
			if ( WPQP.state.prefsDropdownOpen ) {
				WPQP.closePrefsDropdown();
			} else if ( WPQP.state.openCopyMenuId ) {
				WPQP.closeAllCopyMenus();
			} else {
				WPQP.closePalette();
			}
			return;
		}

		// Arrow navigation
		if ( key === 'ArrowDown' || key === 'ArrowUp' ) {
			e.preventDefault();

			var allItems = Array.prototype.filter.call(
				WPQP.state.elements.results.querySelectorAll( '.wpqp-item' ),
				function( el ) { return el.offsetParent !== null; }
			);
			if ( allItems.length === 0 ) {
				return;
			}

			if ( key === 'ArrowDown' ) {
				WPQP.state.selectedIndex = ( WPQP.state.selectedIndex + 1 ) % allItems.length;
			} else {
				WPQP.state.selectedIndex = WPQP.state.selectedIndex <= 0 ? allItems.length - 1 : WPQP.state.selectedIndex - 1;
			}

			WPQP.selectItem( WPQP.state.selectedIndex );
			WPQP.scrollItemIntoView( allItems[ WPQP.state.selectedIndex ] );
		}

		// Enter activates selected item
		if ( key === 'Enter' ) {
			e.preventDefault();

			// Ctrl/Cmd+Enter opens in new tab
			if ( e.ctrlKey || e.metaKey ) {
				var allItemsNew = Array.prototype.filter.call(
					WPQP.state.elements.results.querySelectorAll( '.wpqp-item' ),
					function( el ) { return el.offsetParent !== null; }
				);
				if ( WPQP.state.selectedIndex >= 0 && WPQP.state.selectedIndex < allItemsNew.length ) {
					var selectedNew = allItemsNew[ WPQP.state.selectedIndex ];
					if ( selectedNew && selectedNew._wpqpItem ) {
						WPQP.openInNewTab( selectedNew._wpqpItem );
					}
				}
				return;
			}

			var allItemsEnter = Array.prototype.filter.call(
				WPQP.state.elements.results.querySelectorAll( '.wpqp-item' ),
				function( el ) { return el.offsetParent !== null; }
			);
			if ( WPQP.state.selectedIndex >= 0 && WPQP.state.selectedIndex < allItemsEnter.length ) {
				var selectedEnter = allItemsEnter[ WPQP.state.selectedIndex ];
				if ( selectedEnter && selectedEnter._wpqpItem ) {
					WPQP.navigateToItem( selectedEnter._wpqpItem );
				}
			}
		}
	};
}
