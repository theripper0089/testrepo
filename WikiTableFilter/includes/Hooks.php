<?php
namespace MediaWiki\Extension\WikiTableFilter;

use MediaWiki\Hook\BeforePageDisplayHook;
use OutputPage;
use Skin;

class Hooks implements BeforePageDisplayHook {
    public function onBeforePageDisplay( $out, $skin ): void {
        $out->addModules( [ 'ext.WikiTableFilter' ] );
    }
}
