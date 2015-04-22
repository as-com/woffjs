! function() {
	var sfnt2woff = new WorkCrew("sfnt2woff.min.js", navigator.hardwareConcurrency || 4);
	var woff2sfnt = new WorkCrew("woff2sfnt.min.js", navigator.hardwareConcurrency || 4);

	var tableDirective = {
		filename: {
			html: function() {
				return this.file
			}
		},
		status: {
			html: function() {
				switch (this.status) {
					case 0:
						return "Done!"
					case 1:
						return "Processing..."
				}
			}
		},
		"btn-download": {
			href: function() {
				return this.download
			},
			'data-disabled': function() {
				return String(this.status != 0);
			},
			download: function() {
				return (this.file.substr(0, this.file.lastIndexOf('.')) || this.file) + "." + this.type;
			}
		}
	};

	$("#fileInput").on("change", function() {
		for (var i = 0; i < this.files.length; i++) {
			// ugly scope workaround
			! function(tthis) {
				var reader = new FileReader();
				var fileName = tthis.files[i].name;
				if (fileName.split('.').pop().toUpperCase() == "WOFF") {
					// It's a WOFF!
					reader.onload = function() {
						// woff2sfnt.postMessage({
						// 	'name': (fileName.substr(0, fileName.lastIndexOf('.')) || fileName),
						// 	'data': reader.result
						// }, [reader.result]);
						woff2sfnt.addWork({
							id: files.length,
							msg: {
								name: "placeholder",
								data: reader.result
							}
						}, [reader.result]);
						files.push({
							file: fileName,
							status: 1,
							download: null
						});
						$("#files").render(files, tableDirective);
					};
				} else {
					// It's not a WOFF!
					reader.onload = function() {
						// sfnt2woff.postMessage({
						// 	'name': (fileName.substr(0, fileName.lastIndexOf('.')) || fileName),
						// 	'data': reader.result
						// }, [reader.result]);
						sfnt2woff.addWork({
							id: files.length,
							msg: {
								name: "placeholder",
								data: reader.result
							}
						}, [reader.result]);
						files.push({
							file: fileName,
							status: 1,
							download: null,
							type: "woff"
						});
						$("#files").render(files, tableDirective);
					};
				}
				reader.readAsArrayBuffer(tthis.files[i]);
			}(this);
		}
	});

	sfnt2woff.oncomplete = function(result) {
		files[result.id].status = 0;
		files[result.id].download = URL.createObjectURL(new Blob([result.result.data.data], {
			type: 'application/octet-stream'
		}));
		$("#files").render(files, tableDirective);
	}
	woff2sfnt.oncomplete = function(result) {
		files[result.id].status = 0;
		files[result.id].download = URL.createObjectURL(new Blob([result.result.data.data], {
			type: 'application/octet-stream'
		}));
		var data = new Uint8Array(result.result.data.data);
		if (data[0] == 0x00 && data[1] == 0x01 && data[2] == 0x00 && data[3] == 0x00 && data[4] == 0x00) {
			// It's a TTF!
			files[result.id].type = "ttf";
		} else {
			// It's probably an OTF!
			files[result.id].type = "otf";
		}
		$("#files").render(files, tableDirective);
	}
	files = [];

	$("#files").render(files, tableDirective);
}();

// sfnt2woff.addEventListener('message', function(e) {
// 	alert(e.data.stderr);
// 	var blob = new Blob([e.data.data], {
// 		type: 'application/font-woff'
// 	});
// 	var url = URL.createObjectURL(new Blob([e.data.data], {
// 		type: 'application/font-woff'
// 	}));

// 	document.write("<a href='" + url + "' download='" + e.data.name + ".woff'>download</a>");
// });

// woff2sfnt.addEventListener('message', function(e) {
// 	alert(e.data.error);
// 	var data = new Uint8Array(e.data.data);
// 	var blob = new Blob([e.data.data], {
// 		type: 'application/font-woff'
// 	});
// 	var url = URL.createObjectURL(blob);

// 	// Detect TTF with magic numbers
// 	if (data[0] == 0x00 && data[1] == 0x01 && data[2] == 0x00 && data[3] == 0x00 && data[4] == 0x00) {
// 		// It's a TTF!
// 		document.write("<a href='" + url + "' download='" + e.data.name + ".ttf'>download</a>");
// 	} else {
// 		// It's probably an OTF!
// 		document.write("<a href='" + url + "' download='" + e.data.name + ".otf'>download</a>");
// 	}
// });