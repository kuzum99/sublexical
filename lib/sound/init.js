
;

soundManager.setup({
	  url: 'lib/sound/swf/',
	  // optional: use 100% HTML5 mode where available
	  // preferFlash: false,
	  onready: function() {
		var dimdom = soundManager.createSound({
		  id: 'dimdom',
		  url: 'lib/sound/dimdom.mp3'
		});
	  },
	  ontimeout: function() {
		// Hrmm, SM2 could not start. Missing SWF? Flash blocked? Show an error, etc.?
	  }
});	