/**
 * WP Quick Palette - Admin JavaScript
 * Vanilla JS IIFE, no dependencies, no build tools required.
 *
 * @package WPQP
 */

(function() {
	'use strict';

	// Bail if wpqpData is not available
	if ( typeof wpqpData === 'undefined' ) {
		return;
	}

	// State
	var state = {
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
		openCopyMenuId: null
	};

	// Item ID counter for ARIA
	var itemIdCounter = 0;

	/**
	 * Initialize the palette on DOM ready.
	 */
	function init() {
		var root = document.getElementById('wpqp-palette-root');
		if ( ! root ) {
			return;
		}

		createPaletteDOM();
		applyThemeAndDensity();
		setupKeyboardShortcut();
		setupGlobalAltShortcuts();
		setupAdminBarIcon();
		setupThemeListener();
		setupClickOutsideToCloseCopyMenu();

		// Initialize inline search if enabled
		if ( wpqpData.inlineSearchEnabled && wpqpData.isPro ) {
			initInlineSearch();
		}
	}

	/**
	 * Create the palette DOM structure.
	 * New layout: Header → Tabs → Search Bar → Saved Searches → Results → History/Favorites (Pro)
	 */
	function createPaletteDOM() {
		var root = document.getElementById('wpqp-palette-root');
		if ( ! root ) {
			return;
		}

		var overlay = document.createElement('div');
		overlay.className = 'wpqp-overlay';
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.setAttribute('aria-label', 'Quick Access');
		overlay.setAttribute('aria-hidden', 'true');

		var backdrop = document.createElement('div');
		backdrop.className = 'wpqp-backdrop';
		backdrop.addEventListener('click', function() {
			closePalette();
		});

		var panel = document.createElement('div');
		panel.className = 'wpqp-panel';

		// ===========================================
		// HEADER BAR
		// ===========================================
		var titleBar = document.createElement('div');
		titleBar.className = 'wpqp-title-bar';

		var titleLeft = document.createElement('div');
		titleLeft.className = 'wpqp-title-left';

		var titleText = document.createElement('span');
		titleText.className = 'wpqp-title-text';
		titleText.textContent = 'Quick Access';

		titleLeft.appendChild(titleText);

		// Site selector dropdown (placeholder for multisite)
		var siteSelector = document.createElement('select');
		siteSelector.className = 'wpqp-site-selector';
		siteSelector.style.display = 'none'; // Hidden until multisite is supported
		var defaultOption = document.createElement('option');
		defaultOption.value = 'default';
		defaultOption.textContent = 'Default';
		siteSelector.appendChild(defaultOption);
		titleLeft.appendChild(siteSelector);

		var titleRight = document.createElement('div');
		titleRight.className = 'wpqp-title-right';

		// Shortcut badge
		var shortcutBadge = document.createElement('span');
		shortcutBadge.className = 'wpqp-shortcut-badge';
		var sc = wpqpData.shortcut || 'ctrl+k';
		shortcutBadge.textContent = isMac() ? sc.replace('ctrl', 'Cmd').replace(/\+/g, '+') : sc.replace('ctrl', 'Ctrl').replace(/\+/g, '+');

		// Close button (X)
		var closeBtn = document.createElement('button');
		closeBtn.className = 'wpqp-close-btn';
		closeBtn.setAttribute('aria-label', 'Close');
		closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
		closeBtn.addEventListener('click', function() {
			closePalette();
		});

		titleRight.appendChild(shortcutBadge);
		titleRight.appendChild(closeBtn);
		titleBar.appendChild(titleLeft);
		titleBar.appendChild(titleRight);

		// ===========================================
		// SEARCH TYPE TABS (Pro only)
		// ===========================================
		var searchTabs = document.createElement('div');
		searchTabs.className = 'wpqp-search-tabs';
		searchTabs.id = 'wpqp-search-tabs';
		searchTabs.style.display = 'none'; // Hidden by default

		var tabs = ['content', 'users', 'admin'];
		var tabLabels = {
			'content': 'Content',
			'users': 'Users',
			'admin': 'Admin'
		};

		tabs.forEach(function(tab) {
			var tabBtn = document.createElement('button');
			tabBtn.className = 'wpqp-search-tab';
			tabBtn.setAttribute('data-search-type', tab);
			tabBtn.textContent = tabLabels[tab];

			// Pro badge for Users and Admin tabs in Lite mode
			if ( ! wpqpData.isPro && (tab === 'users' || tab === 'admin') ) {
				var proBadge = document.createElement('span');
				proBadge.className = 'wpqp-pro-badge';
				proBadge.textContent = 'Pro';
				tabBtn.appendChild(proBadge);
				tabBtn.disabled = true;
			}

			tabBtn.addEventListener('click', function() {
				if ( wpqpData.isPro || tab === 'content' ) {
					switchSearchType(tab);
				}
			});
			searchTabs.appendChild(tabBtn);
		});

		// ===========================================
		// SEARCH INPUT BAR
		// ===========================================
		var inputWrap = document.createElement('div');
		inputWrap.className = 'wpqp-input-wrap';

		var input = document.createElement('input');
		input.type = 'text';
		input.className = 'wpqp-input';
		input.placeholder = 'Search...';
		input.setAttribute('aria-label', 'Search');
		input.setAttribute('role', 'combobox');
		input.setAttribute('aria-autocomplete', 'list');
		input.setAttribute('aria-expanded', 'false');
		input.setAttribute('aria-owns', 'wpqp-results-listbox');
		input.setAttribute('aria-haspopup', 'listbox');
		input.setAttribute('aria-activedescendant', '');
		input.addEventListener('input', handleInput);
		input.addEventListener('keydown', handleKeyboardNav);

		var inputActions = document.createElement('div');
		inputActions.className = 'wpqp-input-actions';

		// Search button (circle icon)
		var searchBtn = document.createElement('button');
		searchBtn.className = 'wpqp-search-btn';
		searchBtn.setAttribute('aria-label', 'Search');
		searchBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
		searchBtn.addEventListener('click', function(e) {
			e.preventDefault();
			// Trigger search manually
			if ( state.searchTerm.length > 0 ) {
				performSearch(state.searchTerm, state.activeSearchType);
			}
		});

		// Save search button (star icon) - Pro only
		var saveSearchBtn = document.createElement('button');
		saveSearchBtn.className = 'wpqp-save-search-btn';
		saveSearchBtn.setAttribute('aria-label', 'Save this search');
		saveSearchBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
		saveSearchBtn.style.display = wpqpData.isPro ? 'flex' : 'none';
		saveSearchBtn.addEventListener('click', function(e) {
			e.preventDefault();
			showSaveSearchDialog();
		});

		// Enter hint
		var enterHint = document.createElement('span');
		enterHint.className = 'wpqp-enter-hint';
		enterHint.textContent = 'Enter \u21B5';

		inputActions.appendChild(searchBtn);
		inputActions.appendChild(saveSearchBtn);
		inputActions.appendChild(enterHint);

		inputWrap.appendChild(input);
		inputWrap.appendChild(inputActions);

		// ===========================================
		// RESULTS CONTAINER
		// ===========================================
		var results = document.createElement('div');
		results.className = 'wpqp-results';
		results.setAttribute('role', 'listbox');
		results.id = 'wpqp-results-listbox';
		results.style.display = 'none';

		// Saved Searches section (Pro only, shown when query empty)
		var savedSearchesSection = document.createElement('div');
		savedSearchesSection.className = 'wpqp-saved-searches-section';
		savedSearchesSection.id = 'wpqp-saved-searches-section';
		savedSearchesSection.style.display = 'none';

		// History panel (left column) - now available in Lite
		var historyPanel = document.createElement('div');
		historyPanel.className = 'wpqp-history-panel';
		historyPanel.id = 'wpqp-history-panel';
		historyPanel.style.display = 'none';

		// Favorites panel (right column) - now available in Lite
		var favoritesPanel = document.createElement('div');
		favoritesPanel.className = 'wpqp-favorites-panel';
		favoritesPanel.id = 'wpqp-favorites-panel';
		favoritesPanel.style.display = 'none';

		// Container for panels side by side
		var panelsContainer = document.createElement('div');
		panelsContainer.className = 'wpqp-panels-container';
		panelsContainer.appendChild(historyPanel);
		panelsContainer.appendChild(favoritesPanel);

		// Live region for screen readers
		var announce = document.createElement('div');
		announce.className = 'wpqp-sr-only';
		announce.setAttribute('aria-live', 'polite');
		announce.id = 'wpqp-sr-announce';

		// Build panel structure
		panel.appendChild(titleBar);
		panel.appendChild(searchTabs);
		panel.appendChild(inputWrap);
		panel.appendChild(results);
		panel.appendChild(panelsContainer);
		panel.appendChild(announce);

		overlay.appendChild(backdrop);
		overlay.appendChild(panel);

		root.appendChild(overlay);

		// Cache elements
		state.elements = {
			root: root,
			overlay: overlay,
			backdrop: backdrop,
			panel: panel,
			input: input,
			results: results,
			searchTabs: searchTabs,
			savedSearchesSection: savedSearchesSection,
			historyPanel: historyPanel,
			favoritesPanel: favoritesPanel,
			panelsContainer: panelsContainer,
			announce: announce,
			saveSearchBtn: saveSearchBtn,
			siteSelector: siteSelector
		};

		// Create preferences dropdown
		createPrefsDropdown();

		// Global click listener to close dropdown
		document.addEventListener('click', function(e) {
			if ( state.prefsDropdownOpen && ! e.target.closest('.wpqp-prefs-btn') && ! e.target.closest('.wpqp-prefs-dropdown') ) {
				closePrefsDropdown();
			}
		});
	}

	/**
	 * Create preferences dropdown.
	 */
	function createPrefsDropdown() {
		var dropdown = document.createElement('div');
		dropdown.className = 'wpqp-prefs-dropdown';
		dropdown.style.display = 'none';

		// Theme section
		var themeSection = document.createElement('div');
		themeSection.className = 'wpqp-prefs-section';

		var themeLabel = document.createElement('div');
		themeLabel.className = 'wpqp-prefs-label';
		themeLabel.textContent = 'Theme';

		var themeOptions = document.createElement('div');
		themeOptions.className = 'wpqp-prefs-options';

		var themes = ['light', 'dark', 'auto'];
		themes.forEach(function(themeVal) {
			var option = document.createElement('button');
			option.className = 'wpqp-prefs-option';
			option.textContent = themeVal.charAt(0).toUpperCase() + themeVal.slice(1);
			option.setAttribute('data-theme', themeVal);
			if ( wpqpData.theme === themeVal ) {
				option.classList.add('wpqp-prefs-option--active');
			}
			option.addEventListener('click', function(e) {
				e.stopPropagation();
				changeTheme(themeVal);
			});
			themeOptions.appendChild(option);
		});

		themeSection.appendChild(themeLabel);
		themeSection.appendChild(themeOptions);

		// Density section
		var densitySection = document.createElement('div');
		densitySection.className = 'wpqp-prefs-section';

		var densityLabel = document.createElement('div');
		densityLabel.className = 'wpqp-prefs-label';
		densityLabel.textContent = 'Density';

		var densityOptions = document.createElement('div');
		densityOptions.className = 'wpqp-prefs-options';

		var densities = ['normal', 'compact'];
		densities.forEach(function(densityVal) {
			var option = document.createElement('button');
			option.className = 'wpqp-prefs-option';
			option.textContent = densityVal.charAt(0).toUpperCase() + densityVal.slice(1);
			option.setAttribute('data-density', densityVal);
			if ( wpqpData.density === densityVal ) {
				option.classList.add('wpqp-prefs-option--active');
			}
			option.addEventListener('click', function(e) {
				e.stopPropagation();
				changeDensity(densityVal);
			});
			densityOptions.appendChild(option);
		});

		densitySection.appendChild(densityLabel);
		densitySection.appendChild(densityOptions);

		dropdown.appendChild(themeSection);
		dropdown.appendChild(densitySection);

		// Append dropdown after the title bar (we'll position it with CSS)
		var titleRight = state.elements.overlay.querySelector('.wpqp-title-right');
		if ( titleRight ) {
			titleRight.style.position = 'relative';
			titleRight.appendChild(dropdown);
		}

		state.elements.prefsDropdown = dropdown;
	}

	/**
	 * Toggle preferences dropdown.
	 */
	function togglePrefsDropdown() {
		if ( state.prefsDropdownOpen ) {
			closePrefsDropdown();
		} else {
			openPrefsDropdown();
		}
	}

	/**
	 * Open preferences dropdown.
	 */
	function openPrefsDropdown() {
		state.prefsDropdownOpen = true;
		state.elements.prefsDropdown.style.display = 'block';
	}

	/**
	 * Close preferences dropdown.
	 */
	function closePrefsDropdown() {
		state.prefsDropdownOpen = false;
		if ( state.elements.prefsDropdown ) {
			state.elements.prefsDropdown.style.display = 'none';
		}
	}

	/**
	 * Change theme preference.
	 */
	function changeTheme(theme) {
		wpqpData.theme = theme;
		state.elements.root.setAttribute('data-theme', theme);

		if ( theme === 'auto' ) {
			updateAutoTheme();
		}

		// Update active state in dropdown
		var options = state.elements.prefsDropdown.querySelectorAll('[data-theme]');
		options.forEach(function(opt) {
			if ( opt.getAttribute('data-theme') === theme ) {
				opt.classList.add('wpqp-prefs-option--active');
			} else {
				opt.classList.remove('wpqp-prefs-option--active');
			}
		});

		// Save to server
		savePreference('theme', theme);

		closePrefsDropdown();
	}

	/**
	 * Change density preference.
	 */
	function changeDensity(density) {
		wpqpData.density = density;
		state.elements.root.setAttribute('data-density', density);

		// Update active state in dropdown
		var options = state.elements.prefsDropdown.querySelectorAll('[data-density]');
		options.forEach(function(opt) {
			if ( opt.getAttribute('data-density') === density ) {
				opt.classList.add('wpqp-prefs-option--active');
			} else {
				opt.classList.remove('wpqp-prefs-option--active');
			}
		});

		// Save to server
		savePreference('density', density);

		closePrefsDropdown();
	}

	/**
	 * Save preference via AJAX.
	 */
	function savePreference(key, value) {
		var formData = new FormData();
		formData.append('action', 'wpqp_save_preferences');
		formData.append('_ajax_nonce', wpqpData.nonce);
		formData.append(key, value);

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		}).catch(function(err) {
			console.error('WPQP save preference error:', err);
		});
	}

	/**
	 * Apply theme and density data attributes.
	 */
	function applyThemeAndDensity() {
		var root = state.elements.root;
		if ( ! root ) {
			return;
		}

		var theme = wpqpData.theme || 'auto';
		var density = wpqpData.density || 'normal';

		root.setAttribute('data-theme', theme);
		root.setAttribute('data-density', density);

		// For auto theme, check system preference
		if ( theme === 'auto' ) {
			updateAutoTheme();
		}
	}

	/**
	 * Update auto theme based on system preference.
	 */
	function updateAutoTheme() {
		var root = state.elements.root;
		if ( ! root ) {
			return;
		}

		var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
		root.setAttribute('data-resolved-theme', prefersDark ? 'dark' : 'light');
	}

	/**
	 * Listen for system theme changes.
	 */
	function setupThemeListener() {
		if ( ! window.matchMedia ) {
			return;
		}

		var theme = wpqpData.theme || 'auto';
		if ( theme !== 'auto' ) {
			return;
		}

		var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		// Modern browsers
		if ( mediaQuery.addEventListener ) {
			mediaQuery.addEventListener('change', function() {
				updateAutoTheme();
			});
		}
		// Legacy browsers
		else if ( mediaQuery.addListener ) {
			mediaQuery.addListener(function() {
				updateAutoTheme();
			});
		}
	}

	/**
	 * Set up keyboard shortcut listener.
	 */
	function setupKeyboardShortcut() {
		var shortcut = parseShortcut(wpqpData.shortcut || 'ctrl+k');

		document.addEventListener('keydown', function(e) {
			// Skip if user is typing in an input field
			var tagName = e.target.tagName.toLowerCase();
			var isInput = tagName === 'input' || tagName === 'textarea' || e.target.isContentEditable;

			var key = e.key.toLowerCase();
			var ctrl = e.ctrlKey;
			var meta = e.metaKey;
			var shift = e.shiftKey;

			var modifierPressed = isMac() ? meta : ctrl;

			// Match shortcut pattern
			if ( key === shortcut.key && modifierPressed === shortcut.ctrl && shift === shortcut.shift ) {
				e.preventDefault();
				togglePalette();
			}

			// Alt+1 through Alt+9 for favorites - when palette is OPEN
			if ( state.isOpen && key >= '1' && key <= '9' && e.altKey ) {
				e.preventDefault();
				activateFavoriteByIndex(parseInt(key, 10) - 1);
			}
		});
	}

	/**
	 * Set up global Alt+1-9 shortcuts when palette is CLOSED.
	 * This works even when palette is closed, jumping directly to favorites.
	 */
	function setupGlobalAltShortcuts() {
		document.addEventListener('keydown', function(e) {
			// Only handle when palette is NOT open
			if ( state.isOpen ) {
				return;
			}

			var key = e.key.toLowerCase();

			// Alt+1 through Alt+9 for favorites (works globally, even with palette closed)
			if ( key >= '1' && key <= '9' && e.altKey ) {
				e.preventDefault();
				activateFavoriteByIndexGlobal(parseInt(key, 10) - 1);
			}
		});
	}

	/**
	 * Activate a favorite by index when palette is CLOSED.
	 */
	function activateFavoriteByIndexGlobal(index) {
		// Load favorites from server if not loaded
		if ( state.favorites.length === 0 ) {
			// For now, we can't navigate without favorites loaded
			// In Pro, favorites would be loaded on admin init
			// Show a message that favorites need to be loaded
			console.log('WPQP: Favorites not loaded. Open palette first to load favorites.');
			return;
		}

		var fav = state.favorites[index];
		if ( fav && (fav.edit_url || fav.url) ) {
			window.location.href = fav.edit_url || fav.url;
		}
	}

	/**
	 * Activate a favorite by index (Alt+1 through Alt+9).
	 * Used when palette is open.
	 */
	function activateFavoriteByIndex(index) {
		if ( ! wpqpData.isPro || state.favorites.length === 0 ) {
			return;
		}

		var fav = state.favorites[index];
		if ( fav && (fav.edit_url || fav.url) ) {
			window.location.href = fav.edit_url || fav.url;
		}
	}

	/**
	 * Set up admin bar icon click listener.
	 */
	function setupAdminBarIcon() {
		var icon = document.querySelector('#wp-admin-bar-wpqp-admin-bar-icon a');
		if ( icon ) {
			icon.addEventListener('click', function(e) {
				e.preventDefault();
				openPalette();
			});
		}
	}

	/**
	 * Parse shortcut string into components.
	 */
	function parseShortcut(shortcut) {
		var parts = shortcut.toLowerCase().split('+');
		return {
			ctrl: parts.indexOf('ctrl') !== -1,
			shift: parts.indexOf('shift') !== -1,
			key: parts[parts.length - 1] // Last part is the key
		};
	}

	/**
	 * Detect macOS.
	 */
	function isMac() {
		if ( navigator.userAgentData && navigator.userAgentData.platform ) {
			return navigator.userAgentData.platform.toLowerCase().indexOf('mac') !== -1;
		}
		return navigator.platform.toLowerCase().indexOf('mac') !== -1;
	}

	/**
	 * Toggle palette open/close.
	 */
	function togglePalette() {
		if ( state.isOpen ) {
			closePalette();
		} else {
			openPalette();
		}
	}

	/**
	 * Open the palette.
	 */
	function openPalette() {
		if ( state.isOpen ) {
			return;
		}

		state.isOpen = true;
		state.lastFocusedElement = document.activeElement;

		var overlay = state.elements.overlay;
		var input = state.elements.input;

		overlay.classList.add('wpqp-open');
		overlay.setAttribute('aria-hidden', 'false');

		// Focus input
		if ( input ) {
			input.value = '';
			input.focus();
		}

		// Clear previous results
		state.searchTerm = '';
		state.results = {};
		state.selectedIndex = -1;
		state.flatItems = [];
		state.activeSearchType = 'content';

		// Update tab UI
		updateSearchTabsUI();

		// Always show panels (Lite or Pro)
		showSearchTabs(true);

		// Load data and render
		loadPanelData(function() {
			renderPanels();
		});

		// Trap focus
		document.addEventListener('keydown', trapFocus);
	}

	/**
	 * Close the palette.
	 */
	function closePalette() {
		if ( ! state.isOpen ) {
			return;
		}

		state.isOpen = false;

		var overlay = state.elements.overlay;

		overlay.classList.remove('wpqp-open');
		overlay.setAttribute('aria-hidden', 'true');

		// Reset ARIA attributes
		state.elements.input.setAttribute('aria-expanded', 'false');
		state.elements.input.setAttribute('aria-activedescendant', '');

		// Close preferences dropdown if open
		closePrefsDropdown();

		// Close any open copy menus
		closeAllCopyMenus();

		// Restore focus
		if ( state.lastFocusedElement && state.lastFocusedElement.focus ) {
			state.lastFocusedElement.focus();
		}

		// Remove focus trap
		document.removeEventListener('keydown', trapFocus);
	}

	/**
	 * Trap focus within the palette.
	 */
	function trapFocus(e) {
		if ( e.key !== 'Tab' ) {
			// Close prefs dropdown on Escape
			if ( e.key === 'Escape' && state.prefsDropdownOpen ) {
				e.preventDefault();
				closePrefsDropdown();
				return;
			}
			// Close copy menu on Escape
			if ( e.key === 'Escape' && state.openCopyMenuId ) {
				e.preventDefault();
				closeAllCopyMenus();
				return;
			}
			return;
		}

		var panel = state.elements.panel;
		if ( ! panel ) {
			return;
		}

		var focusableElements = panel.querySelectorAll(
			'input, button, a[href], [tabindex]:not([tabindex="-1"])'
		);

		if ( focusableElements.length === 0 ) {
			return;
		}

		var firstElement = focusableElements[0];
		var lastElement = focusableElements[focusableElements.length - 1];

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
	}

	/**
	 * Handle input event with debouncing.
	 */
	function handleInput(e) {
		var term = e.target.value.trim();
		state.searchTerm = term;

		// Check for search prefix (c:, u:, a:, content:, users:, admin:)
		var prefixResult = detectSearchPrefix(term);
		if ( prefixResult.prefixFound && prefixResult.searchType !== state.activeSearchType ) {
			switchSearchType(prefixResult.searchType);
			// Remove prefix from search term for the actual search
			term = prefixResult.cleanTerm;
		}

		// Clear existing timer
		if ( state.debounceTimer ) {
			clearTimeout(state.debounceTimer);
		}

		// Show tabs based on Pro/Lite
		if ( wpqpData.isPro ) {
			showSearchTabs(true);
		} else {
			showSearchTabs(false);
		}

		// Show/hide save search button based on query and Pro status
		if ( state.elements.saveSearchBtn ) {
			state.elements.saveSearchBtn.style.display = wpqpData.isPro && term.length > 0 ? 'flex' : 'none';
		}

		// Show results area if term is not empty
		if ( term.length > 0 ) {
			state.elements.results.style.display = 'flex';
			// Keep panels visible - just show results above them
			// Don't hide panels - they should always be visible
			renderLoading();
		} else {
			// Empty query - show panels
			state.elements.results.style.display = 'flex';
			state.elements.results.classList.remove('has-results');
			renderPanels();
			state.selectedIndex = -1;
			state.flatItems = [];
		}

		// Debounce search
		state.debounceTimer = setTimeout(function() {
			if ( term.length > 0 ) {
				performSearch(term, state.activeSearchType);
			}
		}, 300);
	}

	/**
	 * Detect search prefix and return appropriate search type.
	 */
	function detectSearchPrefix(term) {
		var lowerTerm = term.toLowerCase().trim();

		// Check for short prefixes
		if ( lowerTerm.startsWith('c:') || lowerTerm.startsWith('content:') ) {
			return {
				prefixFound: true,
				searchType: 'content',
				cleanTerm: term.substring(term.indexOf(':') + 1).trim()
			};
		}
		if ( lowerTerm.startsWith('u:') || lowerTerm.startsWith('users:') ) {
			return {
				prefixFound: true,
				searchType: 'users',
				cleanTerm: term.substring(term.indexOf(':') + 1).trim()
			};
		}
		if ( lowerTerm.startsWith('a:') || lowerTerm.startsWith('admin:') ) {
			return {
				prefixFound: true,
				searchType: 'admin',
				cleanTerm: term.substring(term.indexOf(':') + 1).trim()
			};
		}

		return {
			prefixFound: false,
			searchType: state.activeSearchType,
			cleanTerm: term
		};
	}

	/**
	 * Switch search type tab.
	 */
	function switchSearchType(searchType) {
		state.activeSearchType = searchType;
		updateSearchTabsUI();

		// Re-run search if there's a search term
		if ( state.searchTerm.length > 0 ) {
			var prefixResult = detectSearchPrefix(state.searchTerm);
			var term = prefixResult.cleanTerm || state.searchTerm;
			performSearch(term, searchType);
		}
	}

	/**
	 * Update search tabs UI to reflect active tab.
	 */
	function updateSearchTabsUI() {
		var tabs = state.elements.searchTabs.querySelectorAll('.wpqp-search-tab');
		tabs.forEach(function(tab) {
			var tabType = tab.getAttribute('data-search-type');
			if ( tabType === state.activeSearchType ) {
				tab.classList.add('wpqp-search-tab--active');
			} else {
				tab.classList.remove('wpqp-search-tab--active');
			}
		});
	}

	/**
	 * Show or hide search tabs based on Pro status.
	 */
	function showSearchTabs(show) {
		if ( wpqpData.isPro ) {
			state.elements.searchTabs.style.display = show ? 'flex' : 'none';
		} else {
			// Lite: always hide tabs
			state.elements.searchTabs.style.display = 'none';
		}
	}

	/**
	 * Hide panels (history, favorites, saved searches).
	 */
	function hidePanels() {
		if ( state.elements.savedSearchesSection ) {
			state.elements.savedSearchesSection.style.display = 'none';
		}
		if ( state.elements.historyPanel ) {
			state.elements.historyPanel.style.display = 'none';
		}
		if ( state.elements.favoritesPanel ) {
			state.elements.favoritesPanel.style.display = 'none';
		}
		if ( state.elements.panelsContainer ) {
			state.elements.panelsContainer.style.display = 'none';
		}
	}

	/**
	 * Load panel data (history, favorites, saved searches).
	 */
	function loadPanelData(callback) {
		// If Pro, load all data from server
		if ( wpqpData.isPro ) {
			loadProData(callback);
			return;
		}

		// Lite: still load history and favorites from server
		// (user requested these be visible in Lite)
		loadLitePanelData(callback);
	}

	/**
	 * Load Lite panel data (history + favorites even in Lite).
	 */
	function loadLitePanelData(callback) {
		var completed = 0;
		var total = 2;

		function checkDone() {
			completed++;
			if ( completed >= total ) {
				state.proDataLoaded = true;
				if ( callback ) { callback(); }
			}
		}

		// Fetch favorites (available in Lite per user request)
		var favData = new FormData();
		favData.append('action', 'wpqp_get_favorites');
		favData.append('_ajax_nonce', wpqpData.nonce);

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: favData,
			credentials: 'same-origin'
		})
		.then(function(r) { return r.json(); })
		.then(function(data) {
			if ( data.success && data.data && data.data.favorites ) {
				state.favorites = data.data.favorites;
			}
			checkDone();
		})
		.catch(function() { checkDone(); });

		// Fetch history (available in Lite per user request)
		var histData = new FormData();
		histData.append('action', 'wpqp_get_history');
		histData.append('_ajax_nonce', wpqpData.nonce);

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: histData,
			credentials: 'same-origin'
		})
		.then(function(r) { return r.json(); })
		.then(function(data) {
			if ( data.success && data.data && data.data.history ) {
				state.history = data.data.history;
			}
			checkDone();
		})
		.catch(function() { checkDone(); });
	}

	/**
	 * Perform AJAX search.
	 */
	function performSearch(term, searchType) {
		state.requestId++;
		var currentRequestId = state.requestId;

		var formData = new FormData();
		formData.append('action', 'wpqp_search');
		formData.append('_ajax_nonce', wpqpData.nonce);
		formData.append('q', term);
		formData.append('search_type', searchType || 'content');
		formData.append('context', 'palette');

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
		.then(function(response) {
			if ( ! response.ok ) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then(function(data) {
			// Ignore stale responses
			if ( currentRequestId !== state.requestId ) {
				return;
			}

			if ( data.success && data.data ) {
				state.results = data.data.results || {};
				renderResults(state.results);
			} else {
				renderError(data.data && data.data.message ? data.data.message : 'An error occurred');
			}
		})
		.catch(function(error) {
			// Ignore stale responses
			if ( currentRequestId !== state.requestId ) {
				return;
			}

			console.error('WPQP Search error:', error);
			renderError('Failed to perform search. Please try again.');
		});
	}

	/**
	 * Render search results with count heading.
	 */
	function renderResults(results) {
		var resultsContainer = state.elements.results;
		if ( ! resultsContainer ) {
			return;
		}

		resultsContainer.style.display = 'flex';
		resultsContainer.classList.add('has-results');
		resultsContainer.innerHTML = '';

		// Reset item counter
		itemIdCounter = 0;

		// Check if results is empty object
		var hasResults = false;
		var totalCount = 0;
		for ( var key in results ) {
			if ( results.hasOwnProperty(key) && results[key].length > 0 ) {
				hasResults = true;
				totalCount += results[key].length;
			}
		}

		if ( ! hasResults ) {
			renderEmpty();
			return;
		}

		// Flatten results for navigation
		state.flatItems = flattenResults(results);
		state.selectedIndex = -1;

		// Add results count heading (outside scroll wrapper)
		var countHeading = document.createElement('div');
		countHeading.className = 'wpqp-results-heading';
		countHeading.textContent = 'Search Results (' + totalCount + ')';
		resultsContainer.appendChild(countHeading);

		// Create scrollable wrapper for results (only the items, not heading)
		var scrollWrapper = document.createElement('div');
		scrollWrapper.className = 'wpqp-results-scroll';
		resultsContainer.appendChild(scrollWrapper);

		// Render groups
		for ( var postType in results ) {
			if ( ! results.hasOwnProperty(postType) || results[postType].length === 0 ) {
				continue;
			}

			// Add group items (no additional heading per PLAN.md - count is at top)
			var group = document.createElement('div');
			group.className = 'wpqp-group';

			results[postType].forEach(function(item, index) {
				var itemEl = createResultItem(item);
				group.appendChild(itemEl);
			});

			scrollWrapper.appendChild(group);
		}

		// Update ARIA
		state.elements.input.setAttribute('aria-expanded', 'true');
		state.elements.announce.textContent = totalCount + ' results found';
	}

	/**
	 * Flatten grouped results into a single array.
	 */
	function flattenResults(results) {
		var flat = [];
		for ( var postType in results ) {
			if ( results.hasOwnProperty(postType) ) {
				flat = flat.concat(results[postType]);
			}
		}
		return flat;
	}

	/**
	 * Create a result item element.
	 * New format: Title | Type badge | Status badge | ↗ button | Copy button
	 */
	function createResultItem(item) {
		var itemEl = document.createElement('div');
		itemEl.className = 'wpqp-item';
		itemEl.setAttribute('role', 'option');
		itemEl.setAttribute('data-id', item.id);
		itemEl.setAttribute('data-type', item.type);
		itemEl.id = 'wpqp-item-' + (itemIdCounter++);

		// Store item data
		itemEl._wpqpItem = item;

		var content = document.createElement('div');
		content.className = 'wpqp-item-content';

		var title = document.createElement('div');
		title.className = 'wpqp-item-title';
		title.textContent = decodeHtmlEntities(item.title);

		var meta = document.createElement('div');
		meta.className = 'wpqp-item-meta';

		// Post type badge
		var typeBadge = document.createElement('span');
		typeBadge.className = 'wpqp-item-type';
		var ptLabel = getPostTypeSingularLabel(item.type);
		typeBadge.textContent = ptLabel;

		// Status badge
		var statusBadge = document.createElement('span');
		statusBadge.className = 'wpqp-item-status';
		var statusMap = {
			'publish': 'Published',
			'draft': 'Draft',
			'pending': 'Pending',
			'private': 'Private',
			'future': 'Scheduled',
			'trash': 'Trash',
			'disabled': 'Disabled',
			'expired': 'Expired'
		};
		var statusText = statusMap[item.status] || 'Published';
		var statusClass = 'wpqp-item-status--' + (item.status || 'publish');
		statusBadge.className = 'wpqp-item-status ' + statusClass;
		statusBadge.textContent = statusText;

		meta.appendChild(typeBadge);
		meta.appendChild(statusBadge);

		content.appendChild(title);
		content.appendChild(meta);

		itemEl.appendChild(content);

		// Right side: Actions container
		var actions = document.createElement('div');
		actions.className = 'wpqp-item-actions';

		// Open in new tab button (↗)
		var newTabBtn = document.createElement('button');
		newTabBtn.className = 'wpqp-item-newtab';
		newTabBtn.setAttribute('aria-label', 'Open in new tab');
		newTabBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
		newTabBtn.addEventListener('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			openInNewTab(item);
		});

		// Copy button (three dots menu)
		var copyBtn = document.createElement('button');
		copyBtn.className = 'wpqp-copy-btn';
		copyBtn.setAttribute('aria-label', 'Copy options');
		copyBtn.setAttribute('aria-expanded', 'false');
		copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>';
		copyBtn.addEventListener('click', function(e) {
			console.log('[WPQP] Copy button clicked!');
			e.preventDefault();
			e.stopPropagation();
			toggleCopyMenu(copyBtn, item);
		});

		actions.appendChild(newTabBtn);
		actions.appendChild(copyBtn);
		itemEl.appendChild(actions);

		// Star button (Pro)
		if ( wpqpData.isPro ) {
			var isStarred = isItemFavorited(item.type, item.id);
			var starBtn = createStarButton(item, isStarred);
			itemEl.appendChild(starBtn);
		}

		// Add click handler
		itemEl.addEventListener('click', function(e) {
			// Don't navigate if clicking action buttons, copy button, or star button
			if ( e.target.closest('.wpqp-item-actions') || (wpqpData.isPro && e.target.closest('.wpqp-star-btn')) ) {
				return;
			}
			navigateToItem(item);
		});

		// Add hover handler
		itemEl.addEventListener('mouseenter', function() {
			var allItems = state.elements.results.querySelectorAll('.wpqp-item');
			var index = Array.prototype.indexOf.call(allItems, itemEl);
			selectItem(index);
		});

		return itemEl;
	}

	/**
	 * Toggle copy menu for an item.
	 */
	function toggleCopyMenu(btn, item) {
		console.log('[WPQP] toggleCopyMenu called, item:', item);
		var menuId = 'copy-menu-' + item.id;

		// Close any existing open menu
		if ( state.openCopyMenuId && state.openCopyMenuId !== menuId ) {
			closeAllCopyMenus();
		}

		var existingMenu = document.getElementById(menuId);
		if ( existingMenu ) {
			// Menu exists, close it
			existingMenu.remove();
			state.openCopyMenuId = null;
			btn.setAttribute('aria-expanded', 'false');
			return;
		}

		// Create new menu
		var menu = document.createElement('div');
		menu.className = 'wpqp-copy-menu';
		menu.id = menuId;

		// Copy URL option
		var urlOption = document.createElement('button');
		urlOption.className = 'wpqp-copy-option';
		urlOption.textContent = 'Copy URL';
		urlOption.addEventListener('click', function(e) {
			e.stopPropagation();
			copyToClipboard(item.edit_url || item.url || '');
			showCopyFeedback(btn, 'URL copied!');
			menu.remove();
			state.openCopyMenuId = null;
		});

		// Copy Title option
		var titleOption = document.createElement('button');
		titleOption.className = 'wpqp-copy-option';
		titleOption.textContent = 'Copy Title';
		titleOption.addEventListener('click', function(e) {
			e.stopPropagation();
			copyToClipboard(item.title || '');
			showCopyFeedback(btn, 'Title copied!');
			menu.remove();
			state.openCopyMenuId = null;
		});

		// Copy ID option
		var idOption = document.createElement('button');
		idOption.className = 'wpqp-copy-option';
		idOption.textContent = 'Copy ID';
		idOption.addEventListener('click', function(e) {
			e.stopPropagation();
			copyToClipboard(String(item.id || ''));
			showCopyFeedback(btn, 'ID copied!');
			menu.remove();
			state.openCopyMenuId = null;
		});

		menu.appendChild(urlOption);
		menu.appendChild(titleOption);
		menu.appendChild(idOption);

		// Append menu to body for proper fixed positioning
		document.body.appendChild(menu);

		// Position menu relative to the button using fixed positioning
		var btnRect = btn.getBoundingClientRect();

		menu.style.position = 'fixed';
		menu.style.zIndex = '999999';
		menu.style.left = btnRect.left + 'px';
		menu.style.top = (btnRect.bottom + 4) + 'px';

		console.log('[WPQP] Menu positioned at:', menu.style.top, menu.style.left);

		// Force visibility for debugging
		menu.style.display = 'block';
		menu.style.visibility = 'visible';
		menu.style.opacity = '1';

		console.log('[WPQP] Menu element:', menu);

		state.openCopyMenuId = menuId;
		btn.setAttribute('aria-expanded', 'true');
	}

	/**
	 * Show feedback after copying.
	 */
	function showCopyFeedback(btn, message) {
		var feedback = document.createElement('span');
		feedback.className = 'wpqp-copy-feedback';
		feedback.textContent = message;
		btn.parentElement.appendChild(feedback);

		setTimeout(function() {
			feedback.remove();
		}, 1500);
	}

	/**
	 * Copy text to clipboard.
	 */
	function copyToClipboard(text) {
		if ( navigator.clipboard && navigator.clipboard.writeText ) {
			navigator.clipboard.writeText(text).catch(function(err) {
				console.error('WPQP: Failed to copy to clipboard', err);
				fallbackCopyToClipboard(text);
			});
		} else {
			fallbackCopyToClipboard(text);
		}
	}

	/**
	 * Fallback copy method for older browsers.
	 */
	function fallbackCopyToClipboard(text) {
		var textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.left = '-9999px';
		document.body.appendChild(textarea);
		textarea.select();

		try {
			document.execCommand('copy');
		} catch (err) {
			console.error('WPQP: Fallback copy failed', err);
		}

		document.body.removeChild(textarea);
	}

	/**
	 * Close all open copy menus.
	 */
	function closeAllCopyMenus() {
		var menus = document.querySelectorAll('.wpqp-copy-menu');
		menus.forEach(function(menu) {
			menu.remove();
		});

		var copyBtns = document.querySelectorAll('.wpqp-copy-btn[aria-expanded="true"]');
		copyBtns.forEach(function(btn) {
			btn.setAttribute('aria-expanded', 'false');
		});

		state.openCopyMenuId = null;
	}

	/**
	 * Set up click outside to close copy menus.
	 */
	function setupClickOutsideToCloseCopyMenu() {
		document.addEventListener('click', function(e) {
			if ( state.openCopyMenuId && ! e.target.closest('.wpqp-copy-menu') && ! e.target.closest('.wpqp-copy-btn') ) {
				closeAllCopyMenus();
			}
		});
	}

	/**
	 * Get singular post type label.
	 */
	function getPostTypeSingularLabel(postType) {
		var labels = {
			'post': 'Post',
			'page': 'Page',
			'product': 'Product',
			'attachment': 'Media',
			'user': 'User',
			'admin': 'Admin'
		};
		return labels[postType] || postType.charAt(0).toUpperCase() + postType.slice(1);
	}

	/**
	 * Open item in new tab.
	 */
	function openInNewTab(item) {
		if ( ! item || ! (item.edit_url || item.url) ) {
			return;
		}
		window.open(item.edit_url || item.url, '_blank');
	}

	/**
	 * Navigate to an item.
	 */
	function navigateToItem(item) {
		if ( ! item || ! (item.edit_url || item.url) ) {
			return;
		}

		// Record history (Pro or Lite - user wanted history visible in Lite)
		recordHistory(item);

		// Navigate to edit URL
		window.location.href = item.edit_url || item.url;
	}

	/**
	 * Select an item by index.
	 */
	function selectItem(index) {
		var allItems = state.elements.results.querySelectorAll('.wpqp-item');

		allItems.forEach(function(item, i) {
			if ( i === index ) {
				item.classList.add('wpqp-item--selected');
				item.setAttribute('aria-selected', 'true');
			} else {
				item.classList.remove('wpqp-item--selected');
				item.setAttribute('aria-selected', 'false');
			}
		});

		state.selectedIndex = index;

		// Update aria-activedescendant
		state.elements.input.setAttribute('aria-activedescendant', allItems[index] ? allItems[index].id : '');
	}

	/**
	 * Scroll item into view.
	 */
	function scrollItemIntoView(element) {
		if ( ! element ) {
			return;
		}

		if ( element.scrollIntoView ) {
			element.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			});
		}
	}

	/**
	 * Handle keyboard navigation.
	 */
	function handleKeyboardNav(e) {
		var key = e.key;

		// Escape closes palette (or prefs dropdown if open)
		if ( key === 'Escape' ) {
			e.preventDefault();
			if ( state.prefsDropdownOpen ) {
				closePrefsDropdown();
			} else if ( state.openCopyMenuId ) {
				closeAllCopyMenus();
			} else {
				closePalette();
			}
			return;
		}

		// Arrow navigation
		if ( key === 'ArrowDown' || key === 'ArrowUp' ) {
			e.preventDefault();

			var allItems = state.elements.results.querySelectorAll('.wpqp-item');
			if ( allItems.length === 0 ) {
				return;
			}

			if ( key === 'ArrowDown' ) {
				state.selectedIndex = (state.selectedIndex + 1) % allItems.length;
			} else {
				state.selectedIndex = state.selectedIndex <= 0 ? allItems.length - 1 : state.selectedIndex - 1;
			}

			selectItem(state.selectedIndex);
			scrollItemIntoView(allItems[state.selectedIndex]);
		}

		// Enter activates selected item
		if ( key === 'Enter' ) {
			e.preventDefault();

			// Check for Ctrl/Cmd+Enter (open in new tab)
			if ( e.ctrlKey || e.metaKey ) {
				var allItems = state.elements.results.querySelectorAll('.wpqp-item');
				if ( state.selectedIndex >= 0 && state.selectedIndex < allItems.length ) {
					var selectedItem = allItems[state.selectedIndex];
					if ( selectedItem && selectedItem._wpqpItem ) {
						openInNewTab(selectedItem._wpqpItem);
					}
				}
				return;
			}

			var allItems = state.elements.results.querySelectorAll('.wpqp-item');
			if ( state.selectedIndex >= 0 && state.selectedIndex < allItems.length ) {
				var selectedItem = allItems[state.selectedIndex];
				if ( selectedItem && selectedItem._wpqpItem ) {
					navigateToItem(selectedItem._wpqpItem);
				}
			}
		}
	}

	/**
	 * Render loading state.
	 */
	function renderLoading() {
		var resultsContainer = state.elements.results;
		if ( ! resultsContainer ) {
			return;
		}

		resultsContainer.innerHTML = '<div class="wpqp-loading"><span class="wpqp-spinner"></span><span>Searching...</span></div>';
	}

	/**
	 * Render empty state.
	 */
	function renderEmpty() {
		var resultsContainer = state.elements.results;
		if ( ! resultsContainer ) {
			return;
		}

		resultsContainer.innerHTML = '<div class="wpqp-empty">No results found</div>';
		state.elements.input.setAttribute('aria-expanded', 'false');
	}

	/**
	 * Render error state.
	 */
	function renderError(message) {
		var resultsContainer = state.elements.results;
		if ( ! resultsContainer ) {
			return;
		}

		resultsContainer.innerHTML = '<div class="wpqp-error">' + escapeHtml(message) + '</div>';
	}

	/**
	 * Escape HTML to prevent XSS.
	 */
	function escapeHtml(text) {
		var div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * Decode HTML entities.
	 */
	function decodeHtmlEntities(text) {
		var textarea = document.createElement('textarea');
		textarea.innerHTML = text;
		return textarea.value;
	}

	/* =====================================================================
	   Panels: Favorites + History
	   ===================================================================== */

	/**
	 * Render panels (History and Favorites).
	 * This is now available in Lite as well per user request.
	 */
	function renderPanels() {
		console.log('[WPQP] renderPanels called');
		var resultsContainer = state.elements.results;
		if ( ! resultsContainer ) {
			return;
		}

		resultsContainer.style.display = 'flex';
		resultsContainer.innerHTML = '';

		// Reset item counter
		itemIdCounter = 0;

		var hasFavorites = state.favorites && state.favorites.length > 0;
		var hasHistory = state.history && state.history.length > 0;

		if ( ! hasFavorites && ! hasHistory ) {
			resultsContainer.innerHTML = '<div class="wpqp-empty">Start searching to see results. Star items to add favorites.</div>';
			// Show empty panels with spacing
			if ( state.elements.panelsContainer ) {
				state.elements.panelsContainer.style.display = 'flex';
				state.elements.panelsContainer.classList.add('has-spacing');
			}
			// Show empty panel placeholders
			state.elements.historyPanel.style.display = 'flex';
			state.elements.favoritesPanel.style.display = 'flex';
			state.elements.historyPanel.innerHTML = '<div class="wpqp-empty wpqp-empty--panel">No history yet</div>';
			state.elements.favoritesPanel.innerHTML = '<div class="wpqp-empty wpqp-empty--panel">No favorites yet</div>';
			return;
		}

		// Create scrollable wrapper
		var scrollWrapper = document.createElement('div');
		scrollWrapper.className = 'wpqp-results-scroll';
		resultsContainer.appendChild(scrollWrapper);

		// ===========================================
		// HISTORY + FAVORITES PANELS (two columns)
		// ===========================================
		var historyPanel = state.elements.historyPanel;
		var favoritesPanel = state.elements.favoritesPanel;

		if ( hasHistory || hasFavorites ) {
			// Show both panels in two-column layout
			state.elements.panelsContainer.style.display = 'flex';
			historyPanel.style.display = 'flex';
			favoritesPanel.style.display = 'flex';

			// History column
			if ( hasHistory ) {
				historyPanel.innerHTML = '';

				var histHeading = document.createElement('div');
				histHeading.className = 'wpqp-panel-heading';

				// Heading row with title
				var histHeadingRow = document.createElement('div');
				histHeadingRow.className = 'wpqp-panel-heading-row';

				var histTitle = document.createElement('span');
				histTitle.textContent = 'History';
				histHeadingRow.appendChild(histTitle);

				histHeading.appendChild(histHeadingRow);

				// Filter input inside heading
				var histFilter = document.createElement('input');
				histFilter.type = 'text';
				histFilter.className = 'wpqp-filter-input';
				histFilter.placeholder = 'Filter...';
				histFilter.addEventListener('input', function(e) {
					filterHistoryItems(e.target.value);
				});
				histHeading.appendChild(histFilter);

				historyPanel.appendChild(histHeading);

				var histList = document.createElement('div');
				histList.className = 'wpqp-panel-list';
				histList.id = 'wpqp-history-list';

				state.history.forEach(function(entry) {
					var isFav = isItemFavorited(entry.type, entry.id);
					var itemEl = createPanelItem(entry, isFav);
					histList.appendChild(itemEl);
				});

				historyPanel.appendChild(histList);
			}

			// Favorites column
			if ( hasFavorites ) {
				favoritesPanel.innerHTML = '';

				var favHeading = document.createElement('div');
				favHeading.className = 'wpqp-panel-heading';

				// Heading row with title
				var favHeadingRow = document.createElement('div');
				favHeadingRow.className = 'wpqp-panel-heading-row';

				var favTitle = document.createElement('span');
				favTitle.textContent = 'Favorites';
				favHeadingRow.appendChild(favTitle);

				favHeading.appendChild(favHeadingRow);

				// Filter input inside heading
				var favFilter = document.createElement('input');
				favFilter.type = 'text';
				favFilter.className = 'wpqp-filter-input';
				favFilter.placeholder = 'Filter...';
				favFilter.addEventListener('input', function(e) {
					filterFavoritesItems(e.target.value);
				});
				favHeading.appendChild(favFilter);

				favoritesPanel.appendChild(favHeading);

				var favList = document.createElement('div');
				favList.className = 'wpqp-panel-list';
				favList.id = 'wpqp-favorites-list';

				state.favorites.forEach(function(fav, index) {
					var itemEl = createPanelItem(fav, true);
					// Add drag handle and Alt+1-9 badge
					var dragHandle = document.createElement('span');
					dragHandle.className = 'wpqp-drag-handle';
					dragHandle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';
					itemEl.insertBefore(dragHandle, itemEl.firstChild);

					// Alt+1-9 badges for first 9
					if ( index < 9 ) {
						var shortcutBadge = document.createElement('span');
						shortcutBadge.className = 'wpqp-shortcut-badge wpqp-shortcut-badge--fav';
						shortcutBadge.textContent = 'Alt+' + (index + 1);
						itemEl.querySelector('.wpqp-item-meta').appendChild(shortcutBadge);
					}
					favList.appendChild(itemEl);
				});

				favoritesPanel.appendChild(favList);

				// Set up drag and drop for favorites (after items are rendered)
				setupFavoritesDragDrop();
			}
		} else {
			historyPanel.style.display = 'none';
			favoritesPanel.style.display = 'none';
			state.elements.panelsContainer.style.display = 'none';
		}

		// Reset flat items and selection
		state.flatItems = [];
		state.selectedIndex = -1;
	}

	/**
	 * Create a DOM element for a panel item (favorite or history entry).
	 */
	function createPanelItem(item, isFavorite) {
		var itemEl = document.createElement('div');
		itemEl.className = 'wpqp-item';
		itemEl.setAttribute('role', 'option');
		itemEl.setAttribute('data-id', item.id);
		itemEl.setAttribute('data-type', item.type);
		itemEl.id = 'wpqp-item-' + (itemIdCounter++);

		// Normalize item data for navigation
		var normalizedItem = {
			type: item.type,
			id: item.id,
			title: item.title || item.label || '',
			edit_url: item.edit_url || item.url || '',
			status: item.status || 'publish'
		};

		itemEl._wpqpItem = normalizedItem;

		var content = document.createElement('div');
		content.className = 'wpqp-item-content';

		var title = document.createElement('div');
		title.className = 'wpqp-item-title';
		title.textContent = decodeHtmlEntities(normalizedItem.title);

		var meta = document.createElement('div');
		meta.className = 'wpqp-item-meta';

		// Type badge
		var typeLabel = document.createElement('span');
		typeLabel.className = 'wpqp-item-type';
		typeLabel.textContent = getPostTypeSingularLabel(item.type);
		meta.appendChild(typeLabel);

		// Status badge
		var statusBadge = document.createElement('span');
		statusBadge.className = 'wpqp-item-status wpqp-item-status--publish';
		statusBadge.textContent = 'Published';
		meta.appendChild(statusBadge);

		// Relative time for history
		if ( item.last_used ) {
			var timeAgo = document.createElement('span');
			timeAgo.className = 'wpqp-item-time';
			timeAgo.textContent = getRelativeTime(item.last_used);
			meta.appendChild(timeAgo);
		}

		content.appendChild(title);
		content.appendChild(meta);
		itemEl.appendChild(content);

		// Right side: Actions
		var actions = document.createElement('div');
		actions.className = 'wpqp-item-actions';

		// Open in new tab
		var newTabBtn = document.createElement('button');
		newTabBtn.className = 'wpqp-item-newtab';
		newTabBtn.setAttribute('aria-label', 'Open in new tab');
		newTabBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
		newTabBtn.addEventListener('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			openInNewTab(normalizedItem);
		});

		// Copy button (three dots menu)
		var copyBtn = document.createElement('button');
		copyBtn.className = 'wpqp-copy-btn';
		copyBtn.setAttribute('aria-label', 'Copy options');
		copyBtn.setAttribute('aria-expanded', 'false');
		copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>';
		copyBtn.addEventListener('click', function(e) {
			console.log('[WPQP] Panel copy button clicked!');
			e.preventDefault();
			e.stopPropagation();
			toggleCopyMenu(copyBtn, normalizedItem);
		});

		actions.appendChild(newTabBtn);
		actions.appendChild(copyBtn);
		itemEl.appendChild(actions);

		// Star button
		var starBtn = createStarButton(normalizedItem, isFavorite);
		itemEl.appendChild(starBtn);

		// Click handler
		itemEl.addEventListener('click', function(e) {
			// Don't navigate if dragging
			if ( itemEl.classList.contains('wpqp-dragging') ) {
				return;
			}
			// Don't navigate if clicking action buttons
			if ( e.target.closest('.wpqp-item-actions') || e.target.closest('.wpqp-star-btn') ) {
				return;
			}
			navigateToItem(normalizedItem);
		});

		// Hover handler
		itemEl.addEventListener('mouseenter', function() {
			var allItems = state.elements.results.querySelectorAll('.wpqp-item');
			var index = Array.prototype.indexOf.call(allItems, itemEl);
			selectItem(index);
		});

		return itemEl;
	}

	/**
	 * Filter history items by search term.
	 */
	function filterHistoryItems(term) {
		var list = document.getElementById('wpqp-history-list');
		if ( ! list ) return;

		var items = list.querySelectorAll('.wpqp-item');
		var lowerTerm = term.toLowerCase();

		items.forEach(function(item) {
			var title = item.querySelector('.wpqp-item-title');
			if ( title ) {
				var text = title.textContent.toLowerCase();
				item.style.display = text.indexOf(lowerTerm) !== -1 ? '' : 'none';
			}
		});
	}

	/**
	 * Filter favorites items by search term.
	 */
	function filterFavoritesItems(term) {
		var list = document.getElementById('wpqp-favorites-list');
		if ( ! list ) return;

		var items = list.querySelectorAll('.wpqp-item');
		var lowerTerm = term.toLowerCase();

		items.forEach(function(item) {
			var title = item.querySelector('.wpqp-item-title');
			if ( title ) {
				var text = title.textContent.toLowerCase();
				item.style.display = text.indexOf(lowerTerm) !== -1 ? '' : 'none';
			}
		});
	}

	/**
	 * Set up drag and drop for favorites list.
	 */
	function setupFavoritesDragDrop() {
		console.log('[WPQP] setupFavoritesDragDrop called');
		var favList = document.getElementById('wpqp-favorites-list');
		console.log('[WPQP] favList element:', favList);
		if ( ! favList ) {
			console.log('[WPQP] favList not found!');
			return;
		}

		var items = favList.querySelectorAll('.wpqp-item');
		console.log('[WPQP] Found items:', items.length);

		if (items.length === 0) {
			console.log('[WPQP] No items found in favorites list!');
		}

		var draggedItem = null;

		items.forEach(function(item) {
			var dragHandle = item.querySelector('.wpqp-drag-handle');
			console.log('[WPQP] dragHandle:', dragHandle);
			if ( ! dragHandle ) {
				console.log('[WPQP] No drag handle found!');
				return;
			}

			// Make the drag handle draggable
			dragHandle.setAttribute('draggable', 'true');
			dragHandle.style.cursor = 'grab';

			dragHandle.addEventListener('dragstart', function(e) {
				console.log('[WPQP] dragstart event fired!');
				draggedItem = item;
				item.classList.add('wpqp-dragging');
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', item.getAttribute('data-id'));
				// Disable click navigation during drag
				item.addEventListener('click', preventClickDuringDrag, true);
			});

			dragHandle.addEventListener('dragend', function(e) {
				console.log('[WPQP] dragend event fired!');
				item.classList.remove('wpqp-dragging');
				item.removeEventListener('click', preventClickDuringDrag, true);
				draggedItem = null;

				// Remove drag-over styling from all items
				items.forEach(function(it) {
					it.classList.remove('wpqp-drag-over');
				});
			});

			item.addEventListener('dragover', function(e) {
				console.log('[WPQP] dragover event fired!');
				e.preventDefault();
				e.dataTransfer.dropEffect = 'move';
				if ( draggedItem && draggedItem !== item ) {
					item.classList.add('wpqp-drag-over');
				}
			});

			item.addEventListener('dragleave', function(e) {
				item.classList.remove('wpqp-drag-over');
			});

			item.addEventListener('drop', function(e) {
				console.log('[WPQP] drop event fired!');
				e.preventDefault();
				item.classList.remove('wpqp-drag-over');

				if ( draggedItem && draggedItem !== item ) {
					// Reorder favorites
					var draggedId = draggedItem.getAttribute('data-id');
					var targetId = item.getAttribute('data-id');
					reorderFavorites(draggedId, targetId);
				}
			});
		});
	}

	/**
	 * Prevent click during drag.
	 */
	function preventClickDuringDrag(e) {
		e.preventDefault();
		e.stopPropagation();
	}

	/**
	 * Reorder favorites after drag and drop.
	 */
	function reorderFavorites(draggedId, targetId) {
		console.log('[WPQP] Reordering favorites:', draggedId, targetId);
		// Find indices
		var draggedIndex = -1;
		var targetIndex = -1;

		for ( var i = 0; i < state.favorites.length; i++ ) {
			if ( String(state.favorites[i].id) === String(draggedId) ) {
				draggedIndex = i;
			}
			if ( String(state.favorites[i].id) === String(targetId) ) {
				targetIndex = i;
			}
		}

		if ( draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex ) {
			return;
		}

		// Reorder in state
		var item = state.favorites.splice(draggedIndex, 1)[0];
		state.favorites.splice(targetIndex, 0, item);

		console.log('[WPQP] New favorites order:', state.favorites);

		// Re-render favorites list
		renderPanels();

		// Save new order to server
		saveFavoritesOrder();
	}

	/**
	 * Save favorites order to server.
	 */
	function saveFavoritesOrder() {
		var formData = new FormData();
		formData.append('action', 'wpqp_reorder_favorites');
		formData.append('_ajax_nonce', wpqpData.nonce);
		formData.append('order', JSON.stringify(state.favorites.map(function(f) {
			return { id: f.id, type: f.type };
		})));

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		}).catch(function(err) {
			console.error('WPQP reorder favorites error:', err);
		});
	}

	/* =====================================================================
	   Pro Features: Favorites + History + Saved Searches
	   ===================================================================== */

	/**
	 * Load Pro data (favorites + history + saved searches) via AJAX.
	 */
	function loadProData(callback) {
		if ( ! wpqpData.isPro ) {
			if ( callback ) { callback(); }
			return;
		}

		if ( state.proDataLoaded ) {
			if ( callback ) { callback(); }
			return;
		}

		var completed = 0;
		var total = 3;

		function checkDone() {
			completed++;
			if ( completed >= total ) {
				state.proDataLoaded = true;
				if ( callback ) { callback(); }
			}
		}

		// Fetch favorites
		var favData = new FormData();
		favData.append('action', 'wpqp_get_favorites');
		favData.append('_ajax_nonce', wpqpData.nonce);

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: favData,
			credentials: 'same-origin'
		})
		.then(function(r) { return r.json(); })
		.then(function(data) {
			if ( data.success && data.data && data.data.favorites ) {
				state.favorites = data.data.favorites;
			}
			checkDone();
		})
		.catch(function() { checkDone(); });

		// Fetch history
		var histData = new FormData();
		histData.append('action', 'wpqp_get_history');
		histData.append('_ajax_nonce', wpqpData.nonce);

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: histData,
			credentials: 'same-origin'
		})
		.then(function(r) { return r.json(); })
		.then(function(data) {
			if ( data.success && data.data && data.data.history ) {
				state.history = data.data.history;
			}
			checkDone();
		})
		.catch(function() { checkDone(); });

		// Fetch saved searches
		var savedData = new FormData();
		savedData.append('action', 'wpqp_get_saved_searches');
		savedData.append('_ajax_nonce', wpqpData.nonce);

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: savedData,
			credentials: 'same-origin'
		})
		.then(function(r) { return r.json(); })
		.then(function(data) {
			if ( data.success && data.data && data.data.saved_searches ) {
				state.savedSearches = data.data.saved_searches;
			}
			checkDone();
		})
		.catch(function() { checkDone(); });
	}

	/**
	 * Render Pro sections: Saved Searches (top) + History/Favorites columns (bottom).
	 */
	function renderProSections() {
		if ( ! wpqpData.isPro ) {
			return;
		}

		var resultsContainer = state.elements.results;
		if ( ! resultsContainer ) {
			return;
		}

		resultsContainer.style.display = 'flex';
		resultsContainer.innerHTML = '';

		// Reset item counter
		itemIdCounter = 0;

		var hasFavorites = state.favorites.length > 0;
		var hasHistory = state.history.length > 0;
		var hasSavedSearches = state.savedSearches.length > 0;

		if ( ! hasFavorites && ! hasHistory && ! hasSavedSearches ) {
			resultsContainer.innerHTML = '<div class="wpqp-empty">Start searching, or star items to add favorites.</div>';
			// Show empty panels with spacing
			if ( state.elements.panelsContainer ) {
				state.elements.panelsContainer.style.display = 'flex';
				state.elements.panelsContainer.classList.add('has-spacing');
			}
			// Show empty panel placeholders
			state.elements.historyPanel.style.display = 'flex';
			state.elements.favoritesPanel.style.display = 'flex';
			state.elements.historyPanel.innerHTML = '<div class="wpqp-empty wpqp-empty--panel">No history yet</div>';
			state.elements.favoritesPanel.innerHTML = '<div class="wpqp-empty wpqp-empty--panel">No favorites yet</div>';
			return;
		}

		// Create scrollable wrapper
		var scrollWrapper = document.createElement('div');
		scrollWrapper.className = 'wpqp-results-scroll';
		resultsContainer.appendChild(scrollWrapper);

		// ===========================================
		// SAVED SEARCHES SECTION (top)
		// ===========================================
		var savedSection = state.elements.savedSearchesSection;
		if ( hasSavedSearches ) {
			savedSection.innerHTML = '';
			savedSection.style.display = 'block';

			var savedHeading = document.createElement('div');
			savedHeading.className = 'wpqp-section-heading';
			savedHeading.textContent = 'Saved Searches';
			savedSection.appendChild(savedHeading);

			var savedList = document.createElement('div');
			savedList.className = 'wpqp-saved-list';

			state.savedSearches.forEach(function(savedSearch) {
				var itemEl = createSavedSearchItem(savedSearch);
				savedList.appendChild(itemEl);
			});

			savedSection.appendChild(savedList);
		} else {
			savedSection.style.display = 'none';
		}

		// Insert saved searches section before results
		resultsContainer.appendChild(savedSection);

		// ===========================================
		// HISTORY + FAVORITES PANELS (bottom)
		// ===========================================
		var historyPanel = state.elements.historyPanel;
		var favoritesPanel = state.elements.favoritesPanel;

		if ( hasHistory || hasFavorites ) {
			// Show both panels in two-column layout
			state.elements.panelsContainer.style.display = 'flex';
			historyPanel.style.display = 'flex';
			favoritesPanel.style.display = 'flex';

			// History column
			if ( hasHistory ) {
				historyPanel.innerHTML = '';

				var histHeading = document.createElement('div');
				histHeading.className = 'wpqp-panel-heading';
				histHeading.textContent = 'History';
				historyPanel.appendChild(histHeading);

				// Filter input
				var histFilter = document.createElement('input');
				histFilter.type = 'text';
				histFilter.className = 'wpqp-filter-input';
				histFilter.placeholder = 'Filter...';
				histFilter.addEventListener('input', function(e) {
					filterHistoryItems(e.target.value);
				});
				historyPanel.appendChild(histFilter);

				var histList = document.createElement('div');
				histList.className = 'wpqp-panel-list';
				histList.id = 'wpqp-history-list';

				state.history.forEach(function(entry) {
					var isFav = isItemFavorited(entry.type, entry.id);
					var itemEl = createProItem(entry, isFav);
					histList.appendChild(itemEl);
				});

				historyPanel.appendChild(histList);
			}

			// Favorites column
			if ( hasFavorites ) {
				favoritesPanel.innerHTML = '';

				var favHeading = document.createElement('div');
				favHeading.className = 'wpqp-panel-heading';

				// Heading row with title
				var favHeadingRow = document.createElement('div');
				favHeadingRow.className = 'wpqp-panel-heading-row';

				var favTitle = document.createElement('span');
				favTitle.textContent = 'Favorites';
				favHeadingRow.appendChild(favTitle);

				favHeading.appendChild(favHeadingRow);

				// Filter input inside heading
				var favFilter = document.createElement('input');
				favFilter.type = 'text';
				favFilter.className = 'wpqp-filter-input';
				favFilter.placeholder = 'Filter...';
				favFilter.addEventListener('input', function(e) {
					filterFavoritesItems(e.target.value);
				});
				favHeading.appendChild(favFilter);

				favoritesPanel.appendChild(favHeading);

				var favList = document.createElement('div');
				favList.className = 'wpqp-panel-list';
				favList.id = 'wpqp-favorites-list';

				state.favorites.forEach(function(fav, index) {
					var itemEl = createProItem(fav, true);
					// Add drag handle and Alt+1-9 badge
					var dragHandle = document.createElement('span');
					dragHandle.className = 'wpqp-drag-handle';
					dragHandle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';
					itemEl.insertBefore(dragHandle, itemEl.firstChild);

					// Alt+1-9 badges for first 9
					if ( index < 9 ) {
						var shortcutBadge = document.createElement('span');
						shortcutBadge.className = 'wpqp-shortcut-badge wpqp-shortcut-badge--fav';
						shortcutBadge.textContent = 'Alt+' + (index + 1);
						itemEl.querySelector('.wpqp-item-meta').appendChild(shortcutBadge);
					}
					favList.appendChild(itemEl);
				});

				favoritesPanel.appendChild(favList);

				// Set up drag and drop for favorites (after items are rendered)
				setupFavoritesDragDrop();
			}
		} else {
			historyPanel.style.display = 'none';
			favoritesPanel.style.display = 'none';
			state.elements.panelsContainer.style.display = 'none';
		}

		// Reset flat items and selection
		state.flatItems = [];
		state.selectedIndex = -1;
	}

	/**
	 * Create a DOM element for a Pro item (favorite or history entry).
	 */
	function createProItem(item, isFavorite) {
		var itemEl = document.createElement('div');
		itemEl.className = 'wpqp-item';
		itemEl.setAttribute('role', 'option');
		itemEl.setAttribute('data-id', item.id);
		itemEl.setAttribute('data-type', item.type);
		itemEl.id = 'wpqp-item-' + (itemIdCounter++);

		// Normalize item data for navigation
		var normalizedItem = {
			type: item.type,
			id: item.id,
			title: item.title || item.label || '',
			edit_url: item.edit_url || item.url || '',
			status: item.status || 'publish'
		};

		itemEl._wpqpItem = normalizedItem;

		var content = document.createElement('div');
		content.className = 'wpqp-item-content';

		var title = document.createElement('div');
		title.className = 'wpqp-item-title';
		title.textContent = decodeHtmlEntities(normalizedItem.title);

		var meta = document.createElement('div');
		meta.className = 'wpqp-item-meta';

		// Type badge
		var typeLabel = document.createElement('span');
		typeLabel.className = 'wpqp-item-type';
		typeLabel.textContent = getPostTypeSingularLabel(item.type);
		meta.appendChild(typeLabel);

		// Status badge
		var statusBadge = document.createElement('span');
		statusBadge.className = 'wpqp-item-status wpqp-item-status--publish';
		statusBadge.textContent = 'Published';
		meta.appendChild(statusBadge);

		// Relative time for history
		if ( item.last_used ) {
			var timeAgo = document.createElement('span');
			timeAgo.className = 'wpqp-item-time';
			timeAgo.textContent = getRelativeTime(item.last_used);
			meta.appendChild(timeAgo);
		}

		content.appendChild(title);
		content.appendChild(meta);
		itemEl.appendChild(content);

		// Right side: Actions
		var actions = document.createElement('div');
		actions.className = 'wpqp-item-actions';

		// Open in new tab
		var newTabBtn = document.createElement('button');
		newTabBtn.className = 'wpqp-item-newtab';
		newTabBtn.setAttribute('aria-label', 'Open in new tab');
		newTabBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
		newTabBtn.addEventListener('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			openInNewTab(normalizedItem);
		});

		// Copy button (three dots menu)
		var copyBtn = document.createElement('button');
		copyBtn.className = 'wpqp-copy-btn';
		copyBtn.setAttribute('aria-label', 'Copy options');
		copyBtn.setAttribute('aria-expanded', 'false');
		copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>';
		copyBtn.addEventListener('click', function(e) {
			console.log('[WPQP] Panel copy button clicked!');
			e.preventDefault();
			e.stopPropagation();
			toggleCopyMenu(copyBtn, normalizedItem);
		});

		actions.appendChild(newTabBtn);
		actions.appendChild(copyBtn);
		itemEl.appendChild(actions);

		// Star button
		var starBtn = createStarButton(normalizedItem, isFavorite);
		itemEl.appendChild(starBtn);

		// Click handler
		itemEl.addEventListener('click', function(e) {
			// Don't navigate if dragging
			if ( itemEl.classList.contains('wpqp-dragging') ) {
				return;
			}
			// Don't navigate if clicking action buttons
			if ( e.target.closest('.wpqp-item-actions') || e.target.closest('.wpqp-star-btn') ) {
				return;
			}
			navigateToItem(normalizedItem);
		});

		// Hover handler
		itemEl.addEventListener('mouseenter', function() {
			var allItems = state.elements.results.querySelectorAll('.wpqp-item');
			var index = Array.prototype.indexOf.call(allItems, itemEl);
			selectItem(index);
		});

		return itemEl;
	}

	/**
	 * Create a DOM element for a saved search item.
	 */
	function createSavedSearchItem(savedSearch) {
		var itemEl = document.createElement('div');
		itemEl.className = 'wpqp-item wpqp-saved-search-item';
		itemEl.setAttribute('role', 'option');
		itemEl.id = 'wpqp-saved-' + (itemIdCounter++);

		itemEl._wpqpSavedSearch = savedSearch;

		var content = document.createElement('div');
		content.className = 'wpqp-item-content';

		var title = document.createElement('div');
		title.className = 'wpqp-item-title';
		title.textContent = savedSearch.label;

		var meta = document.createElement('div');
		meta.className = 'wpqp-item-meta';

		var typeBadge = document.createElement('span');
		typeBadge.className = 'wpqp-item-type';
		typeBadge.textContent = savedSearch.search_type || 'Content';
		meta.appendChild(typeBadge);

		content.appendChild(title);
		content.appendChild(meta);
		itemEl.appendChild(content);

		// Delete button
		var deleteBtn = document.createElement('button');
		deleteBtn.className = 'wpqp-delete-saved';
		deleteBtn.setAttribute('aria-label', 'Delete saved search');
		deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
		deleteBtn.addEventListener('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			deleteSavedSearch(savedSearch.id);
		});

		var actions = document.createElement('div');
		actions.className = 'wpqp-item-actions';
		actions.appendChild(deleteBtn);
		itemEl.appendChild(actions);

		// Click handler - execute saved search
		itemEl.addEventListener('click', function(e) {
			e.preventDefault();
			executeSavedSearch(savedSearch.id);
		});

		// Hover handler
		itemEl.addEventListener('mouseenter', function() {
			var allItems = state.elements.results.querySelectorAll('.wpqp-item');
			var index = Array.prototype.indexOf.call(allItems, itemEl);
			selectItem(index);
		});

		return itemEl;
	}

	/**
	 * Delete a saved search via AJAX.
	 */
	function deleteSavedSearch(searchId) {
		var formData = new FormData();
		formData.append('action', 'wpqp_delete_saved_search');
		formData.append('_ajax_nonce', wpqpData.nonce);
		formData.append('search_id', searchId);

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
		.then(function(r) { return r.json(); })
		.then(function(data) {
			if ( data.success && data.data && data.data.saved_searches ) {
				state.savedSearches = data.data.saved_searches;
				renderProSections();
			}
		})
		.catch(function(err) {
			console.error('WPQP delete saved search error:', err);
		});
	}

	/**
	 * Execute a saved search via AJAX.
	 */
	function executeSavedSearch(searchId) {
		var formData = new FormData();
		formData.append('action', 'wpqp_execute_saved_search');
		formData.append('_ajax_nonce', wpqpData.nonce);
		formData.append('search_id', searchId);

		renderLoading();

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
		.then(function(response) {
			if ( ! response.ok ) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then(function(data) {
			if ( data.success && data.data ) {
				state.searchTerm = data.data.meta.query || '';
				state.elements.input.value = state.searchTerm;
				state.results = data.data.results || {};
				hidePanels();
				renderResults(state.results);
			} else {
				renderError(data.data && data.data.message ? data.data.message : 'An error occurred');
			}
		})
		.catch(function(error) {
			console.error('WPQP execute saved search error:', error);
			renderError('Failed to execute saved search. Please try again.');
		});
	}

	/**
	 * Create a star toggle button.
	 */
	function createStarButton(item, isStarred) {
		var btn = document.createElement('button');
		btn.className = 'wpqp-star-btn' + (isStarred ? ' wpqp-star-btn--active' : '');
		btn.setAttribute('type', 'button');
		btn.setAttribute('aria-label', isStarred ? 'Remove from favorites' : 'Add to favorites');
		btn.innerHTML = isStarred
			? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
			: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

		btn.addEventListener('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			toggleFavorite(item, btn);
		});

		return btn;
	}

	/**
	 * Toggle favorite via AJAX.
	 */
	function toggleFavorite(item, btn) {
		var formData = new FormData();
		formData.append('action', 'wpqp_toggle_favorite');
		formData.append('_ajax_nonce', wpqpData.nonce);
		formData.append('type', item.type);
		formData.append('id', item.id);
		formData.append('title', item.title || '');
		formData.append('edit_url', item.edit_url || '');

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
		.then(function(r) { return r.json(); })
		.then(function(data) {
			if ( data.success && data.data ) {
				state.favorites = data.data.favorites || [];
				var isNowFav = data.data.action === 'added';

				btn.className = 'wpqp-star-btn' + (isNowFav ? ' wpqp-star-btn--active' : '');
				btn.innerHTML = isNowFav
					? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
					: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
				btn.setAttribute('aria-label', isNowFav ? 'Remove from favorites' : 'Add to favorites');

				// Re-render panels if showing
				if ( state.searchTerm === '' ) {
					renderPanels();
				}
			}
		})
		.catch(function(err) {
			console.error('WPQP toggle favorite error:', err);
		});
	}

	/**
	 * Check if an item is in favorites.
	 */
	function isItemFavorited(type, id) {
		for ( var i = 0; i < state.favorites.length; i++ ) {
			if ( state.favorites[i].type === type && parseInt(state.favorites[i].id, 10) === parseInt(id, 10) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Record a history entry via AJAX.
	 */
	function recordHistory(item) {
		var formData = new FormData();
		formData.append('action', 'wpqp_record_history');
		formData.append('_ajax_nonce', wpqpData.nonce);
		formData.append('type', item.type);
		formData.append('id', item.id);
		formData.append('title', item.title || '');
		formData.append('edit_url', item.edit_url || '');

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		}).catch(function() {
			// Fire and forget
		});
	}

	/**
	 * Show save search dialog.
	 */
	function showSaveSearchDialog() {
		var term = state.searchTerm.trim();
		if ( term.length === 0 ) {
			return;
		}

		var label = prompt('Enter a name for this saved search:');
		if ( label && label.trim() ) {
			saveSearch(label.trim(), term);
		}
	}

	/**
	 * Save search via AJAX.
	 */
	function saveSearch(label, query) {
		var formData = new FormData();
		formData.append('action', 'wpqp_save_search');
		formData.append('_ajax_nonce', wpqpData.nonce);
		formData.append('label', label);
		formData.append('query', query);
		formData.append('search_type', state.activeSearchType);

		fetch(wpqpData.ajaxUrl, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
		.then(function(r) { return r.json(); })
		.then(function(data) {
			if ( data.success && data.data && data.data.saved_searches ) {
				state.savedSearches = data.data.saved_searches;
				state.elements.announce.textContent = 'Search "' + label + '" saved';
			}
		})
		.catch(function(err) {
			console.error('WPQP save search error:', err);
		});
	}

	/**
	 * Get relative time string from Unix timestamp.
	 */
	function getRelativeTime(timestamp) {
		if ( typeof timestamp === 'string' ) {
			timestamp = new Date(timestamp).getTime() / 1000;
		}

		var now = Math.floor(Date.now() / 1000);
		var diff = now - parseInt(timestamp, 10);

		if ( diff < 60 ) {
			return 'Just now';
		}

		var minutes = Math.floor(diff / 60);
		if ( minutes < 60 ) {
			return minutes + (minutes === 1 ? ' min ago' : ' mins ago');
		}

		var hours = Math.floor(minutes / 60);
		if ( hours < 24 ) {
			return hours + (hours === 1 ? ' hour ago' : ' hours ago');
		}

		var days = Math.floor(hours / 24);
		if ( days < 30 ) {
			return days + (days === 1 ? ' day ago' : ' days ago');
		}

		var months = Math.floor(days / 30);
		return months + (months === 1 ? ' month ago' : ' months ago');
	}

	/* =====================================================================
	   Inline Search Bar (Pro)
	   ===================================================================== */

	/**
	 * Initialize inline search bar.
	 */
	function initInlineSearch() {
		var root = document.getElementById('wpqp-inline-search-root');
		if ( ! root ) { return; }

		var input = root.querySelector('.wpqp-inline-input');
		var dropdown = root.querySelector('.wpqp-inline-dropdown');
		if ( ! input || ! dropdown ) { return; }

		var inlineDebounceTimer = null;
		var inlineRequestId = 0;
		var inlineSelectedIndex = -1;

		input.addEventListener('input', function(e) {
			var term = e.target.value.trim();
			if ( inlineDebounceTimer ) { clearTimeout(inlineDebounceTimer); }

			if ( term.length === 0 ) {
				closeInlineDropdown();
				return;
			}

			inlineDebounceTimer = setTimeout(function() {
				performInlineSearch(term);
			}, 300);
		});

		input.addEventListener('keydown', function(e) {
			if ( e.key === 'Escape' ) {
				closeInlineDropdown();
				input.blur();
				return;
			}
			if ( e.key === 'Enter' ) {
				e.preventDefault();
				var selectedItem = dropdown.querySelector('.wpqp-inline-item--selected');
				if ( selectedItem && selectedItem._wpqpItem ) {
					navigateToItem(selectedItem._wpqpItem);
				} else if ( input.value.trim().length > 0 ) {
					openPalette();
					state.elements.input.value = input.value;
					handleInput({ target: state.elements.input });
					closeInlineDropdown();
				}
				return;
			}
			if ( e.key === 'ArrowDown' || e.key === 'ArrowUp' ) {
				e.preventDefault();
				navigateInlineItems(e.key === 'ArrowDown' ? 1 : -1);
			}
		});

		document.addEventListener('click', function(e) {
			if ( ! e.target.closest('#wpqp-inline-search-root') ) {
				closeInlineDropdown();
			}
		});

		function performInlineSearch(term) {
			inlineRequestId++;
			var currentId = inlineRequestId;

			var formData = new FormData();
			formData.append('action', 'wpqp_search');
			formData.append('_ajax_nonce', wpqpData.nonce);
			formData.append('q', term);
			formData.append('context', 'inline');

			fetch(wpqpData.ajaxUrl, {
				method: 'POST',
				body: formData,
				credentials: 'same-origin'
			})
			.then(function(r) { return r.json(); })
			.then(function(data) {
				if ( currentId !== inlineRequestId ) { return; }
				if ( data.success && data.data && data.data.results ) {
					renderInlineResults(data.data.results);
				}
			})
			.catch(function() {});
		}

		function renderInlineResults(results) {
			dropdown.innerHTML = '';
			var hasResults = false;

			for ( var key in results ) {
				if ( results.hasOwnProperty(key) && results[key].length > 0 ) {
					hasResults = true;
					results[key].forEach(function(item) {
						var el = document.createElement('div');
						el.className = 'wpqp-inline-item';
						el._wpqpItem = item;

						var title = document.createElement('span');
						title.className = 'wpqp-inline-item-title';
						title.textContent = item.title;

						var type = document.createElement('span');
						type.className = 'wpqp-inline-item-type';
						type.textContent = getPostTypeSingularLabel(item.type);

						el.appendChild(title);
						el.appendChild(type);

						el.addEventListener('click', function() {
							navigateToItem(item);
						});

						el.addEventListener('mouseenter', function() {
							var items = dropdown.querySelectorAll('.wpqp-inline-item');
							items.forEach(function(it) { it.classList.remove('wpqp-inline-item--selected'); });
							el.classList.add('wpqp-inline-item--selected');
						});

						dropdown.appendChild(el);
					});
				}
			}

			if ( ! hasResults ) {
				var empty = document.createElement('div');
				empty.className = 'wpqp-inline-empty';
				empty.textContent = 'No results found';
				dropdown.appendChild(empty);
			}

			var seeAll = document.createElement('div');
			seeAll.className = 'wpqp-inline-see-all';
			seeAll.textContent = 'See all results...';
			seeAll.addEventListener('click', function() {
				openPalette();
				state.elements.input.value = input.value;
				handleInput({ target: state.elements.input });
				closeInlineDropdown();
			});
			dropdown.appendChild(seeAll);

			openInlineDropdown();
		}

		function navigateInlineItems(direction) {
			var items = dropdown.querySelectorAll('.wpqp-inline-item');
			if ( items.length === 0 ) { return; }

			items.forEach(function(it) { it.classList.remove('wpqp-inline-item--selected'); });

			inlineSelectedIndex += direction;
			if ( inlineSelectedIndex >= items.length ) { inlineSelectedIndex = 0; }
			if ( inlineSelectedIndex < 0 ) { inlineSelectedIndex = items.length - 1; }

			items[inlineSelectedIndex].classList.add('wpqp-inline-item--selected');
			items[inlineSelectedIndex].scrollIntoView({ block: 'nearest' });
		}

		function openInlineDropdown() {
			dropdown.style.display = 'block';
			dropdown.setAttribute('aria-hidden', 'false');
			inlineSelectedIndex = -1;
		}

		function closeInlineDropdown() {
			dropdown.style.display = 'none';
			dropdown.setAttribute('aria-hidden', 'true');
			dropdown.innerHTML = '';
			inlineSelectedIndex = -1;
		}
	}

	// Initialize on DOM ready
	if ( document.readyState === 'loading' ) {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();
