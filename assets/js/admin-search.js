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
		if ( prefixResult.prefixFound ) {
			term = prefixResult.cleanTerm; // always strip prefix before sending to backend
			if ( prefixResult.searchType !== WPQP.state.activeSearchType ) {
				WPQP.switchSearchType( prefixResult.searchType );
			}
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
			// Empty query — fade out any existing results then show panels
			WPQP.state.elements.results.style.display = 'flex';
			WPQP.state.elements.results.classList.remove( 'has-results' );
			WPQP.state.selectedIndex = -1;
			WPQP.state.flatItems    = [];

			var resultsEl = WPQP.state.elements.results;
			var exitItems = Array.prototype.slice.call( resultsEl.querySelectorAll( '.wpqp-item' ) );

			if ( exitItems.length > 0 ) {
				// Read timing from CSS vars
				var exitDuration = parseFloat( getComputedStyle( document.documentElement ).getPropertyValue( '--wpqp-duration-fade' ) ) * 1000 || 200;
				var exitStep     = parseFloat( getComputedStyle( document.documentElement ).getPropertyValue( '--wpqp-stagger-step' ) ) || 20;
				var exitCap      = 6;
				var exitAnim     = 'wpqp-content-out ' + ( exitDuration / 1000 ) + 's ease both';

				// Stagger-animate the heading out with the first item
				var exitHeading = resultsEl.querySelector( '.wpqp-results-heading' );
				if ( exitHeading ) {
					exitHeading.style.animation = exitAnim;
				}

				// Stagger each item out top-to-bottom
				exitItems.forEach( function( item, i ) {
					item.style.animation      = exitAnim;
					item.style.animationDelay = ( Math.min( i, exitCap ) * exitStep ) + 'ms';
				} );

				// Wait for the last item's animation to finish, then render panels
				var totalExitMs = Math.min( exitItems.length - 1, exitCap ) * exitStep + exitDuration;
				setTimeout( function() {
					if ( wpqpData.isPro ) {
						WPQP.renderProSections();
					} else {
						WPQP.renderPanels();
					}
				}, totalExitMs );
			} else {
				// No result items visible (loading / hint / empty) — swap immediately
				if ( wpqpData.isPro ) {
					WPQP.renderProSections();
				} else {
					WPQP.renderPanels();
				}
			}
		}

		// Debounce search (min 2 chars normally; direct search allows 1 char for #ID).
		WPQP.state.debounceTimer = setTimeout( function() {
			var isDirect = WPQP.state.activeSearchType === 'direct';
			if ( term.length >= 2 || ( isDirect && term.length >= 1 ) ) {
				WPQP.performSearch( term, WPQP.state.activeSearchType );
			} else if ( term.length === 1 && ! isDirect ) {
				WPQP.renderHint( wpqpData.strings.typeMore );
			}
		}, 300 );
	};

	/**
	 * Detect search prefix and return appropriate search type.
	 */
	WPQP.detectSearchPrefix = function( term ) {
		var lowerTerm = term.toLowerCase().trim();

		// #123 — direct post ID lookup.
		if ( /^#\d+$/.test( term.trim() ) ) {
			return {
				prefixFound: true,
				searchType:  'direct',
				cleanTerm:   term.trim().substring( 1 )
			};
		}

		// /slug — direct slug lookup (at least one char after the slash).
		if ( term.trim().charAt( 0 ) === '/' && term.trim().length > 1 ) {
			return {
				prefixFound: true,
				searchType:  'direct',
				cleanTerm:   term.trim().substring( 1 )
			};
		}

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
			WPQP.state.elements.panelsContainer.classList.remove( 'wpqp-visible' );
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
	 * Perform client-side admin menu search.
	 *
	 * The admin menu is pre-loaded into wpqpData.adminMenu during the page
	 * load (when $menu/$submenu are populated). AJAX requests can't access
	 * those globals, so we search locally instead.
	 */
	WPQP.performAdminSearch = function( term ) {
		WPQP.state.lastSearchTerm = term;
		var items    = ( wpqpData.adminMenu && wpqpData.adminMenu.length ) ? wpqpData.adminMenu : [];
		var lower    = term.toLowerCase();
		// Derive admin base URL from the known ajaxUrl
		var adminBase = wpqpData.ajaxUrl.replace( 'admin-ajax.php', '' );

		var matched = [];
		var seen    = {};

		items.forEach( function( item ) {
			if ( ! item.title || item.title.toLowerCase().indexOf( lower ) === -1 ) {
				return;
			}

			var url     = item.url || '';
			var editUrl = ( url.indexOf( 'http' ) === 0 ) ? url : adminBase + url;

			if ( seen[ editUrl ] ) {
				return;
			}
			seen[ editUrl ] = true;

			matched.push( {
				type:     'admin',
				id:       url || item.title, // store raw URL slug as id for DashboardWidget
				title:    item.title,
				edit_url: editUrl,
				parent:   item.parent || '',
			} );
		} );

		if ( matched.length === 0 ) {
			WPQP.renderEmpty();
			return;
		}

		WPQP.renderResults( { admin: matched } );
	};

	/**
	 * Perform AJAX search.
	 */
	WPQP.performSearch = function( term, searchType ) {
		// Admin search is fully client-side — menu data is pre-loaded in wpqpData.adminMenu.
		if ( 'admin' === searchType ) {
			WPQP.performAdminSearch( term );
			return;
		}

		WPQP.state.lastSearchTerm = term;
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
					WPQP.renderError( data.data && data.data.message ? data.data.message : wpqpData.strings.searchError );
				}
			} )
			.catch( function( error ) {
				WPQP.state.searchAbortController = null;

				if ( currentRequestId !== WPQP.state.requestId ) {
					return;
				}

				if ( error && error.name === 'AbortError' ) {
					WPQP.renderError( wpqpData.strings.searchTimeout );
					return;
				}

				WPQP.renderError( wpqpData.strings.searchFailed );
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

		// Reset type filter state
		WPQP.state.activeTypeFilter = 'all';

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
		countHeading.textContent = wpqpData.strings.searchResults + ' (' + totalCount + ')';
		resultsContainer.appendChild( countHeading );

		// Collect groups that have results
		var groupKeys = [];
		for ( var gk in results ) {
			if ( results.hasOwnProperty( gk ) && results[ gk ].length > 0 ) {
				groupKeys.push( gk );
			}
		}

		// Scrollable wrapper for result items (declared here so filter chips can reference it)
		var scrollWrapper = document.createElement( 'div' );
		scrollWrapper.className = 'wpqp-results-scroll';

		// Type filter chips — only shown when 2+ groups have results
		if ( groupKeys.length >= 2 ) {
			var filtersBar = document.createElement( 'div' );
			filtersBar.className = 'wpqp-type-filters';

			// "All" chip
			var allChip = document.createElement( 'button' );
			allChip.className = 'wpqp-filter-chip wpqp-filter-chip--active';
			allChip.setAttribute( 'data-filter', 'all' );
			allChip.textContent = wpqpData.strings ? wpqpData.strings.filterAll : 'All';
			( function( fb, sw ) {
				allChip.addEventListener( 'click', function() {
					WPQP.setTypeFilter( 'all', fb, sw );
				} );
			} )( filtersBar, scrollWrapper );
			filtersBar.appendChild( allChip );

			// One chip per type
			groupKeys.forEach( function( postType ) {
				var chip = document.createElement( 'button' );
				chip.className = 'wpqp-filter-chip';
				chip.setAttribute( 'data-filter', postType );
				chip.textContent = WPQP.getPostTypeSingularLabel( postType ) + ' (' + results[ postType ].length + ')';
				( function( pt, fb, sw ) {
					chip.addEventListener( 'click', function() {
						WPQP.setTypeFilter( pt, fb, sw );
					} );
				} )( postType, filtersBar, scrollWrapper );
				filtersBar.appendChild( chip );
			} );

			resultsContainer.appendChild( filtersBar );
		}

		resultsContainer.appendChild( scrollWrapper );

		// Read stagger timing from CSS vars
		var staggerStep = parseFloat( getComputedStyle( document.documentElement ).getPropertyValue( '--wpqp-stagger-step' ) ) || 20;
		var staggerIdx  = 0;
		var staggerCap  = 8; // beyond this index all items share the same delay

		// Render groups
		for ( var postType in results ) {
			if ( ! results.hasOwnProperty( postType ) || results[ postType ].length === 0 ) {
				continue;
			}

			var group = document.createElement( 'div' );
			group.className = 'wpqp-group';
			group.setAttribute( 'data-post-type', postType );

			// Group heading with post type label and count
			var groupHeading = document.createElement( 'div' );
			groupHeading.className = 'wpqp-group-heading';
			groupHeading.textContent = WPQP.getPostTypeSingularLabel( postType ) + ' (' + results[ postType ].length + ')';
			group.appendChild( groupHeading );

			results[ postType ].forEach( function( item ) {
				var itemEl = WPQP.createResultItem( item );
				itemEl.style.animationDelay = ( Math.min( staggerIdx, staggerCap ) * staggerStep ) + 'ms';
				staggerIdx++;
				group.appendChild( itemEl );
			} );

			scrollWrapper.appendChild( group );
		}

		// Update ARIA
		WPQP.state.elements.input.setAttribute( 'aria-expanded', 'true' );
		WPQP.state.elements.announce.textContent = totalCount + ' ' + wpqpData.strings.resultsFound;
	};

	/**
	 * Set the active type filter and show/hide groups accordingly.
	 */
	WPQP.setTypeFilter = function( type, filtersBar, scrollWrapper ) {
		WPQP.state.activeTypeFilter = type;

		// Update chip active states
		var chips = filtersBar.querySelectorAll( '.wpqp-filter-chip' );
		chips.forEach( function( chip ) {
			if ( chip.getAttribute( 'data-filter' ) === type ) {
				chip.classList.add( 'wpqp-filter-chip--active' );
			} else {
				chip.classList.remove( 'wpqp-filter-chip--active' );
			}
		} );

		// Show/hide groups
		var groups = scrollWrapper.querySelectorAll( '.wpqp-group' );
		groups.forEach( function( group ) {
			if ( type === 'all' || group.getAttribute( 'data-post-type' ) === type ) {
				group.style.display = '';
			} else {
				group.style.display = 'none';
			}
		} );
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
		var decodedTitle  = WPQP.decodeHtmlEntities( item.title );
		var cleanTerm     = WPQP.state.lastSearchTerm || '';
		var highlighted   = cleanTerm.length >= 2 ? WPQP.highlightMatch( decodedTitle, cleanTerm ) : null;
		if ( highlighted ) {
			title.appendChild( highlighted );
		} else {
			title.textContent = decodedTitle;
		}

		// Comment subtitle: "by Author on 'Post Title'"
		if ( item.comment_author || item.parent_post_title ) {
			var subtitle = document.createElement( 'div' );
			subtitle.className = 'wpqp-item-subtitle';
			var byStr = ( wpqpData.strings && wpqpData.strings.commentBy ) ? wpqpData.strings.commentBy : 'by';
			var onStr = ( wpqpData.strings && wpqpData.strings.commentOn ) ? wpqpData.strings.commentOn : 'on';
			var parts = [];
			if ( item.comment_author ) {
				parts.push( byStr + ' ' + WPQP.decodeHtmlEntities( item.comment_author ) );
			}
			if ( item.parent_post_title ) {
				parts.push( onStr + ' \u201c' + WPQP.decodeHtmlEntities( item.parent_post_title ) + '\u201d' );
			}
			subtitle.textContent = parts.join( ' ' );
			content.appendChild( subtitle );
		}

		var meta = document.createElement( 'div' );
		meta.className = 'wpqp-item-meta';

		// Post type badge
		var typeBadge = document.createElement( 'span' );
		typeBadge.className = 'wpqp-item-type';
		typeBadge.textContent = WPQP.getPostTypeSingularLabel( item.type );

		// Status badge
		var statusMap = {
			'publish':  wpqpData.strings.statusPublished,
			'draft':    wpqpData.strings.statusDraft,
			'pending':  wpqpData.strings.statusPending,
			'private':  wpqpData.strings.statusPrivate,
			'future':   wpqpData.strings.statusScheduled,
			'trash':    wpqpData.strings.statusTrash,
			'disabled': 'Disabled',
			'expired':  'Expired'
		};
		var statusText  = statusMap[ item.status ] || wpqpData.strings.statusPublished;
		var statusClass = 'wpqp-item-status--' + ( item.status || 'publish' );
		var statusBadge = document.createElement( 'span' );
		statusBadge.className = 'wpqp-item-status ' + statusClass;
		statusBadge.textContent = statusText;

		meta.appendChild( typeBadge );
		meta.appendChild( statusBadge );

		// Relative time (modified date)
		if ( item.modified_date && typeof WPQP.getRelativeTime === 'function' ) {
			var timeEl = document.createElement( 'span' );
			timeEl.className = 'wpqp-item-time';
			timeEl.textContent = WPQP.getRelativeTime( item.modified_date );
			meta.appendChild( timeEl );
		}

		content.appendChild( title );
		content.appendChild( meta );
		itemEl.appendChild( content );

		// Right side: Actions container
		var actions = document.createElement( 'div' );
		actions.className = 'wpqp-item-actions';

		// Open in new tab button
		var newTabBtn = document.createElement( 'button' );
		newTabBtn.className = 'wpqp-item-newtab';
		newTabBtn.setAttribute( 'aria-label', wpqpData.strings.openNewTab );
		newTabBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
		newTabBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			e.stopPropagation();
			WPQP.openInNewTab( item );
		} );

		// Copy button (three-dots menu)
		var copyBtn = document.createElement( 'button' );
		copyBtn.className = 'wpqp-copy-btn';
		copyBtn.setAttribute( 'aria-label', wpqpData.strings.copyOptions );
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

		// Star button (Lite + Pro)
		var isStarred = WPQP.isItemFavorited( item.type, item.id );
		var starBtn   = WPQP.createStarButton( item, isStarred );
		itemEl.appendChild( starBtn );

		// Highlight favorited items with a subtle tint
		if ( isStarred ) {
			itemEl.classList.add( 'wpqp-item--favorited' );
		}

		// Click handler
		itemEl.addEventListener( 'click', function( e ) {
			if (
				e.target.closest( '.wpqp-item-actions' ) ||
				e.target.closest( '.wpqp-star-btn' )
			) {
				return;
			}
			WPQP.navigateToItem( item );
		} );

		// Hover handler
		itemEl.addEventListener( 'mouseenter', function() {
			var allItems = Array.prototype.filter.call(
				WPQP.state.elements.results.querySelectorAll( '.wpqp-item' ),
				function( el ) { return el.offsetParent !== null; }
			);
			var index = allItems.indexOf( itemEl );
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
		resultsContainer.innerHTML = '<div class="wpqp-loading"><span class="wpqp-spinner"></span><span>' + wpqpData.strings.searching + '</span></div>';
	};

	/**
	 * Render empty state, with an optional "Create new post" suggestion.
	 */
	WPQP.renderEmpty = function() {
		var resultsContainer = WPQP.state.elements.results;
		if ( ! resultsContainer ) { return; }

		var term       = WPQP.state.lastSearchTerm || '';
		var searchType = WPQP.state.activeSearchType;

		resultsContainer.innerHTML = '';

		var emptyMsg = document.createElement( 'div' );
		emptyMsg.className = 'wpqp-empty';
		emptyMsg.textContent = wpqpData.strings.noResults;
		resultsContainer.appendChild( emptyMsg );

		// "Create new post" suggestion — content search only, query >= 2 chars.
		if ( searchType === 'content' && term.length >= 2 && wpqpData.postNewUrl ) {
			var createLabel = ( wpqpData.strings && wpqpData.strings.createNewPost )
				? wpqpData.strings.createNewPost
				: 'Create a new post titled';

			var createBtn = document.createElement( 'a' );
			createBtn.className = 'wpqp-create-action';
			createBtn.href = wpqpData.postNewUrl + '?post_title=' + encodeURIComponent( term );

			var createIcon = document.createElement( 'span' );
			createIcon.className = 'wpqp-create-action__icon';
			createIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

			var createText = document.createElement( 'span' );
			createText.className = 'wpqp-create-action__text';
			createText.textContent = createLabel + ' ';

			var createQuery = document.createElement( 'em' );
			createQuery.textContent = '\u201c' + term + '\u201d';
			createText.appendChild( createQuery );

			createBtn.appendChild( createIcon );
			createBtn.appendChild( createText );
			resultsContainer.appendChild( createBtn );
		}

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
		// Reuse a single textarea element (lighter than DOMParser per call).
		if ( ! WPQP._decoderEl ) {
			WPQP._decoderEl = document.createElement( 'textarea' );
		}
		WPQP._decoderEl.innerHTML = text;
		return WPQP._decoderEl.value;
	};

	/**
	 * Highlight query match within plain text as a DocumentFragment.
	 * Returns a fragment with a <mark> around the first match, or null if no match.
	 * Safe: builds DOM nodes directly, never uses innerHTML with user content.
	 *
	 * @param {string} text  Decoded plain-text string.
	 * @param {string} query Search term.
	 * @returns {DocumentFragment|null}
	 */
	WPQP.highlightMatch = function( text, query ) {
		if ( ! query || ! text ) { return null; }

		var lowerText  = text.toLowerCase();
		var lowerQuery = query.toLowerCase();
		var idx        = lowerText.indexOf( lowerQuery );

		if ( idx === -1 ) { return null; }

		var frag = document.createDocumentFragment();

		if ( idx > 0 ) {
			frag.appendChild( document.createTextNode( text.substring( 0, idx ) ) );
		}
		var mark = document.createElement( 'mark' );
		mark.className = 'wpqp-highlight';
		mark.textContent = text.substring( idx, idx + query.length );
		frag.appendChild( mark );

		if ( idx + query.length < text.length ) {
			frag.appendChild( document.createTextNode( text.substring( idx + query.length ) ) );
		}

		return frag;
	};

	/**
	 * Get singular post type label.
	 */
	WPQP.getPostTypeSingularLabel = function( postType ) {
		var labels = {
			'post':       wpqpData.strings.typePost,
			'page':       wpqpData.strings.typePage,
			'product':    wpqpData.strings.typeProduct,
			'attachment': wpqpData.strings.typeMedia,
			'user':       wpqpData.strings.typeUser,
			'admin':      wpqpData.strings.typeAdmin,
			'comment':    wpqpData.strings.typeComment
		};
		return labels[ postType ] || postType.charAt( 0 ).toUpperCase() + postType.slice( 1 );
	};

} )( window.WPQP );
