! function() {
	var workers = new WorkCrew("worker-bundle.min.js", navigator.hardwareConcurrency || 4);

	var tableDirective = {
		filename: {
			html: function() {
				return this.file + " <small>to " + this.type + "</small>";
			}
		},
		status: {
			html: function(target) {
				switch (this.status) {
					case 0:
						$(target.element).parent().addClass("success");
						return "Success!"
					case 1:
						return "<i class='icon-spinner animate-spin'></i> Processing..."
					case 2:
						target.element.innerHTML = "Failed";
						$(target.element).parent().addClass("error");
						$("<i class='icon-info'></i>").appendTo(target.element).qtip({
							content: {
								text: "<pre>" + this.errorMessage + "</pre> In other words, you probably didn't select a vaild " + (this.type == "WOFF" ? "TTF or OTF" : "WOFF") + " file.",
								title: "Program Output"
							},						
							hide: {
								fixed: true,
								delay: 300
							},
							style: {
								classes: 'qtip-bootstrap',
							},
							position: {
								my: 'bottom center', // Position my top left...
								at: 'top center', // at the bottom right of...
							}
						});
						break;
					case 3:
						target.element.innerHTML = "Success, but with warnings";
						$(target.element).parent().addClass("warning");
						$("<i class='icon-info'></i>").appendTo(target.element).qtip({
							content: {
								text: "<pre>" + this.errorMessage + "</pre>",
								title: "Program Output"
							},						
							hide: {
								fixed: true,
								delay: 300
							},
							style: {
								classes: 'qtip-bootstrap',
							},
							position: {
								my: 'bottom center', // Position my top left...
								at: 'top center', // at the bottom right of...
							}
						});
						break;
				}
			}
		},
		"btn-download": {
			href: function() {
				return this.download
			},
			'data-disabled': function() {
				return String(this.status != 0 || this.status == 3);
			},
			download: function() {
				return (this.file.substr(0, this.file.lastIndexOf('.')) || this.file) + "." + this.type;
			}
		}
	};

	var dropZone = $("#dropZone")[0];
	dropZone.addEventListener('dragover', function(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	});
	dropZone.addEventListener('drop', function(e) {
		e.stopPropagation();
		e.preventDefault();
		var files = e.dataTransfer.files;
		$("#fileInput")[0].files = files;
	});

	$("#choose-button").click(function() {
		$("#fileInput").click();
	});

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
						workers.addWork({
							id: files.length,
							msg: {
								data: reader.result,
								job: "woff2sfnt"
							}
						}, [reader.result]);
						files.push({
							file: fileName,
							status: 1,
							download: null,
							type: "TTF or OTF"
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
						workers.addWork({
							id: files.length,
							msg: {
								data: reader.result,
								job: "sfnt2woff"
							}
						}, [reader.result]);
						files.push({
							file: fileName,
							status: 1,
							download: null,
							type: "WOFF"
						});
						$("#files").render(files, tableDirective);
					};
				}
				reader.readAsArrayBuffer(tthis.files[i]);
			}(this);
		}
	});
	workers.oncomplete = function(result) {
		if (result.result.data.status == "success" && !~result.result.data.error.indexOf('error')) {
			result.result.data.error == "" ? files[result.id].status = 0 : files[result.id].status = 3;
			files[result.id].download = URL.createObjectURL(new Blob([result.result.data.data], {
				type: 'application/octet-stream'
			}));
			if (result.result.data.job == "woff2sfnt") {
				var data = new Uint8Array(result.result.data.data);
				if (data[0] == 0x00 && data[1] == 0x01 && data[2] == 0x00 && data[3] == 0x00 && data[4] == 0x00) {
					// It's a TTF!
					files[result.id].type = "ttf";
				} else {
					// It's probably an OTF!
					files[result.id].type = "otf";
				}
			}

			$("#files").render(files, tableDirective);
		} else {
			files[result.id].status = 2;
			files[result.id].errorMessage = result.result.data.error;
			$("#files").render(files, tableDirective);
		}
	}
	files = [];

	$("#files").render(files, tableDirective);

	$("#zipdownload").click(function() {
		var zip = new JSZip();
		var needed = 0,
			zipped = 0;
		for (var i = 0; i < files.length; i++) {
			needed++;
			if (files[i].status == 0) {
				// ugly scope hack
				! function(name, bloburl) {
					var xhr = new XMLHttpRequest();
					xhr.open('GET', bloburl, true);
					xhr.responseType = 'arraybuffer';
					xhr.onload = function(e) {
						zipped++;
						if (this.status == 200) {
							zip.file(name, this.response);
						}
						if (needed == zipped) {
							var blob = zip.generate({
								type: "blob"
							});
							saveAs(blob, "download.zip");
						}
					};
					xhr.send();
				}((files[i].file.substr(0, files[i].file.lastIndexOf('.')) || files[i].file) + "." + files[i].type, files[i].download);
			}
		}
	});
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