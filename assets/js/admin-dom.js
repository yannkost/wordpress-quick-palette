/**
 * WP Quick Palette - DOM Module
 * Builds the palette DOM skeleton and the preferences dropdown.
 *
 * @package WPQP
 */

( function( WPQP ) {
	'use strict';

	if ( ! WPQP || WPQP._disabled ) {
		return;
	}

	/**
	 * Create the palette DOM structure.
	 * Layout: Header → Tabs → Search Bar → Results → History/Favorites panels
	 */
	WPQP.createPaletteDOM = function() {
		var root = document.getElementById( 'wpqp-palette-root' );
		if ( ! root ) {
			return;
		}

		var overlay = document.createElement( 'div' );
		overlay.className = 'wpqp-overlay';
		overlay.setAttribute( 'role', 'dialog' );
		overlay.setAttribute( 'aria-modal', 'true' );
		overlay.setAttribute( 'aria-label', wpqpData.strings.title );
		overlay.setAttribute( 'aria-hidden', 'true' );

		var backdrop = document.createElement( 'div' );
		backdrop.className = 'wpqp-backdrop';
		backdrop.addEventListener( 'click', function() {
			WPQP.closePalette();
		} );

		var panel = document.createElement( 'div' );
		panel.className = 'wpqp-panel';

		// =====================================================================
		// HEADER BAR
		// =====================================================================
		var titleBar = document.createElement( 'div' );
		titleBar.className = 'wpqp-title-bar';

		var titleLeft = document.createElement( 'div' );
		titleLeft.className = 'wpqp-title-left';

		var titleText = document.createElement( 'span' );
		titleText.className = 'wpqp-title-text';
		titleText.textContent = wpqpData.strings.title;

		titleLeft.appendChild( titleText );

		// Site selector dropdown (placeholder for multisite)
		var siteSelector = document.createElement( 'select' );
		siteSelector.className = 'wpqp-site-selector';
		siteSelector.style.display = 'none';
		var defaultOption = document.createElement( 'option' );
		defaultOption.value = 'default';
		defaultOption.textContent = wpqpData.strings.siteDefault;
		siteSelector.appendChild( defaultOption );
		titleLeft.appendChild( siteSelector );

		var titleRight = document.createElement( 'div' );
		titleRight.className = 'wpqp-title-right';

		// Shortcut badge
		var shortcutBadge = document.createElement( 'span' );
		shortcutBadge.className = 'wpqp-shortcut-badge';
		var sc = wpqpData.shortcut || 'ctrl+g';
		shortcutBadge.textContent = WPQP.isMac()
			? sc.replace( 'ctrl', 'Cmd' ).replace( /\+/g, '+' )
			: sc.replace( 'ctrl', 'Ctrl' ).replace( /\+/g, '+' );

		// Preferences button (gear icon)
		var prefsBtn = document.createElement( 'button' );
		prefsBtn.className = 'wpqp-prefs-btn';
		prefsBtn.setAttribute( 'aria-label', wpqpData.strings.preferences || 'Preferences' );
		prefsBtn.setAttribute( 'aria-expanded', 'false' );
		prefsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
		prefsBtn.addEventListener( 'click', function( e ) {
			e.stopPropagation();
			WPQP.togglePrefsDropdown();
		} );

		// Close button (X)
		var closeBtn = document.createElement( 'button' );
		closeBtn.className = 'wpqp-close-btn';
		closeBtn.setAttribute( 'aria-label', wpqpData.strings.close );
		closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
		closeBtn.addEventListener( 'click', function() {
			WPQP.closePalette();
		} );

		titleRight.appendChild( shortcutBadge );
		titleRight.appendChild( prefsBtn );
		titleRight.appendChild( closeBtn );
		titleBar.appendChild( titleLeft );
		titleBar.appendChild( titleRight );

		// =====================================================================
		// SEARCH TYPE TABS (Pro only)
		// =====================================================================
		var searchTabs = document.createElement( 'div' );
		searchTabs.className = 'wpqp-search-tabs';
		searchTabs.id = 'wpqp-search-tabs';
		searchTabs.style.display = 'none';

		var tabs      = [ 'content', 'users', 'admin' ];
		var tabLabels = {
			'content': wpqpData.strings.tabContent,
			'users':   wpqpData.strings.tabUsers,
			'admin':   wpqpData.strings.tabAdmin
		};

		tabs.forEach( function( tab ) {
			var tabBtn = document.createElement( 'button' );
			tabBtn.className = 'wpqp-search-tab';
			tabBtn.setAttribute( 'data-search-type', tab );
			tabBtn.textContent = tabLabels[ tab ];

			// Pro badge for Users and Admin tabs in Lite mode
			if ( ! wpqpData.isPro && ( tab === 'users' || tab === 'admin' ) ) {
				var proBadge = document.createElement( 'span' );
				proBadge.className = 'wpqp-pro-badge';
				proBadge.textContent = wpqpData.strings.proBadge;
				tabBtn.appendChild( proBadge );
				tabBtn.disabled = true;
			}

			tabBtn.addEventListener( 'click', function() {
				if ( wpqpData.isPro || tab === 'content' ) {
					WPQP.switchSearchType( tab );
				}
			} );
			searchTabs.appendChild( tabBtn );
		} );

		// =====================================================================
		// SEARCH INPUT BAR
		// =====================================================================
		var inputWrap = document.createElement( 'div' );
		inputWrap.className = 'wpqp-input-wrap';

		var input = document.createElement( 'input' );
		input.type = 'text';
		input.className = 'wpqp-input';
		input.placeholder = wpqpData.strings.searchPlaceholder;
		input.setAttribute( 'aria-label', wpqpData.strings.searchAriaLabel );
		input.setAttribute( 'role', 'combobox' );
		input.setAttribute( 'aria-autocomplete', 'list' );
		input.setAttribute( 'aria-expanded', 'false' );
		input.setAttribute( 'aria-owns', 'wpqp-results-listbox' );
		input.setAttribute( 'aria-haspopup', 'listbox' );
		input.setAttribute( 'aria-activedescendant', '' );
		input.addEventListener( 'input', WPQP.handleInput );
		input.addEventListener( 'keydown', WPQP.handleKeyboardNav );

		var inputActions = document.createElement( 'div' );
		inputActions.className = 'wpqp-input-actions';

		// Search button
		var searchBtn = document.createElement( 'button' );
		searchBtn.className = 'wpqp-search-btn';
		searchBtn.setAttribute( 'aria-label', wpqpData.strings.searchAriaLabel );
		searchBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
		searchBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			if ( WPQP.state.searchTerm.length > 0 ) {
				WPQP.performSearch( WPQP.state.searchTerm, WPQP.state.activeSearchType );
			}
		} );

		// Save search button (Pro only, shown when query is non-empty)
		var saveSearchBtn = document.createElement( 'button' );
		saveSearchBtn.className = 'wpqp-save-search-btn';
		saveSearchBtn.setAttribute( 'aria-label', wpqpData.strings.saveSearch );
		saveSearchBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
		saveSearchBtn.style.display = 'none';
		saveSearchBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			WPQP.showSaveSearchDialog();
		} );

		// Saved searches dropdown button (Pro only)
		var savedSearchesWrap = document.createElement( 'div' );
		savedSearchesWrap.className = 'wpqp-saved-searches-wrap';
		savedSearchesWrap.style.display = wpqpData.isPro ? 'flex' : 'none';

		var savedSearchesBtn = document.createElement( 'button' );
		savedSearchesBtn.className = 'wpqp-saved-searches-btn';
		savedSearchesBtn.setAttribute( 'aria-label', wpqpData.strings.savedSearches );
		savedSearchesBtn.setAttribute( 'aria-expanded', 'false' );
		savedSearchesBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
		savedSearchesBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			e.stopPropagation();
			WPQP.toggleSavedSearchesDropdown();
		} );

		var savedSearchesDropdown = document.createElement( 'div' );
		savedSearchesDropdown.className = 'wpqp-saved-searches-dropdown';
		savedSearchesDropdown.style.display = 'none';

		savedSearchesWrap.appendChild( savedSearchesBtn );
		savedSearchesWrap.appendChild( savedSearchesDropdown );

		// Enter hint
		var enterHint = document.createElement( 'span' );
		enterHint.className = 'wpqp-enter-hint';
		enterHint.textContent = wpqpData.strings.enterHint;

		inputActions.appendChild( searchBtn );
		inputActions.appendChild( saveSearchBtn );
		inputActions.appendChild( savedSearchesWrap );
		inputActions.appendChild( enterHint );

		inputWrap.appendChild( input );
		inputWrap.appendChild( inputActions );

		// =====================================================================
		// RESULTS CONTAINER
		// =====================================================================
		var results = document.createElement( 'div' );
		results.className = 'wpqp-results';
		results.setAttribute( 'role', 'listbox' );
		results.id = 'wpqp-results-listbox';
		results.style.display = 'none';

		// History panel (left column)
		var historyPanel = document.createElement( 'div' );
		historyPanel.className = 'wpqp-history-panel';
		historyPanel.id = 'wpqp-history-panel';
		historyPanel.style.display = 'none';

		// Favorites panel (right column)
		var favoritesPanel = document.createElement( 'div' );
		favoritesPanel.className = 'wpqp-favorites-panel';
		favoritesPanel.id = 'wpqp-favorites-panel';
		favoritesPanel.style.display = 'none';

		// Container for panels side by side
		var panelsContainer = document.createElement( 'div' );
		panelsContainer.className = 'wpqp-panels-container';
		panelsContainer.appendChild( historyPanel );
		panelsContainer.appendChild( favoritesPanel );

		// Live region for screen readers
		var announce = document.createElement( 'div' );
		announce.className = 'wpqp-sr-only';
		announce.setAttribute( 'aria-live', 'polite' );
		announce.id = 'wpqp-sr-announce';

		// Build panel structure
		panel.appendChild( titleBar );
		panel.appendChild( searchTabs );
		panel.appendChild( inputWrap );
		panel.appendChild( results );
		panel.appendChild( panelsContainer );
		panel.appendChild( announce );

		overlay.appendChild( backdrop );
		overlay.appendChild( panel );

		root.appendChild( overlay );

		// Cache elements
		WPQP.state.elements = {
			root:                  root,
			overlay:               overlay,
			backdrop:              backdrop,
			panel:                 panel,
			input:                 input,
			results:               results,
			searchTabs:            searchTabs,
			savedSearchesBtn:      savedSearchesBtn,
			savedSearchesDropdown: savedSearchesDropdown,
			savedSearchesWrap:     savedSearchesWrap,
			historyPanel:          historyPanel,
			favoritesPanel:        favoritesPanel,
			panelsContainer:       panelsContainer,
			announce:              announce,
			saveSearchBtn:         saveSearchBtn,
			siteSelector:          siteSelector
		};

		// Create preferences dropdown
		WPQP.createPrefsDropdown();

		// Global click listener to close prefs dropdown
		document.addEventListener( 'click', function( e ) {
			if (
				WPQP.state.prefsDropdownOpen &&
				! e.target.closest( '.wpqp-prefs-btn' ) &&
				! e.target.closest( '.wpqp-prefs-dropdown' )
			) {
				WPQP.closePrefsDropdown();
			}
		} );
	};

	/**
	 * Create preferences dropdown.
	 */
	WPQP.createPrefsDropdown = function() {
		var dropdown = document.createElement( 'div' );
		dropdown.className = 'wpqp-prefs-dropdown';
		dropdown.style.display = 'none';

		// Theme section
		var themeSection = document.createElement( 'div' );
		themeSection.className = 'wpqp-prefs-section';

		var themeLabel = document.createElement( 'div' );
		themeLabel.className = 'wpqp-prefs-label';
		themeLabel.textContent = wpqpData.strings.theme;

		var themeOptions = document.createElement( 'div' );
		themeOptions.className = 'wpqp-prefs-options';

		var themeLabels = {
			'light': wpqpData.strings.themeLight,
			'dark':  wpqpData.strings.themeDark,
			'auto':  wpqpData.strings.themeAuto
		};
		var themes = [ 'light', 'dark', 'auto' ];
		themes.forEach( function( themeVal ) {
			var option = document.createElement( 'button' );
			option.className = 'wpqp-prefs-option';
			option.textContent = themeLabels[ themeVal ];
			option.setAttribute( 'data-theme', themeVal );
			if ( wpqpData.theme === themeVal ) {
				option.classList.add( 'wpqp-prefs-option--active' );
			}
			option.addEventListener( 'click', function( e ) {
				e.stopPropagation();
				WPQP.changeTheme( themeVal );
			} );
			themeOptions.appendChild( option );
		} );

		themeSection.appendChild( themeLabel );
		themeSection.appendChild( themeOptions );

		// Density section
		var densitySection = document.createElement( 'div' );
		densitySection.className = 'wpqp-prefs-section';

		var densityLabel = document.createElement( 'div' );
		densityLabel.className = 'wpqp-prefs-label';
		densityLabel.textContent = wpqpData.strings.density;

		var densityOptions = document.createElement( 'div' );
		densityOptions.className = 'wpqp-prefs-options';

		var densityLabels = {
			'normal':  wpqpData.strings.densityNormal,
			'compact': wpqpData.strings.densityCompact
		};
		var densities = [ 'normal', 'compact' ];
		densities.forEach( function( densityVal ) {
			var option = document.createElement( 'button' );
			option.className = 'wpqp-prefs-option';
			option.textContent = densityLabels[ densityVal ];
			option.setAttribute( 'data-density', densityVal );
			if ( wpqpData.density === densityVal ) {
				option.classList.add( 'wpqp-prefs-option--active' );
			}
			option.addEventListener( 'click', function( e ) {
				e.stopPropagation();
				WPQP.changeDensity( densityVal );
			} );
			densityOptions.appendChild( option );
		} );

		densitySection.appendChild( densityLabel );
		densitySection.appendChild( densityOptions );

		// Only show theme options when admin hasn't enforced a theme.
		// Light/Dark in Settings = admin-enforced for all users; per-user override is disabled.
		// Auto in Settings = users control their own preference.
		if ( ! wpqpData.globalTheme || wpqpData.globalTheme === 'auto' ) {
			dropdown.appendChild( themeSection );
		}

		dropdown.appendChild( densitySection );

		// Append dropdown after the title bar (positioned via CSS)
		var titleRight = WPQP.state.elements.overlay.querySelector( '.wpqp-title-right' );
		if ( titleRight ) {
			titleRight.style.position = 'relative';
			titleRight.appendChild( dropdown );
		}

		WPQP.state.elements.prefsDropdown = dropdown;
		WPQP.state.elements.prefsBtn       = titleRight ? titleRight.querySelector( '.wpqp-prefs-btn' ) : null;
	};

} )( window.WPQP );
