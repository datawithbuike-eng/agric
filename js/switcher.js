/* ---------------------------------------------------------------------- */
/*	Style Switcher
/* ---------------------------------------------------------------------- */

var enable_switcher = true;

jQuery(document).ready(function($) {
	
	'use strict';

	if ( enable_switcher ) {
		var currentColor1 = getCookie( 'cookie_color1' ),
			currentColor2 = getCookie( 'cookie_color2' ),
			currentColor3 = getCookie( 'cookie_color3' ),
			enableStickyMenu = getCookie( 'cookie_enable_sm' );
		
		if ( currentColor1 ) {
			$( '#primary-color' ).attr( 'href', 'css/primary-color/' + currentColor1 + '.css' );
		} else {
			currentColor1 = 'royal-blue';
		}
		if ( currentColor2 ) {
			$( '#secondary-color' ).attr( 'href', 'css/secondary-color/' + currentColor2 + '.css' );
		} else {
			currentColor2 = 'orange';
		}
		if ( currentColor3 ) {
			$( '#extra-color' ).attr( 'href', 'css/extra-color/' + currentColor3 + '.css' );
		} else {
			currentColor3 = 'red';
		}
		if ( enableStickyMenu ) {
			enable_sticky_menu = ( enableStickyMenu == 'true' ) ? true : false;
		}
		
		var $switcher = $('<div id="style-switcher"> \
								<span class="toggle-button"></span> \
								<h5 class="title-scheme text-uppercase">Color Scheme</h5> \
								<ul id="sw-color-schemes" class="thumbs clearfix"> \
									<li><a href="#" title="Royal Blue + Orange + Red" class="clearfix"> \
										<div data-sm="color1-sm" class="color1-royal-blue"></div> \
										<div data-sm="color2-sm" class="color2-orange"></div> \
										<div data-sm="color3-sm" class="color3-red"></div> \
									</a></li> \
									<li><a href="#" title="Sea Green + Carrot Orange + Red" class="clearfix"> \
										<div data-sm="color1-sm" class="color1-sea-green"></div> \
										<div data-sm="color2-sm" class="color2-carrot-orange"></div> \
										<div data-sm="color3-sm" class="color3-red"></div> \
									</a></li> \
									<li><a href="#" title="Royal Blue + Carrot Orange + Red" class="clearfix"> \
										<div data-sm="color1-sm" class="color1-royal-blue"></div> \
										<div data-sm="color2-sm" class="color2-carrot-orange"></div> \
										<div data-sm="color3-sm" class="color3-red"></div> \
									</a></li> \
									<li><a href="#" title="Sky Blue + Yellow + Red" class="clearfix"> \
										<div data-sm="color1-sm" class="color1-sky-blue"></div> \
										<div data-sm="color2-sm" class="color2-yellow"></div> \
										<div data-sm="color3-sm" class="color3-red"></div> \
									</a></li> \
									<li><a href="#" title="Red + Light Blue + Yellow" class="clearfix"> \
										<div data-sm="color1-sm" class="color1-red"></div> \
										<div data-sm="color2-sm" class="color2-light-blue"></div> \
										<div data-sm="color3-sm" class="color3-yellow"></div> \
									</a></li> \
									<li><a href="#" title="Blue + Carrot Orange + Red" class="clearfix"> \
										<div data-sm="color1-sm" class="color1-blue"></div> \
										<div data-sm="color2-sm" class="color2-carrot-orange"></div> \
										<div data-sm="color3-sm" class="color3-red"></div> \
									</a></li> \
									<li><a href="#" title="Blue + Orange Red + Yellow" class="clearfix"> \
										<div data-sm="color1-sm" class="color1-blue"></div> \
										<div data-sm="color2-sm" class="color2-orange-red"></div> \
										<div data-sm="color3-sm" class="color3-yellow"></div> \
									</a></li> \
								</ul> \
								<h5 class="title-color">Primary Color</h5> \
								<ul id="sw-color1" class="thumbs clearfix"> \
									<li><a href="#" title="Primary Color: Royal Blue"> \
										<div data-sm="color1-sm" class="color1-royal-blue"></div> \
									</a></li> \
									<li><a href="#" title="Primary Color: Blue"> \
										<div data-sm="color1-sm" class="color1-blue"></div> \
									</a></li> \
									<li><a href="#" title="Primary Color: Sky Blue"> \
										<div data-sm="color1-sm" class="color1-sky-blue"></div> \
									</a></li> \
									<li><a href="#" title="Primary Color: Sea Green"> \
										<div data-sm="color1-sm" class="color1-sea-green"></div> \
									</a></li> \
									<li><a href="#" title="Primary Color: Red"> \
										<div data-sm="color1-sm" class="color1-red"></div> \
									</a></li> \
								</ul> \
								<h5 class="title-color">Secondary Color</h5> \
								<ul id="sw-color2" class="thumbs clearfix"> \
									<li><a href="#" title="Secondary Color: Orange"> \
										<div data-sm="color2-sm" class="color2-orange"></div> \
									</a></li> \
									<li><a href="#" title="Secondary Color: Carrot Orange"> \
										<div data-sm="color2-sm" class="color2-carrot-orange"></div> \
									</a></li> \
									<li><a href="#" title="Secondary Color: Orange Red"> \
										<div data-sm="color2-sm" class="color2-orange-red"></div> \
									</a></li> \
									<li><a href="#" title="Secondary Color: Yellow"> \
										<div data-sm="color2-sm" class="color2-yellow"></div> \
									</a></li> \
									<li><a href="#" title="Secondary Color: Light Blue"> \
										<div data-sm="color2-sm" class="color2-light-blue"></div> \
									</a></li> \
								</ul> \
								<h5 class="title-color">Extra Color</h5> \
								<ul id="sw-color3" class="thumbs clearfix"> \
									<li><a href="#" title="Extra Color: Red"> \
										<div data-sm="color3-sm" class="color3-red"></div> \
									</a></li> \
									<li><a href="#" title="Extra Color: Yellow"> \
										<div data-sm="color3-sm" class="color3-yellow"></div> \
									</a></li> \
								</ul> \
								<h5 class="title-menu">Fixed (sticky) menu:</h5> \
								<div class="checkbox-fields"> \
									<input name="sm-enabled" type="checkbox" id="sticky-menu-mode"> \
									<label for="sticky-menu-mode">enable</label> \
								</div> \
								<a href="#" id="reset">Reset styles</a> \
							</div>');
		$switcher.insertAfter( '#footer-bottom' );
		
		$switcher.find( '#sw-color1 [data-sm="color1-sm"].color1-' + currentColor1 ).parent().addClass( 'active' );
		$switcher.find( '#sw-color2 [data-sm="color2-sm"].color2-' + currentColor2 ).parent().addClass( 'active' );
		$switcher.find( '#sw-color3 [data-sm="color3-sm"].color3-' + currentColor3 ).parent().addClass( 'active' );
		
		if ( enable_sticky_menu ) {
			$( '#sticky-menu-mode' ).prop( 'checked', true );
		}
		adjustStickyMenu();
		
		$switcher.find( '.toggle-button' ).on( 'click', function(e) {
			if ( $switcher.css( 'left' ) === '-200px' ) {
				$switcher.animate( { left: '0' } );
			} else {
				$switcher.animate( { left: '-200px' } );
			}
			return false;
		});
		
		// Check color scheme
		function checkColorScheme() {
			$switcher.find( '#sw-color-schemes li' ).each(function() {
				var color1Name = $( 'a [data-sm="color1-sm"]', this ).attr( 'class' ).substr(7),
					color2Name = $( 'a [data-sm="color2-sm"]', this ).attr( 'class' ).substr(7),
					color3Name = $( 'a [data-sm="color3-sm"]', this ).attr( 'class' ).substr(7);
				
				if ( color1Name == currentColor1 && color2Name == currentColor2 && color3Name == currentColor3 ) {
					$( 'a', this ).addClass( 'active' );
				} else {
					$( 'a', this ).removeClass( 'active' );
				}
			});
		}
		checkColorScheme();
		
		// Change color scheme
		$switcher.find( '#sw-color-schemes li a' ).on( 'click', function(e) {
			var color1Name = $( '[data-sm="color1-sm"]', this ).attr( 'class' ).substr(7),
				color2Name = $( '[data-sm="color2-sm"]', this ).attr( 'class' ).substr(7),
				color3Name = $( '[data-sm="color3-sm"]', this ).attr( 'class' ).substr(7),
				color1Button = $switcher.find( '#sw-color1 [data-sm="color1-sm"].color1-' + color1Name ).parent(),
				color2Button = $switcher.find( '#sw-color2 [data-sm="color2-sm"].color2-' + color2Name ).parent(),
				color3Button = $switcher.find( '#sw-color3 [data-sm="color3-sm"].color3-' + color3Name ).parent();
			
			changeMainColor1( color1Button );
			changeMainColor2( color2Button );
			changeMainColor3( color3Button );
			$( this ).parent().siblings().find( 'a' ).removeClass( 'active' );
			$( this ).addClass( 'active' );
			return false;
		});
		
		// Change main color 1
		$switcher.find( '#sw-color1 li a' ).on( 'click', function(e) {
			changeMainColor1( this );
			checkColorScheme();
			return false;
		});
		
		function changeMainColor1(a) {
			currentColor1 = $( '[data-sm="color1-sm"]', a ).attr( 'class' ).substr(7);
			$( '#primary-color' ).attr( 'href', 'css/primary-color/' + currentColor1 + '.css' );
			$( a ).parent().siblings().find( 'a' ).removeClass( 'active' );
			$( a ).addClass( 'active' );
			changeCookies();
		}
		
		// Change main color 2
		$switcher.find( '#sw-color2 li a' ).on( 'click', function(e) {
			changeMainColor2( this );
			checkColorScheme();
			return false;
		});
		
		function changeMainColor2( a ) {
			currentColor2 = $( '[data-sm="color2-sm"]', a ).attr( 'class' ).substr(7);
			$( '#secondary-color' ).attr( 'href', 'css/secondary-color/' + currentColor2 + '.css' );
			$( a ).parent().siblings().find( 'a' ).removeClass( 'active' );
			$( a ).addClass( 'active' );
			changeCookies();
		}
		
		// Change main color 3
		$switcher.find( '#sw-color3 li a' ).on( 'click', function(e) {
			changeMainColor3( this );
			checkColorScheme();
			return false;
		});
		
		function changeMainColor3( a ) {
			currentColor3 = $( '[data-sm="color3-sm"]', a ).attr( 'class' ).substr(7);
			$( '#extra-color' ).attr( 'href', 'css/extra-color/' + currentColor3 + '.css' );
			$( a ).parent().siblings().find( 'a' ).removeClass( 'active' );
			$( a ).addClass( 'active' );
			changeCookies();
		}
		
		$( '#sticky-menu-mode' ).on( 'change', function(e) {
			if ( $( this ).is( ':checked' ) ) {
				enable_sticky_menu = true;
			} else {
				enable_sticky_menu = false;
			}
			adjustStickyMenu();
			changeCookies();
        });
		
		// Reset settings
		$switcher.find( '#reset' ).on( 'click', function(e) {
			$( '#primary-color' ).attr( 'href', 'css/primary-color/royal-blue.css' );
			$( '#secondary-color' ).attr( 'href', 'css/secondary-color/orange.css' );
			$( '#extra-color' ).attr( 'href', 'css/extra-color/red.css' );
			
			$switcher.find( '#sw-color1 li a' ).removeClass( 'active' ).find( '.color1-royal-blue' ).parent().addClass( 'active' );
			$switcher.find( '#sw-color2 li a' ).removeClass( 'active' ).find( '.color2-orange' ).parent().addClass( 'active' );
			$switcher.find( '#sw-color3 li a' ).removeClass( 'active' ).find( '.color3-red' ).parent().addClass( 'active' );
			
			currentColor1 = 'royal-blue';
			currentColor2 = 'orange';
			currentColor3 = 'red';
			enable_sticky_menu = false;
			checkColorScheme();
			
			$( '#sticky-menu-mode' ).prop( 'checked', false );
			adjustStickyMenu();
			
			deleteCookie( 'cookie_color1', '/' );
			deleteCookie( 'cookie_color2', '/' );
			deleteCookie( 'cookie_color3', '/' );
			deleteCookie( 'cookie_enable_sm', '/' );
			
			return false;
		});
		
		// Change cookies
		function changeCookies() {
			var expiry = new Date();
			expiry.setTime( expiry.getTime() + 30*60*1000 );
			setCookie( 'cookie_color1', currentColor1, expiry.toGMTString(), '/' );
			setCookie( 'cookie_color2', currentColor2, expiry.toGMTString(), '/' );
			setCookie( 'cookie_color3', currentColor3, expiry.toGMTString(), '/' );
			setCookie( 'cookie_enable_sm', enable_sticky_menu.toString(), expiry.toGMTString(), '/' );
		}
		
	}
	
});

function setCookie ( name, value, expires, path, domain, secure ) {
	document.cookie = name + "=" + escape( value ) +
		( expires ? "; expires=" + expires : "" ) +
		( path ? "; path=" + path : "" ) +
		( domain ? "; domain=" + domain : "" ) +
		( secure ? "; secure" : "" );
}

function getCookie( name ) {
	var prefix = name + "=";
	var cookieStartIndex = document.cookie.indexOf( prefix );
	if ( cookieStartIndex == -1) {
		return null;
	}
	var cookieEndIndex = document.cookie.indexOf( ";", cookieStartIndex + prefix.length );
	if ( cookieEndIndex == -1 ) {
		cookieEndIndex = document.cookie.length;
	}
	return unescape( document.cookie.substring( cookieStartIndex + prefix.length, cookieEndIndex ) );
}
function deleteCookie( name, path, domain ) {
	if ( getCookie( name ) ) {
		document.cookie = name + "=" + ( path ? "; path=" + path : "" ) + ( domain ? "; domain=" + domain : "" ) + "; expires=Thu, 01-Jan-70 00:00:01 GMT";
	}
}


/* ---------------------------------------------------------------------- */
/*	Google Analytics code
/* ---------------------------------------------------------------------- */

if ( window.location.hostname == 'e-merald.com' ) {
	
	(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
		(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
		m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
	
	ga('create', 'UA-9112681-1', 'auto');
	ga('send', 'pageview');
	
}
