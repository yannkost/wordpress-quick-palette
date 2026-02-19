/**
 * WP Quick Palette - Pro Module
 * Handles panels (History + Favorites), Pro data loading, saved searches,
 * favorites management, drag-drop reordering, and history recording.
 *
 * @package WPQP
 */

( function( WPQP ) {
	'use strict';

	if ( ! WPQP || WPQP._disabled ) {
		return;
	}

	// =========================================================================
	// Panels: Lite (History + Favorites)
	// =========================================================================

	/**
	 * Render panels (History and Favorites).
	 * Available in both Lite and Pro.
	 */
	WPQP.renderPanels = function() {
		var resultsContainer = WPQP.state.elements.results;
		if ( ! resultsContainer ) {
			return;
		}

		resultsContainer.style.display = 'flex';
		resultsContainer.innerHTML = '';

		// Reset item counter
		WPQP.itemIdCounter = 0;

		var hasFavorites = WPQP.state.favorites && WPQP.state.favorites.length > 0;
		var hasHistory   = WPQP.state.history   && WPQP.state.history.length > 0;

		if ( ! hasFavorites && ! hasHistory ) {
			resultsContainer.innerHTML = '<div class="wpqp-empty">' + wpqpData.strings.startSearching + '</div>';
			if ( WPQP.state.elements.panelsContainer ) {
				WPQP.state.elements.panelsContainer.classList.add( 'wpqp-visible', 'has-spacing' );
			}
			WPQP.state.elements.historyPanel.style.display   = 'flex';
			WPQP.state.elements.favoritesPanel.style.display = 'flex';
			WPQP.state.elements.historyPanel.innerHTML   = '<div class="wpqp-empty wpqp-empty--panel">' + wpqpData.strings.noHistory + '</div>';
			WPQP.state.elements.favoritesPanel.innerHTML = '<div class="wpqp-empty wpqp-empty--panel">' + wpqpData.strings.noFavorites + '</div>';
			return;
		}

		// Scrollable wrapper
		var scrollWrapper = document.createElement( 'div' );
		scrollWrapper.className = 'wpqp-results-scroll';
		resultsContainer.appendChild( scrollWrapper );

		var historyPanel   = WPQP.state.elements.historyPanel;
		var favoritesPanel = WPQP.state.elements.favoritesPanel;

		if ( hasHistory || hasFavorites ) {
			WPQP.state.elements.panelsContainer.classList.add( 'wpqp-visible' );
			historyPanel.style.display   = 'flex';
			favoritesPanel.style.display = 'flex';

			// History column
			if ( hasHistory ) {
				historyPanel.innerHTML = '';
				historyPanel.appendChild( WPQP._buildPanelHeading( wpqpData.strings.history, 'history' ) );

				var histList   = document.createElement( 'div' );
				histList.className = 'wpqp-panel-list';
				histList.id    = 'wpqp-history-list';

				WPQP.state.history.forEach( function( entry ) {
					var isFav  = WPQP.isItemFavorited( entry.type, entry.id );
					var itemEl = WPQP.createPanelItem( entry, isFav );
					histList.appendChild( itemEl );
				} );

				historyPanel.appendChild( histList );
			}

			// Favorites column
			if ( hasFavorites ) {
				favoritesPanel.innerHTML = '';
				favoritesPanel.appendChild( WPQP._buildPanelHeading( wpqpData.strings.favorites, 'favorites' ) );

				var favList = document.createElement( 'div' );
				favList.className = 'wpqp-panel-list';
				favList.id  = 'wpqp-favorites-list';

				WPQP.state.favorites.forEach( function( fav, index ) {
					var itemEl     = WPQP.createPanelItem( fav, true );
					var dragHandle = WPQP._buildDragHandle();
					itemEl.insertBefore( dragHandle, itemEl.firstChild );

					// Alt+1-9 badges for first 9 favorites
					if ( index < 9 ) {
						var shortcutBadge = document.createElement( 'span' );
						shortcutBadge.className = 'wpqp-shortcut-badge wpqp-shortcut-badge--fav';
						shortcutBadge.textContent = 'Alt+' + ( index + 1 );
						itemEl.querySelector( '.wpqp-item-meta' ).appendChild( shortcutBadge );
					}
					favList.appendChild( itemEl );
				} );

				favoritesPanel.appendChild( favList );
				WPQP.setupFavoritesDragDrop();
			}
		} else {
			historyPanel.style.display   = 'none';
			favoritesPanel.style.display = 'none';
			WPQP.state.elements.panelsContainer.classList.remove( 'wpqp-visible' );
		}

		WPQP.state.flatItems    = [];
		WPQP.state.selectedIndex = -1;
	};

	/**
	 * Create a DOM element for a panel item (favorite or history entry).
	 */
	WPQP.createPanelItem = function( item, isFavorite ) {
		var itemEl = document.createElement( 'div' );
		itemEl.className = 'wpqp-item';
		itemEl.setAttribute( 'role', 'option' );
		itemEl.setAttribute( 'data-id', item.id );
		itemEl.setAttribute( 'data-type', item.type );
		itemEl.id = 'wpqp-item-' + ( WPQP.itemIdCounter++ );

		var normalizedItem = {
			type:     item.type,
			id:       item.id,
			title:    item.title    || item.label || '',
			edit_url: item.edit_url || item.url   || '',
			status:   item.status   || 'publish'
		};

		itemEl._wpqpItem = normalizedItem;

		var content = document.createElement( 'div' );
		content.className = 'wpqp-item-content';

		var title = document.createElement( 'div' );
		title.className = 'wpqp-item-title';
		title.textContent = WPQP.decodeHtmlEntities( normalizedItem.title );

		var meta = document.createElement( 'div' );
		meta.className = 'wpqp-item-meta';

		var typeLabel = document.createElement( 'span' );
		typeLabel.className = 'wpqp-item-type';
		typeLabel.textContent = WPQP.getPostTypeSingularLabel( item.type );
		meta.appendChild( typeLabel );

		var statusBadge = document.createElement( 'span' );
		statusBadge.className = 'wpqp-item-status wpqp-item-status--publish';
		statusBadge.textContent = wpqpData.strings.statusPublished;
		meta.appendChild( statusBadge );

		// Relative time for history entries
		if ( item.last_used ) {
			var timeAgo = document.createElement( 'span' );
			timeAgo.className = 'wpqp-item-time';
			timeAgo.textContent = WPQP.getRelativeTime( item.last_used );
			meta.appendChild( timeAgo );
		}

		content.appendChild( title );
		content.appendChild( meta );
		itemEl.appendChild( content );

		// Right side: Actions
		var actions = document.createElement( 'div' );
		actions.className = 'wpqp-item-actions';

		var newTabBtn = document.createElement( 'button' );
		newTabBtn.className = 'wpqp-item-newtab';
		newTabBtn.setAttribute( 'aria-label', wpqpData.strings.openNewTab );
		newTabBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
		newTabBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			e.stopPropagation();
			WPQP.openInNewTab( normalizedItem );
		} );

		var copyBtn = document.createElement( 'button' );
		copyBtn.className = 'wpqp-copy-btn';
		copyBtn.setAttribute( 'aria-label', wpqpData.strings.copyOptions );
		copyBtn.setAttribute( 'aria-expanded', 'false' );
		copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>';
		copyBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			e.stopPropagation();
			WPQP.toggleCopyMenu( copyBtn, normalizedItem );
		} );

		actions.appendChild( newTabBtn );
		actions.appendChild( copyBtn );
		itemEl.appendChild( actions );

		// Star button (available in both Lite and Pro for panels)
		var starBtn = WPQP.createStarButton( normalizedItem, isFavorite );
		itemEl.appendChild( starBtn );

		// Click handler
		itemEl.addEventListener( 'click', function( e ) {
			if ( itemEl.classList.contains( 'wpqp-dragging' ) ) {
				return;
			}
			if ( e.target.closest( '.wpqp-item-actions' ) || e.target.closest( '.wpqp-star-btn' ) ) {
				return;
			}
			WPQP.navigateToItem( normalizedItem );
		} );

		// Hover handler
		itemEl.addEventListener( 'mouseenter', function() {
			var allItems = WPQP.state.elements.results.querySelectorAll( '.wpqp-item' );
			var index    = Array.prototype.indexOf.call( allItems, itemEl );
			WPQP.selectItem( index );
		} );

		return itemEl;
	};

	/**
	 * Filter history items by search term.
	 */
	WPQP.filterHistoryItems = function( term ) {
		var list = document.getElementById( 'wpqp-history-list' );
		if ( ! list ) { return; }

		var items     = list.querySelectorAll( '.wpqp-item' );
		var lowerTerm = term.toLowerCase();

		items.forEach( function( item ) {
			var titleEl = item.querySelector( '.wpqp-item-title' );
			if ( titleEl ) {
				var text = titleEl.textContent.toLowerCase();
				item.style.display = text.indexOf( lowerTerm ) !== -1 ? '' : 'none';
			}
		} );
	};

	/**
	 * Filter favorites items by search term.
	 */
	WPQP.filterFavoritesItems = function( term ) {
		var list = document.getElementById( 'wpqp-favorites-list' );
		if ( ! list ) { return; }

		var items     = list.querySelectorAll( '.wpqp-item' );
		var lowerTerm = term.toLowerCase();

		items.forEach( function( item ) {
			var titleEl = item.querySelector( '.wpqp-item-title' );
			if ( titleEl ) {
				var text = titleEl.textContent.toLowerCase();
				item.style.display = text.indexOf( lowerTerm ) !== -1 ? '' : 'none';
			}
		} );
	};

	// =========================================================================
	// Drag & Drop
	// =========================================================================

	/**
	 * Set up drag and drop for favorites list.
	 */
	WPQP.setupFavoritesDragDrop = function() {
		var favList = document.getElementById( 'wpqp-favorites-list' );
		if ( ! favList ) {
			return;
		}

		var items       = favList.querySelectorAll( '.wpqp-item' );
		var draggedItem = null;

		items.forEach( function( item ) {
			var dragHandle = item.querySelector( '.wpqp-drag-handle' );
			if ( ! dragHandle ) {
				return;
			}

			dragHandle.setAttribute( 'draggable', 'true' );
			dragHandle.style.cursor = 'grab';

			dragHandle.addEventListener( 'dragstart', function( e ) {
				draggedItem = item;
				item.classList.add( 'wpqp-dragging' );
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData( 'text/plain', item.getAttribute( 'data-id' ) );
				item.addEventListener( 'click', WPQP.preventClickDuringDrag, true );
			} );

			dragHandle.addEventListener( 'dragend', function() {
				item.classList.remove( 'wpqp-dragging' );
				item.removeEventListener( 'click', WPQP.preventClickDuringDrag, true );
				draggedItem = null;

				items.forEach( function( it ) {
					it.classList.remove( 'wpqp-drag-over' );
				} );
			} );

			item.addEventListener( 'dragover', function( e ) {
				e.preventDefault();
				e.dataTransfer.dropEffect = 'move';
				if ( draggedItem && draggedItem !== item ) {
					item.classList.add( 'wpqp-drag-over' );
				}
			} );

			item.addEventListener( 'dragleave', function() {
				item.classList.remove( 'wpqp-drag-over' );
			} );

			item.addEventListener( 'drop', function( e ) {
				e.preventDefault();
				item.classList.remove( 'wpqp-drag-over' );

				if ( draggedItem && draggedItem !== item ) {
					var draggedId = draggedItem.getAttribute( 'data-id' );
					var targetId  = item.getAttribute( 'data-id' );
					WPQP.reorderFavorites( draggedId, targetId );
				}
			} );
		} );
	};

	/**
	 * Prevent click during drag.
	 */
	WPQP.preventClickDuringDrag = function( e ) {
		e.preventDefault();
		e.stopPropagation();
	};

	/**
	 * Reorder favorites after drag and drop.
	 */
	WPQP.reorderFavorites = function( draggedId, targetId ) {
		var draggedIndex = -1;
		var targetIndex  = -1;

		for ( var i = 0; i < WPQP.state.favorites.length; i++ ) {
			if ( String( WPQP.state.favorites[ i ].id ) === String( draggedId ) ) {
				draggedIndex = i;
			}
			if ( String( WPQP.state.favorites[ i ].id ) === String( targetId ) ) {
				targetIndex = i;
			}
		}

		if ( draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex ) {
			return;
		}

		// Reorder in state
		var item = WPQP.state.favorites.splice( draggedIndex, 1 )[ 0 ];
		WPQP.state.favorites.splice( targetIndex, 0, item );

		// Re-render
		if ( wpqpData.isPro ) {
			WPQP.renderProSections();
		} else {
			WPQP.renderPanels();
		}

		WPQP.saveFavoritesOrder();
	};

	/**
	 * Save favorites order to server.
	 */
	WPQP.saveFavoritesOrder = function() {
		var formData = new FormData();
		formData.append( 'action', 'wpqp_reorder_favorites' );
		formData.append( '_ajax_nonce', wpqpData.nonce );
		formData.append( 'order', JSON.stringify( WPQP.state.favorites.map( function( f ) {
			return { id: f.id, type: f.type };
		} ) ) );

		fetch( wpqpData.ajaxUrl, {
			method:      'POST',
			body:        formData,
			credentials: 'same-origin'
		} ).catch( function( err ) {
			console.error( 'WPQP reorder favorites error:', err );
		} );
	};

	// =========================================================================
	// Pro Data Loading
	// =========================================================================

	/* <fs_premium_only> */

	/**
	 * Load Pro data (favorites + history + saved searches) via AJAX.
	 */
	WPQP.loadProData = function( callback ) {
		if ( ! wpqpData.isPro ) {
			if ( callback ) { callback(); }
			return;
		}

		if ( WPQP.state.proDataLoaded ) {
			if ( callback ) { callback(); }
			return;
		}

		var completed = 0;
		var total     = 3;

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

		// Fetch saved searches
		var savedData = new FormData();
		savedData.append( 'action', 'wpqp_get_saved_searches' );
		savedData.append( '_ajax_nonce', wpqpData.nonce );

		fetch( wpqpData.ajaxUrl, { method: 'POST', body: savedData, credentials: 'same-origin' } )
			.then( function( r ) { return r.json(); } )
			.then( function( data ) {
				if ( data.success && data.data && data.data.saved_searches ) {
					WPQP.state.savedSearches = data.data.saved_searches;
				}
				checkDone();
			} )
			.catch( function() { checkDone(); } );
	};

	// =========================================================================
	// Pro Sections Rendering
	// =========================================================================

	/**
	 * Render Pro sections: History/Favorites columns.
	 */
	WPQP.renderProSections = function() {
		if ( ! wpqpData.isPro ) {
			return;
		}

		var resultsContainer = WPQP.state.elements.results;
		if ( ! resultsContainer ) {
			return;
		}

		resultsContainer.style.display = 'flex';
		resultsContainer.innerHTML = '';

		// Reset item counter
		WPQP.itemIdCounter = 0;

		// Update saved searches button visibility
		if ( WPQP.state.elements.savedSearchesWrap ) {
			WPQP.state.elements.savedSearchesWrap.style.display =
				WPQP.state.savedSearches.length > 0 ? 'flex' : 'none';
		}

		var hasFavorites = WPQP.state.favorites.length > 0;
		var hasHistory   = WPQP.state.history.length   > 0;

		if ( ! hasFavorites && ! hasHistory ) {
			resultsContainer.innerHTML = '<div class="wpqp-empty">' + wpqpData.strings.startSearching + '</div>';
			if ( WPQP.state.elements.panelsContainer ) {
				WPQP.state.elements.panelsContainer.classList.add( 'wpqp-visible', 'has-spacing' );
			}
			WPQP.state.elements.historyPanel.style.display   = 'flex';
			WPQP.state.elements.favoritesPanel.style.display = 'flex';
			WPQP.state.elements.historyPanel.innerHTML   = '<div class="wpqp-empty wpqp-empty--panel">' + wpqpData.strings.noHistory + '</div>';
			WPQP.state.elements.favoritesPanel.innerHTML = '<div class="wpqp-empty wpqp-empty--panel">' + wpqpData.strings.noFavorites + '</div>';
			return;
		}

		// Scrollable wrapper
		var scrollWrapper = document.createElement( 'div' );
		scrollWrapper.className = 'wpqp-results-scroll';
		resultsContainer.appendChild( scrollWrapper );

		var historyPanel   = WPQP.state.elements.historyPanel;
		var favoritesPanel = WPQP.state.elements.favoritesPanel;

		if ( hasHistory || hasFavorites ) {
			WPQP.state.elements.panelsContainer.classList.add( 'wpqp-visible' );
			historyPanel.style.display   = 'flex';
			favoritesPanel.style.display = 'flex';

			// History column
			if ( hasHistory ) {
				historyPanel.innerHTML = '';
				historyPanel.appendChild( WPQP._buildPanelHeading( wpqpData.strings.history, 'history' ) );

				var histList = document.createElement( 'div' );
				histList.className = 'wpqp-panel-list';
				histList.id = 'wpqp-history-list';

				WPQP.state.history.forEach( function( entry ) {
					var isFav  = WPQP.isItemFavorited( entry.type, entry.id );
					var itemEl = WPQP.createProItem( entry, isFav );
					histList.appendChild( itemEl );
				} );

				historyPanel.appendChild( histList );
			}

			// Favorites column
			if ( hasFavorites ) {
				favoritesPanel.innerHTML = '';
				favoritesPanel.appendChild( WPQP._buildPanelHeading( wpqpData.strings.favorites, 'favorites' ) );

				var favList = document.createElement( 'div' );
				favList.className = 'wpqp-panel-list';
				favList.id = 'wpqp-favorites-list';

				WPQP.state.favorites.forEach( function( fav, index ) {
					var itemEl     = WPQP.createProItem( fav, true );
					var dragHandle = WPQP._buildDragHandle();
					itemEl.insertBefore( dragHandle, itemEl.firstChild );

					if ( index < 9 ) {
						var shortcutBadge = document.createElement( 'span' );
						shortcutBadge.className = 'wpqp-shortcut-badge wpqp-shortcut-badge--fav';
						shortcutBadge.textContent = 'Alt+' + ( index + 1 );
						itemEl.querySelector( '.wpqp-item-meta' ).appendChild( shortcutBadge );
					}
					favList.appendChild( itemEl );
				} );

				favoritesPanel.appendChild( favList );
				WPQP.setupFavoritesDragDrop();
			}
		} else {
			historyPanel.style.display   = 'none';
			favoritesPanel.style.display = 'none';
			WPQP.state.elements.panelsContainer.classList.remove( 'wpqp-visible' );
		}

		WPQP.state.flatItems    = [];
		WPQP.state.selectedIndex = -1;
	};

	/**
	 * Create a DOM element for a Pro item (favorite or history entry).
	 */
	WPQP.createProItem = function( item, isFavorite ) {
		var itemEl = document.createElement( 'div' );
		itemEl.className = 'wpqp-item';
		itemEl.setAttribute( 'role', 'option' );
		itemEl.setAttribute( 'data-id', item.id );
		itemEl.setAttribute( 'data-type', item.type );
		itemEl.id = 'wpqp-item-' + ( WPQP.itemIdCounter++ );

		var normalizedItem = {
			type:     item.type,
			id:       item.id,
			title:    item.title    || item.label || '',
			edit_url: item.edit_url || item.url   || '',
			status:   item.status   || 'publish'
		};

		itemEl._wpqpItem = normalizedItem;

		var content = document.createElement( 'div' );
		content.className = 'wpqp-item-content';

		var title = document.createElement( 'div' );
		title.className = 'wpqp-item-title';
		title.textContent = WPQP.decodeHtmlEntities( normalizedItem.title );

		var meta = document.createElement( 'div' );
		meta.className = 'wpqp-item-meta';

		var typeLabel = document.createElement( 'span' );
		typeLabel.className = 'wpqp-item-type';
		typeLabel.textContent = WPQP.getPostTypeSingularLabel( item.type );
		meta.appendChild( typeLabel );

		var statusBadge = document.createElement( 'span' );
		statusBadge.className = 'wpqp-item-status wpqp-item-status--publish';
		statusBadge.textContent = wpqpData.strings.statusPublished;
		meta.appendChild( statusBadge );

		if ( item.last_used ) {
			var timeAgo = document.createElement( 'span' );
			timeAgo.className = 'wpqp-item-time';
			timeAgo.textContent = WPQP.getRelativeTime( item.last_used );
			meta.appendChild( timeAgo );
		}

		content.appendChild( title );
		content.appendChild( meta );
		itemEl.appendChild( content );

		var actions = document.createElement( 'div' );
		actions.className = 'wpqp-item-actions';

		var newTabBtn = document.createElement( 'button' );
		newTabBtn.className = 'wpqp-item-newtab';
		newTabBtn.setAttribute( 'aria-label', wpqpData.strings.openNewTab );
		newTabBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
		newTabBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			e.stopPropagation();
			WPQP.openInNewTab( normalizedItem );
		} );

		var copyBtn = document.createElement( 'button' );
		copyBtn.className = 'wpqp-copy-btn';
		copyBtn.setAttribute( 'aria-label', wpqpData.strings.copyOptions );
		copyBtn.setAttribute( 'aria-expanded', 'false' );
		copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>';
		copyBtn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			e.stopPropagation();
			WPQP.toggleCopyMenu( copyBtn, normalizedItem );
		} );

		actions.appendChild( newTabBtn );
		actions.appendChild( copyBtn );
		itemEl.appendChild( actions );

		var starBtn = WPQP.createStarButton( normalizedItem, isFavorite );
		itemEl.appendChild( starBtn );

		itemEl.addEventListener( 'click', function( e ) {
			if ( itemEl.classList.contains( 'wpqp-dragging' ) ) {
				return;
			}
			if ( e.target.closest( '.wpqp-item-actions' ) || e.target.closest( '.wpqp-star-btn' ) ) {
				return;
			}
			WPQP.navigateToItem( normalizedItem );
		} );

		itemEl.addEventListener( 'mouseenter', function() {
			var allItems = WPQP.state.elements.results.querySelectorAll( '.wpqp-item' );
			var index    = Array.prototype.indexOf.call( allItems, itemEl );
			WPQP.selectItem( index );
		} );

		return itemEl;
	};

	/* </fs_premium_only> */

	// =========================================================================
	// Saved Searches
	// =========================================================================

	/* <fs_premium_only> */

	/**
	 * Delete a saved search via AJAX.
	 */
	WPQP.deleteSavedSearch = function( searchId ) {
		var formData = new FormData();
		formData.append( 'action', 'wpqp_delete_saved_search' );
		formData.append( '_ajax_nonce', wpqpData.nonce );
		formData.append( 'id', searchId );

		fetch( wpqpData.ajaxUrl, {
			method:      'POST',
			body:        formData,
			credentials: 'same-origin'
		} )
			.then( function( r ) { return r.json(); } )
			.then( function( data ) {
				if ( data.success && data.data && data.data.saved_searches ) {
					WPQP.state.savedSearches = data.data.saved_searches;
					WPQP.renderSavedSearchesDropdown();
					if ( WPQP.state.elements.savedSearchesWrap && WPQP.state.savedSearches.length === 0 ) {
						WPQP.state.elements.savedSearchesWrap.style.display = 'none';
						WPQP.closeSavedSearchesDropdown();
					}
				}
			} )
			.catch( function( err ) {
				console.error( 'WPQP delete saved search error:', err );
			} );
	};

	/**
	 * Execute a saved search via AJAX.
	 */
	WPQP.executeSavedSearch = function( searchId ) {
		var formData = new FormData();
		formData.append( 'action', 'wpqp_execute_saved_search' );
		formData.append( '_ajax_nonce', wpqpData.nonce );
		formData.append( 'search_id', searchId );

		WPQP.renderLoading();

		fetch( wpqpData.ajaxUrl, {
			method:      'POST',
			body:        formData,
			credentials: 'same-origin'
		} )
			.then( function( response ) {
				if ( ! response.ok ) {
					throw new Error( 'Network response was not ok' );
				}
				return response.json();
			} )
			.then( function( data ) {
				if ( data.success && data.data ) {
					WPQP.state.searchTerm         = data.data.meta.query || '';
					WPQP.state.elements.input.value = WPQP.state.searchTerm;
					WPQP.state.results            = data.data.results || {};

					var hasResults = false;
					for ( var key in WPQP.state.results ) {
						if ( WPQP.state.results.hasOwnProperty( key ) && WPQP.state.results[ key ].length > 0 ) {
							hasResults = true;
							break;
						}
					}

					if ( hasResults ) {
						WPQP.hidePanels();
					}
					WPQP.renderResults( WPQP.state.results );
				} else {
					WPQP.renderError( data.data && data.data.message ? data.data.message : wpqpData.strings.searchError );
				}
			} )
			.catch( function( error ) {
				console.error( 'WPQP execute saved search error:', error );
				WPQP.renderError( wpqpData.strings.searchFailed );
			} );
	};

	/**
	 * Toggle saved searches dropdown.
	 */
	WPQP.toggleSavedSearchesDropdown = function() {
		var dropdown = WPQP.state.elements.savedSearchesDropdown;
		var btn      = WPQP.state.elements.savedSearchesBtn;
		if ( ! dropdown ) { return; }

		var isOpen = dropdown.style.display !== 'none';
		if ( isOpen ) {
			WPQP.closeSavedSearchesDropdown();
		} else {
			WPQP.renderSavedSearchesDropdown();
			dropdown.style.display = 'block';
			btn.setAttribute( 'aria-expanded', 'true' );
			btn.classList.add( 'wpqp-saved-searches-btn--active' );
		}
	};

	/**
	 * Close saved searches dropdown.
	 */
	WPQP.closeSavedSearchesDropdown = function() {
		var dropdown = WPQP.state.elements.savedSearchesDropdown;
		var btn      = WPQP.state.elements.savedSearchesBtn;
		if ( dropdown ) {
			dropdown.style.display = 'none';
			dropdown.innerHTML     = '';
		}
		if ( btn ) {
			btn.setAttribute( 'aria-expanded', 'false' );
			btn.classList.remove( 'wpqp-saved-searches-btn--active' );
		}
	};

	/**
	 * Render saved searches dropdown list.
	 */
	WPQP.renderSavedSearchesDropdown = function() {
		var dropdown = WPQP.state.elements.savedSearchesDropdown;
		if ( ! dropdown ) { return; }
		dropdown.innerHTML = '';

		if ( WPQP.state.savedSearches.length === 0 ) {
			var empty = document.createElement( 'div' );
			empty.className = 'wpqp-saved-dropdown-empty';
			empty.textContent = wpqpData.strings.noSavedSearches;
			dropdown.appendChild( empty );
			return;
		}

		WPQP.state.savedSearches.forEach( function( savedSearch ) {
			var row = document.createElement( 'div' );
			row.className = 'wpqp-saved-dropdown-item';

			var label = document.createElement( 'span' );
			label.className = 'wpqp-saved-dropdown-label';
			label.textContent = savedSearch.label;

			var deleteBtn = document.createElement( 'button' );
			deleteBtn.className = 'wpqp-saved-dropdown-delete';
			deleteBtn.setAttribute( 'aria-label', 'Delete' );
			deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
			deleteBtn.addEventListener( 'click', function( e ) {
				e.preventDefault();
				e.stopPropagation();
				WPQP.deleteSavedSearch( savedSearch.id );
				WPQP.renderSavedSearchesDropdown();
			} );

			row.appendChild( label );
			if ( ! savedSearch.is_builtin ) {
				row.appendChild( deleteBtn );
			}

			row.addEventListener( 'click', function( e ) {
				e.preventDefault();
				WPQP.closeSavedSearchesDropdown();
				if ( savedSearch.query_args && savedSearch.query_args.search_term ) {
					WPQP.state.elements.input.value = savedSearch.query_args.search_term;
					WPQP.state.searchTerm           = savedSearch.query_args.search_term;
					var searchType = savedSearch.query_args.search_type || 'content';
					WPQP.switchSearchType( searchType );
				} else {
					WPQP.executeSavedSearch( savedSearch.id );
				}
			} );

			dropdown.appendChild( row );
		} );
	};

	/**
	 * Show save search dialog.
	 */
	WPQP.showSaveSearchDialog = function() {
		var term = WPQP.state.searchTerm.trim();
		if ( term.length === 0 ) {
			return;
		}

		var label = prompt( wpqpData.strings.nameYourSearch );
		if ( label && label.trim() ) {
			WPQP.saveSearch( label.trim(), term );
		}
	};

	/**
	 * Save search via AJAX.
	 */
	WPQP.saveSearch = function( label, query ) {
		var formData = new FormData();
		formData.append( 'action', 'wpqp_save_saved_search' );
		formData.append( '_ajax_nonce', wpqpData.nonce );
		formData.append( 'id', 'custom_' + Date.now() );
		formData.append( 'label', label );
		formData.append( 'query_args', JSON.stringify( {
			search_term: query,
			search_type: WPQP.state.activeSearchType
		} ) );

		fetch( wpqpData.ajaxUrl, {
			method:      'POST',
			body:        formData,
			credentials: 'same-origin'
		} )
			.then( function( r ) { return r.json(); } )
			.then( function( data ) {
				if ( data.success && data.data && data.data.saved_searches ) {
					WPQP.state.savedSearches = data.data.saved_searches;
					WPQP.state.elements.announce.textContent = label + ' - ' + wpqpData.strings.savedConfirm;
				}
			} )
			.catch( function( err ) {
				console.error( 'WPQP save search error:', err );
			} );
	};

	/* </fs_premium_only> */

	// =========================================================================
	// Favorites (Star Button)
	// =========================================================================

	/**
	 * Create a star toggle button.
	 */
	WPQP.createStarButton = function( item, isStarred ) {
		var btn = document.createElement( 'button' );
		btn.className = 'wpqp-star-btn' + ( isStarred ? ' wpqp-star-btn--active' : '' );
		btn.setAttribute( 'type', 'button' );
		btn.setAttribute( 'aria-label', isStarred ? 'Remove from favorites' : 'Add to favorites' );
		btn.innerHTML = isStarred
			? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
			: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

		btn.addEventListener( 'click', function( e ) {
			e.preventDefault();
			e.stopPropagation();
			WPQP.toggleFavorite( item, btn );
		} );

		return btn;
	};

	/**
	 * Toggle favorite via AJAX.
	 */
	WPQP.toggleFavorite = function( item, btn ) {
		var formData = new FormData();
		formData.append( 'action', 'wpqp_toggle_favorite' );
		formData.append( '_ajax_nonce', wpqpData.nonce );
		formData.append( 'type', item.type );
		formData.append( 'id', item.id );
		formData.append( 'title', item.title    || '' );
		formData.append( 'edit_url', item.edit_url || '' );

		fetch( wpqpData.ajaxUrl, {
			method:      'POST',
			body:        formData,
			credentials: 'same-origin'
		} )
			.then( function( r ) { return r.json(); } )
			.then( function( data ) {
				if ( data.success && data.data ) {
					WPQP.state.favorites = data.data.favorites || [];
					var isNowFav = data.data.action === 'added';

					btn.className = 'wpqp-star-btn' + ( isNowFav ? ' wpqp-star-btn--active' : '' );
					btn.innerHTML = isNowFav
						? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
						: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
					btn.setAttribute( 'aria-label', isNowFav ? 'Remove from favorites' : 'Add to favorites' );

					// Re-render panels if no active search
					if ( WPQP.state.searchTerm === '' ) {
						if ( wpqpData.isPro ) {
							WPQP.renderProSections();
						} else {
							WPQP.renderPanels();
						}
					}
				}
			} )
			.catch( function( err ) {
				console.error( 'WPQP toggle favorite error:', err );
			} );
	};

	/**
	 * Check if an item is in favorites.
	 */
	WPQP.isItemFavorited = function( type, id ) {
		for ( var i = 0; i < WPQP.state.favorites.length; i++ ) {
			if (
				WPQP.state.favorites[ i ].type === type &&
				parseInt( WPQP.state.favorites[ i ].id, 10 ) === parseInt( id, 10 )
			) {
				return true;
			}
		}
		return false;
	};

	// =========================================================================
	// History
	// =========================================================================

	/**
	 * Record a history entry via AJAX (fire and forget).
	 */
	WPQP.recordHistory = function( item ) {
		var formData = new FormData();
		formData.append( 'action', 'wpqp_record_history' );
		formData.append( '_ajax_nonce', wpqpData.nonce );
		formData.append( 'type', item.type );
		formData.append( 'id', item.id );
		formData.append( 'title', item.title    || '' );
		formData.append( 'edit_url', item.edit_url || '' );

		fetch( wpqpData.ajaxUrl, {
			method:      'POST',
			body:        formData,
			credentials: 'same-origin'
		} ).catch( function() {
			// Fire and forget
		} );
	};

	// =========================================================================
	// Relative Time
	// =========================================================================

	/**
	 * Get relative time string from Unix timestamp.
	 */
	WPQP.getRelativeTime = function( timestamp ) {
		if ( typeof timestamp === 'string' ) {
			var parsed = new Date( timestamp ).getTime();
			if ( isNaN( parsed ) ) {
				return '';
			}
			timestamp = parsed / 1000;
		}

		var now  = Math.floor( Date.now() / 1000 );
		var diff = now - parseInt( timestamp, 10 );

		if ( diff < 60 ) {
			return 'Just now';
		}

		var minutes = Math.floor( diff / 60 );
		if ( minutes < 60 ) {
			return minutes + ( minutes === 1 ? ' min ago' : ' mins ago' );
		}

		var hours = Math.floor( minutes / 60 );
		if ( hours < 24 ) {
			return hours + ( hours === 1 ? ' hour ago' : ' hours ago' );
		}

		var days = Math.floor( hours / 24 );
		if ( days < 30 ) {
			return days + ( days === 1 ? ' day ago' : ' days ago' );
		}

		var months = Math.floor( days / 30 );
		return months + ( months === 1 ? ' month ago' : ' months ago' );
	};

	// =========================================================================
	// Internal Helpers (not part of the public API)
	// =========================================================================

	/**
	 * Build the panel heading element with icon and filter input.
	 * @private
	 */
	WPQP._buildPanelHeading = function( label, type ) {
		var heading = document.createElement( 'div' );
		heading.className = 'wpqp-panel-heading';

		var headingRow = document.createElement( 'div' );
		headingRow.className = 'wpqp-panel-heading-row';

		var icon = document.createElement( 'span' );
		icon.className = 'wpqp-panel-heading-icon';

		if ( type === 'history' ) {
			icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
		} else {
			icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
		}

		headingRow.appendChild( icon );

		var titleSpan = document.createElement( 'span' );
		titleSpan.textContent = label;
		headingRow.appendChild( titleSpan );

		heading.appendChild( headingRow );

		// Filter input
		var filterInput = document.createElement( 'input' );
		filterInput.type = 'text';
		filterInput.className = 'wpqp-filter-input';
		filterInput.placeholder = wpqpData.strings.filterHistory;
		filterInput.addEventListener( 'input', function( e ) {
			if ( type === 'history' ) {
				WPQP.filterHistoryItems( e.target.value );
			} else {
				WPQP.filterFavoritesItems( e.target.value );
			}
		} );
		heading.appendChild( filterInput );

		return heading;
	};

	/**
	 * Build a drag handle span element.
	 * @private
	 */
	WPQP._buildDragHandle = function() {
		var dragHandle = document.createElement( 'span' );
		dragHandle.className = 'wpqp-drag-handle';
		dragHandle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';
		return dragHandle;
	};

} )( window.WPQP );
