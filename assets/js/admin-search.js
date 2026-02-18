/**
 * WP Quick Palette - Search Module
 * Handles input, debounce, AJAX search, result rendering, and utility helpers.
 *
 * @package WPQP
 */

( function( WPQP ) {
	'use strict';

	if ( ! WPQP || WPQP._disabled ) {
		return;
	}

	// =========================================================================
	// Input Handling
	// =========================================================================

	/**
	 * Handle input event with debouncing.
	 */
	WPQP.handleInput = function( e ) {
		var term = e.target.value.trim();
		WPQP.state.searchTerm = term;

		// Check for search prefix (c:, u:, a:, content:, users:, admin:)
		var prefixResult = WPQP.detectSearchPrefix( term );
		if ( prefixResult.prefixFound && prefixResult.searchType !== WPQP.state.activeSearchType ) {
			WPQP.switchSearchType( prefixResult.searchType );
			term = prefixResult.cleanTerm;
		}

		// Clear existing debounce timer
		if ( WPQP.state.debounceTimer ) {
			clearTimeout( WPQP.state.debounceTimer );
		}

		// Show tabs based on Pro/Lite
		if ( wpqpData.isPro ) {
			WPQP.showSearchTabs( true );
		} else {
			WPQP.showSearchTabs( false );
		}

		// Show/hide save search button based on query and Pro status
		if ( WPQP.state.elements.saveSearchBtn ) {
			WPQP.state.elements.saveSearchBtn.style.display =
				( wpqpData.isPro && term.length > 0 ) ? 'flex' : 'none';
		}

		if ( term.length > 0 ) {
			WPQP.state.elements.results.style.display = 'flex';
			WPQP.renderLoading();
		} else {
			// Empty query — show panels
			WPQP.state.elements.results.style.display = 'flex';
			WPQP.state.elements.results.classList.remove( 'has-results' );
			if ( wpqpData.isPro ) {
				WPQP.renderProSections();
			} else {
				WPQP.renderPanels();
			}
			WPQP.state.selectedIndex = -1;
			WPQP.state.flatItems    = [];
		}

		// Debounce search (min 2 chars to match backend requirement)
		WPQP.state.debounceTimer = setTimeout( function() {
			if ( term.length >= 2 ) {
				WPQP.performSearch( term, WPQP.state.activeSearchType );
			} else if ( term.length === 1 ) {
				WPQP.renderHint( 'Type at least 2 characters to search' );
			}
		}, 300 );
	};

	/**
	 * Detect search prefix and return appropriate search type.
	 */
	WPQP.detectSearchPrefix = function( term ) {
		var lowerTerm = term.toLowerCase().trim();

		if ( lowerTerm.indexOf( 'c:' ) === 0 || lowerTerm.indexOf( 'content:' ) === 0 ) {
			return {
				prefixFound: true,
				searchType:  'content',
				cleanTerm:   term.substring( term.indexOf( ':' ) + 1 ).trim()
			};
		}
		if ( lowerTerm.indexOf( 'u:' ) === 0 || lowerTerm.indexOf( 'users:' ) === 0 ) {
			return {
				prefixFound: true,
				searchType:  'users',
				cleanTerm:   term.substring( term.indexOf( ':' ) + 1 ).trim()
			};
		}
		if ( lowerTerm.indexOf( 'a:' ) === 0 || lowerTerm.indexOf( 'admin:' ) === 0 ) {
			return {
				prefixFound: true,
				searchType:  'admin',
				cleanTerm:   term.substring( term.indexOf( ':' ) + 1 ).trim()
			};
		}

		return {
			prefixFound: false,
			searchType:  WPQP.state.activeSearchType,
			cleanTerm:   term
		};
	};

	/**
	 * Switch search type tab.
	 */
	WPQP.switchSearchType = function( searchType ) {
		WPQP.state.activeSearchType = searchType;
		WPQP.updateSearchTabsUI();

		// Re-run search if there's a search term
		if ( WPQP.state.searchTerm.length > 0 ) {
			var prefixResult = WPQP.detectSearchPrefix( WPQP.state.searchTerm );
			var term = prefixResult.cleanTerm || WPQP.state.searchTerm;
			WPQP.performSearch( term, searchType );
		}
	};

	/**
	 * Update search tabs UI to reflect active tab.
	 */
	WPQP.updateSearchTabsUI = function() {
		var tabs = WPQP.state.elements.searchTabs.querySelectorAll( '.wpqp-search-tab' );
		tabs.forEach( function( tab ) {
			var tabType = tab.getAttribute( 'data-search-type' );
			if ( tabType === WPQP.state.activeSearchType ) {
				tab.classList.add( 'wpqp-search-tab--active' );
			} else {
				tab.classList.remove( 'wpqp-search-tab--active' );
			}
		} );
	};

	/**
	 * Show or hide search tabs.
	 */
	WPQP.showSearchTabs = function( show ) {
		if ( wpqpData.isPro ) {
			WPQP.state.elements.searchTabs.style.display = show ? 'flex' : 'none';
		} else {
			WPQP.state.elements.searchTabs.style.display = 'none';
		}
	};

	/**
	 * Hide panels (history, favorites, panels container).
	 */
	WPQP.hidePanels = function() {
		if ( WPQP.state.elements.historyPanel ) {
			WPQP.state.elements.historyPanel.style.display = 'none';
		}
		if ( WPQP.state.elements.favoritesPanel ) {
			WPQP.state.elements.favoritesPanel.style.display = 'none';
		}
		if ( WPQP.state.elements.panelsContainer ) {
			WPQP.state.elements.panelsContainer.style.display = 'none';
		}
	};

	/**
	 * Load panel data (history, favorites, saved searches).
	 */
	WPQP.loadPanelData = function( callback ) {
		if ( wpqpData.isPro ) {
			WPQP.loadProData( callback );
			return;
		}
		WPQP.loadLitePanelData( callback );
	};

	/**
	 * Load Lite panel data (history + favorites).
	 */
	WPQP.loadLitePanelData = function( callback ) {
		var completed = 0;
		var total     = 2;

		function checkDone() {
			completed++;
			if ( completed >= total ) {
				WPQP.state.proDataLoaded = true;
				if ( callback ) { callback(); }
			}
		}

		// Fetch favorites
		var favData = new FormData();
		favData.append( 'action', 'wpqp_get_favorites' );
		favData.append( '_ajax_nonce', wpqpData.nonce );

		fetch( wpqpData.ajaxUrl, { method: 'POST', body: favData, credentials: 'same-origin' } )
			.then( function( r ) { return r.json(); } )
			.then( function( data ) {
				if ( data.success && data.data && data.data.favorites ) {
					WPQP.state.favorites = data.data.favorites;
				}
				checkDone();
			} )
			.catch( function() { checkDone(); } );

		// Fetch history
		var histData = new FormData();
		histData.append( 'action', 'wpqp_get_history' );
		histData.append( '_ajax_nonce', wpqpData.nonce );

		fetch( wpqpData.ajaxUrl, { method: 'POST', body: histData, credentials: 'same-origin' } )
			.then( function( r ) { return r.json(); } )
			.then( function( data ) {
				if ( data.success && data.data && data.data.history ) {
					WPQP.state.history = data.data.history;
				}
				checkDone();
			} )
			.catch( function() { checkDone(); } );
	};

	// =========================================================================
	// AJAX Search
	// =========================================================================

	/**
	 * Perform AJAX search.
	 */
	WPQP.performSearch = function( term, searchType ) {
		WPQP.state.requestId++;
		var currentRequestId = WPQP.state.requestId;

		// Abort previous request if still pending
		if ( WPQP.state.searchAbortController ) {
			WPQP.state.searchAbortController.abort();
		}

		var formData = new FormData();
		formData.append( 'action', 'wpqp_search' );
		formData.append( '_ajax_nonce', wpqpData.nonce );
		formData.append( 'q', term );
		formData.append( 'search_type', searchType || 'content' );
		formData.append( 'context', 'palette' );

		var fetchOptions = {
			method:      'POST',
			body:        formData,
			credentials: 'same-origin'
		};

		// Use AbortController for timeout if available
		if ( typeof AbortController !== 'undefined' ) {
			WPQP.state.searchAbortController = new AbortController();
			fetchOptions.signal = WPQP.state.searchAbortController.signal;
			setTimeout( function() {
				if ( WPQP.state.searchAbortController ) {
					WPQP.state.searchAbortController.abort();
				}
			}, 10000 );
		}

		fetch( wpqpData.ajaxUrl, fetchOptions )
			.then( function( response ) {
				if ( ! response.ok ) {
					throw new Error( 'Network response was not ok' );
				}
				return response.json();
			} )
			.then( function( data ) {
				WPQP.state.searchAbortController = null;

				// Ignore stale responses
				if ( currentRequestId !== WPQP.state.requestId ) {
					return;
				}

				if ( data.success && data.data ) {
					WPQP.state.results = data.data.results || {};
					WPQP.renderResults( WPQP.state.results );
				} else {
					WPQP.renderError( data.data && data.data.message ? data.data.message : 'An error occurred' );
				}
			} )
			.catch( function( error ) {
				WPQP.state.searchAbortController = null;

				if ( currentRequestId !== WPQP.state.requestId ) {
					return;
				}

				if ( error && error.name === 'AbortError' ) {
					WPQP.renderError( 'Search timed out. Please try again.' );
					return;
				}

				WPQP.renderError( 'Failed to perform search. Please try again.' );
			} );
	};

	// =========================================================================
	// Result Rendering
	// =========================================================================

	/**
	 * Render search results with count heading.
	 */
	WPQP.renderResults = function( results ) {
		var resultsContainer = WPQP.state.elements.results;
		if ( ! resultsContainer ) {
			return;
		}

		resultsContainer.style.display = 'flex';
		resultsContainer.classList.add( 'has-results' );
		resultsContainer.innerHTML = '';

		// Reset item counter
		WPQP.itemIdCounter = 0;

		// Check if results is empty
		var hasResults = false;
		var totalCount = 0;
		for ( var key in results ) {
			if ( results.hasOwnProperty( key ) && results[ key ].length > 0 ) {
				hasResults = true;
				totalCount += results[ key ].length;
			}
		}

		if ( ! hasResults ) {
			WPQP.renderEmpty();
			return;
		}

		// Flatten results for navigation
		WPQP.state.flatItems    = WPQP.flattenResults( results );
		WPQP.state.selectedIndex = -1;

		// Results count heading (outside scroll wrapper)
		var countHeading = document.createElement( 'div' );
		countHeading.className = 'wpqp-results-heading';
		countHeading.textContent = 'Search Results (' + totalCount + ')';
		resultsContainer.appendChild( countHeading );

		// Scrollable wrapper for result items
		var scrollWrapper = document.createElement( 'div' );
		scrollWrapper.className = 'wpqp-results-scroll';
		resultsContainer.appendChild( scrollWrapper );

		// Render groups
		for ( var postType in results ) {
			if ( ! results.hasOwnProperty( postType ) || results[ postType ].length === 0 ) {
				continue;
			}

			var group = document.createElement( 'div' );
			group.className = 'wpqp-group';

			results[ postType ].forEach( function( item ) {
				var itemEl = WPQP.createResultItem( item );
				group.appendChild( itemEl );
			} );

			scrollWrapper.appendChild( group );
		}

		// Update ARIA
		WPQP.state.elements.input.setAttribute( 'aria-expanded', 'true' );
		WPQP.state.elements.announce.textContent = totalCount + ' results found';
	};

	/**
	 * Flatten grouped results into a single array.
	 */
	WPQP.flattenResults = function( results ) {
		var flat = [];
		for ( var postType in results ) {
			if ( results.hasOwnProperty( postType ) ) {
				flat = flat.concat( results[ postType ] );
			}
		}
		return flat;
	};

	/**
	 * Create a result item element.
	 */
	WPQP.createResultItem = function( item ) {
		var itemEl = document.createElement( 'div' );
		itemEl.className = 'wpqp-item';
		itemEl.setAttribute( 'role', 'option' );
		itemEl.setAttribute( 'data-id', item.id );
		itemEl.setAttribute( 'data-type', item.type );
		itemEl.id = 'wpqp-item-' + ( WPQP.itemIdCounter++ );

		// Store item data for keyboard nav
		itemEl._wpqpItem = item;

		var content = document.createElement( 'div' );
		content.className = 'wpqp-item-content';

		var title = document.createElement( 'div' );
		title.className = 'wpqp-item-title';
		title.textContent = WPQP.decodeHtmlEntities( item.title );

		var meta = document.createElement( 'div' );
		meta.className = 'wpqp-item-meta';

		// Post type badge
		var typeBadge = document.createElement( 'span' );
		typeBadge.className = 'wpqp-item-type';
		typeBadge.textContent = WPQP.getPostTypeSingularLabel( item.type );

		// Status badge
		var statusMap = {
			'publish':  'Published',
			'draft':    'Draft',
			'pending':  'Pending',
			'private':  'Private',
			'future':   'Scheduled',
			'trash':    'Trash',
			'disabled': 'Disabled',
			'expired':  'Expired'
		};
		var statusText  = statusMap[ item.status ] || 'Published';
		var statusClass = 'wpqp-item-status--' + ( item.status || 'publish' );
		var statusBadge = document.createElement( 'span' );
		statusBadge.className = 'wpqp-item-status ' + statusClass;
		statusBadge.textContent = statusText;

		meta.appendChild( typeBadge );
		meta.appendChild( statusBadge );

		content.appendChild( title );
		content.appendChild( meta );
		itemEl.appendChild( content );

		// Right side: Actions container
		var actions = document.createElement( 'div' );
		actions.className = 'wpqp-item-actions';

		// Open in new tab button
		var newTabBtn = document.createElement( 'button' );
		newTabBtn.className = 'wpqp-item-newtab';
		newTabBtn.setAttribute( 'aria-label', 'Open in new tab' );
		newTabBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
		newTabBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			e.stopPropagation();
			WPQP.openInNewTab( item );
		} );

		// Copy button (three-dots menu)
		var copyBtn = document.createElement( 'button' );
		copyBtn.className = 'wpqp-copy-btn';
		copyBtn.setAttribute( 'aria-label', 'Copy options' );
		copyBtn.setAttribute( 'aria-expanded', 'false' );
		copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>';
		copyBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			e.stopPropagation();
			WPQP.toggleCopyMenu( copyBtn, item );
		} );

		actions.appendChild( newTabBtn );
		actions.appendChild( copyBtn );
		itemEl.appendChild( actions );

		// Star button (Pro)
		if ( wpqpData.isPro ) {
			var isStarred = WPQP.isItemFavorited( item.type, item.id );
			var starBtn   = WPQP.createStarButton( item, isStarred );
			itemEl.appendChild( starBtn );
		}

		// Click handler
		itemEl.addEventListener( 'click', function( e ) {
			if (
				e.target.closest( '.wpqp-item-actions' ) ||
				( wpqpData.isPro && e.target.closest( '.wpqp-star-btn' ) )
			) {
				return;
			}
			WPQP.navigateToItem( item );
		} );

		// Hover handler
		itemEl.addEventListener( 'mouseenter', function() {
			var allItems = WPQP.state.elements.results.querySelectorAll( '.wpqp-item' );
			var index    = Array.prototype.indexOf.call( allItems, itemEl );
			WPQP.selectItem( index );
		} );

		return itemEl;
	};

	// =========================================================================
	// State Rendering
	// =========================================================================

	/**
	 * Render loading state.
	 */
	WPQP.renderLoading = function() {
		var resultsContainer = WPQP.state.elements.results;
		if ( ! resultsContainer ) { return; }
		resultsContainer.innerHTML = '<div class="wpqp-loading"><span class="wpqp-spinner"></span><span>Searching...</span></div>';
	};

	/**
	 * Render empty state.
	 */
	WPQP.renderEmpty = function() {
		var resultsContainer = WPQP.state.elements.results;
		if ( ! resultsContainer ) { return; }
		resultsContainer.innerHTML = '<div class="wpqp-empty">No results found</div>';
		WPQP.state.elements.input.setAttribute( 'aria-expanded', 'false' );
	};

	/**
	 * Render error state.
	 */
	WPQP.renderError = function( message ) {
		var resultsContainer = WPQP.state.elements.results;
		if ( ! resultsContainer ) { return; }
		resultsContainer.innerHTML = '<div class="wpqp-error">' + WPQP.escapeHtml( message ) + '</div>';
	};

	/**
	 * Render hint message (e.g. min char requirement).
	 */
	WPQP.renderHint = function( message ) {
		var resultsContainer = WPQP.state.elements.results;
		if ( ! resultsContainer ) { return; }
		resultsContainer.innerHTML = '<div class="wpqp-hint">' + WPQP.escapeHtml( message ) + '</div>';
	};

	// =========================================================================
	// Utility Helpers
	// =========================================================================

	/**
	 * Escape HTML to prevent XSS.
	 */
	WPQP.escapeHtml = function( text ) {
		var div = document.createElement( 'div' );
		div.textContent = text;
		return div.innerHTML;
	};

	/**
	 * Decode HTML entities.
	 */
	WPQP.decodeHtmlEntities = function( text ) {
		if ( ! text || typeof text !== 'string' ) {
			return '';
		}
		if ( text.indexOf( '&' ) === -1 ) {
			return text;
		}
		var doc = new DOMParser().parseFromString( text, 'text/html' );
		return doc.body.textContent || '';
	};

	/**
	 * Get singular post type label.
	 */
	WPQP.getPostTypeSingularLabel = function( postType ) {
		var labels = {
			'post':       'Post',
			'page':       'Page',
			'product':    'Product',
			'attachment': 'Media',
			'user':       'User',
			'admin':      'Admin'
		};
		return labels[ postType ] || postType.charAt( 0 ).toUpperCase() + postType.slice( 1 );
	};

} )( window.WPQP );
