!function(){
	var sfnt2woff = new Worker("sfnt2woff.min.js");
	//sfnt2woff = new Worker("sfnt2woff.js"); // dev version
	// woff2sfnt = new Worker("woff2sfnt.js");
	var woff2sfnt = new Worker("woff2sfnt.min.js");

	$("#fileSubmit").click(function () {
		var reader = new FileReader();
		var fileName = $("#fileInput")[0].files[0].name;
		if (fileName.split('.').pop().toUpperCase() == "WOFF") {
			// It's a WOFF!
			reader.onload = function() {
				woff2sfnt.postMessage({
					'name': (fileName.substr(0, fileName.lastIndexOf('.')) || fileName),
					'data': reader.result
				}, [reader.result]);
			};
		} else {
			// It's not a WOFF!
			reader.onload = function() {
				sfnt2woff.postMessage({
					'name': (fileName.substr(0, fileName.lastIndexOf('.')) || fileName),
					'data': reader.result
				}, [reader.result]);
			};
		}
		reader.readAsArrayBuffer($("#fileInput")[0].files[0]);

	});

	sfnt2woff.addEventListener('message', function(e) {
		alert(e.data.stderr);
		var blob = new Blob([e.data.data], {type: 'application/font-woff'});
		var url = URL.createObjectURL(blob);

		document.write("<a href='" + url + "' download='" + e.data.name + ".woff'>download</a>");
	});

	woff2sfnt.addEventListener('message', function(e) {
		alert(e.data.error);
		var data = new Uint8Array(e.data.data);
		var blob = new Blob([e.data.data], {type: 'application/font-woff'});
		var url = URL.createObjectURL(blob);

	    // Detect TTF with magic numbers
	    if (data[0] == 0x00 && data[1] == 0x01 && data[2] == 0x00 && data[3] == 0x00 && data[4] == 0x00) {
	    	// It's a TTF!
	    	document.write("<a href='" + url + "' download='" + e.data.name + ".ttf'>download</a>");
	    } else {
	    	// It's probably an OTF!
	    	document.write("<a href='" + url + "' download='" + e.data.name + ".otf'>download</a>");
	    }
	});

	$.get("sfnt2woff.js.mem", function(data) {
		console.log("Preloaded sfnt2woff memory file");
	});
}();
