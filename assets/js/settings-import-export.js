/**
 * WP Quick Palette — Import / Export settings page UI.
 *
 * Handles the Export button (JSON download) and Import form (file/paste + AJAX).
 *
 * @package WPQP
 */
(function () {
	'use strict';

	var cfg     = window.wpqpImportExport || {};
	var strings = cfg.strings || {};

	// =========================================================================
	// Helpers
	// =========================================================================

	function escapeHtml( str ) {
		var div = document.createElement( 'div' );
		div.textContent = str;
		return div.innerHTML;
	}

	function showNotice( type, message ) {
		var container = document.getElementById( 'wpqp-ie-notices' );
		if ( ! container ) { return; }

		var cls = 'success' === type ? 'notice-success' : 'notice-error';
		container.innerHTML =
			'<div class="notice ' + cls + ' is-dismissible" style="margin-left:0">' +
			'<p>' + escapeHtml( message ) + '</p>' +
			'</div>';
		container.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );
	}

	function clearNotices() {
		var container = document.getElementById( 'wpqp-ie-notices' );
		if ( container ) { container.innerHTML = ''; }
	}

	function setLoading( btn, isLoading, defaultText, loadingText ) {
		btn.disabled   = isLoading;
		btn.textContent = isLoading ? loadingText : defaultText;
	}

	// =========================================================================
	// Export
	// =========================================================================

	function handleExport() {
		var btn = document.getElementById( 'wpqp-export-btn' );
		if ( ! btn ) { return; }

		var defaultText  = strings.downloadExport || btn.textContent;
		var loadingText  = strings.exporting      || '\u2026';

		btn.addEventListener( 'click', function () {
			clearNotices();
			setLoading( btn, true, defaultText, loadingText );

			var body = new FormData();
			body.append( 'action',      'wpqp_export_data' );
			body.append( '_ajax_nonce', cfg.nonce );

			fetch( cfg.ajaxUrl, { method: 'POST', body: body, credentials: 'same-origin' } )
				.then( function ( r ) { return r.json(); } )
				.then( function ( response ) {
					setLoading( btn, false, defaultText, loadingText );

					if ( ! response.success ) {
						showNotice( 'error', ( response.data && response.data.message ) || 'Export failed.' );
						return;
					}

					var payload = response.data.data;
					var blob    = new Blob( [ JSON.stringify( payload, null, 2 ) ], { type: 'application/json' } );
					var url     = URL.createObjectURL( blob );

					var d       = new Date();
					var dateStr = d.getFullYear() + '-' +
						String( d.getMonth() + 1 ).padStart( 2, '0' ) + '-' +
						String( d.getDate() ).padStart( 2, '0' );
					var filename = 'wpqp-export-' + dateStr + '.json';

					var a = document.createElement( 'a' );
					a.href     = url;
					a.download = filename;
					document.body.appendChild( a );
					a.click();
					document.body.removeChild( a );
					URL.revokeObjectURL( url );

					showNotice( 'success', strings.exportSuccess || 'Exported successfully.' );
				} )
				.catch( function () {
					setLoading( btn, false, defaultText, loadingText );
					showNotice( 'error', strings.importError || 'Export failed. Please try again.' );
				} );
		} );
	}

	// =========================================================================
	// File input → populate textarea
	// =========================================================================

	function handleFileInput() {
		var fileInput = document.getElementById( 'wpqp-import-file' );
		var textarea  = document.getElementById( 'wpqp-import-json' );
		if ( ! fileInput || ! textarea ) { return; }

		fileInput.addEventListener( 'change', function () {
			var file = fileInput.files[ 0 ];
			if ( ! file ) { return; }

			var reader    = new FileReader();
			reader.onload = function ( e ) {
				textarea.value = e.target.result;
			};
			reader.readAsText( file );
		} );
	}

	// =========================================================================
	// Import
	// =========================================================================

	function handleImport() {
		var form = document.getElementById( 'wpqp-import-form' );
		if ( ! form ) { return; }

		form.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			clearNotices();

			var textarea = document.getElementById( 'wpqp-import-json' );
			var modeEl   = form.querySelector( 'input[name="wpqp_import_mode"]:checked' );
			var btn      = document.getElementById( 'wpqp-import-btn' );

			var jsonStr     = textarea  ? textarea.value.trim() : '';
			var mode        = modeEl    ? modeEl.value          : 'merge';
			var defaultText = strings.import   || ( btn ? btn.textContent : 'Import' );
			var loadingText = strings.importing || '\u2026';

			if ( ! jsonStr ) {
				showNotice( 'error', strings.noFileSelected || 'Please paste JSON data or select a file.' );
				return;
			}

			// Validate JSON client-side before sending.
			var parsed;
			try {
				parsed = JSON.parse( jsonStr );
			} catch ( err ) {
				showNotice( 'error', strings.invalidFile || 'Invalid JSON format.' );
				return;
			}

			if ( ! parsed || parsed.plugin !== 'wp-quick-palette' ) {
				showNotice( 'error', strings.invalidFile || 'Invalid export file.' );
				return;
			}

			if ( 'replace' === mode ) {
				var confirmMsg = strings.confirmReplace ||
					'This will replace all existing favorites and saved searches. Are you sure?';
				if ( ! window.confirm( confirmMsg ) ) {
					return;
				}
			}

			setLoading( btn, true, defaultText, loadingText );

			var body = new FormData();
			body.append( 'action',      'wpqp_import_data' );
			body.append( '_ajax_nonce', cfg.nonce );
			body.append( 'data',        jsonStr );
			body.append( 'mode',        mode );

			fetch( cfg.ajaxUrl, { method: 'POST', body: body, credentials: 'same-origin' } )
				.then( function ( r ) { return r.json(); } )
				.then( function ( response ) {
					setLoading( btn, false, defaultText, loadingText );

					if ( ! response.success ) {
						var msg = ( response.data && response.data.message ) ||
							strings.importError || 'Import failed.';
						showNotice( 'error', msg );
						return;
					}

					var d     = response.data;
					var parts = [];

					if ( d.imported_favorites > 0 ) {
						parts.push( d.imported_favorites + ' ' + ( strings.favoritesImported || 'favorites imported' ) );
					}
					if ( d.imported_saved_searches > 0 ) {
						parts.push( d.imported_saved_searches + ' ' + ( strings.searchesImported || 'saved searches imported' ) );
					}

					var successMsg;
					if ( parts.length > 0 ) {
						successMsg = ( strings.importSuccess || 'Import complete' ) + ': ' + parts.join( ', ' ) + '.';
					} else {
						successMsg = strings.noNewItems || 'No new items were added (all items already exist).';
					}

					showNotice( 'success', successMsg );

					// Reset form on success.
					if ( textarea ) { textarea.value = ''; }
					var fileInput = document.getElementById( 'wpqp-import-file' );
					if ( fileInput ) { fileInput.value = ''; }
				} )
				.catch( function () {
					setLoading( btn, false, defaultText, loadingText );
					showNotice( 'error', strings.importError || 'Import failed. Please try again.' );
				} );
		} );
	}

	// =========================================================================
	// Init
	// =========================================================================

	function init() {
		handleExport();
		handleFileInput();
		handleImport();
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );
