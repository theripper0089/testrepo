<?php

class WikiTableFilterHooks {

	/**
	 * Add welcome module to the load queue of all pages
	 */
	public static function onBeforePageDisplay( OutputPage &$out, Skin &$skin ) {
		$out->addModules( 'ext.WikiTableFilter' );

		$path = dirname(__FILE__);
		//file_put_contents($path.'/log_'.date("j.n.Y").'.txt', date("j.n.Y").': loaded'.PHP_EOL, FILE_APPEND);		
		// Always return true, indicating that parser initialization should
		// continue normally.

	}
	
}
