

var GUI = (function($, undefined){
	
	var browserStupidityTimeout = 10;	

    var initialized = false;
    
    var cgiURL = "cgi/listConfigFiles.cgi" + "?rand=" + Math.random(1);

	var logs = [];
    var log = function (message) {
    	console.log(message);
        //logs.push(message);
    }
    var outputLog = function () {
    	for (var i=0; i<logs.length; i++) {
			$("#console").append(logs[i] + "<br>");
			$("#console").scrollTop($("#console").prop("scrollHeight"));
    	}
    	logs = [];
    }

	var localFiles = []; // the files in the current upload batch
	var localConfigurations = []; // the simulations in local storage

	var configurations = [];
	var dirname;
	
	var downloadify = $("<div/>",{id: "downloadify"});
	
	var initialize = function (obj) {


		// list all folders and configuration files
		// skips folders without config files in them
		FileManager.loadJSON(cgiURL, true, function(data){
			// data contains info about all the simulations, by folder
			for (var i=0; i<data.length; i++) {
				var folder = data[i];
				
				$('<div/>', {text: folder.folderprettyname, class: "dirname"}).appendTo("#Remote");
				for (var j=0; j<folder.files.length; j++) {
					var conf = folder.files[j].content;
					conf.filename = folder.files[j].filename;
					conf.dirname = "examples/" + folder.foldername + "/";
					conf.dirprettyname = folder.folderprettyname;
					configurations.push(conf);
					$('<div/>', {class: "conf_title"      , onclick: "GUI.loadSimulation(" + (configurations.length-1) + ")" }).html(conf.name).appendTo("#Remote");
					$('<div/>', {class: "conf_description", onclick: "GUI.loadSimulation(" + (configurations.length-1) + ")" }).html(conf.description).appendTo("#Remote");
				}
			}
		})
		
/*		var remoteFolders = ls("examples/"); 
		
		for (var i=0; i<remoteFolders.length; i++) {
			var prettyname = getName(remoteFolders[i]);
			var confFiles = listConfigFiles(remoteFolders[i], prettyname);
			if (confFiles.found>0) {
				$('<div/>', {text: prettyname, class: "dirname"}).appendTo("#Remote");
				confFiles.target.appendTo("#Remote");
				//$("#Remote").append();
			}
		}
*/

	}
	
	

	
/*	var ls = function (dirname, regx) {
		// returns a list of text files in a folder
		// assumes the server allows directory listing
		if (regx) {
			regx = new RegExp(regx);
		}
		var patt = new RegExp('.*href="([^"]+)"');

		if (dirname) {
			var files = []; 
			FileManager.loadText(dirname);
			var temp = FileManager.get();
			for (var i=0; i<temp.length; i++){
				// find text files
				var file = patt.exec(temp[i].toString());
				if (file) { 
					file = file[1];

					if (regx) {
						// regex specified, only return files that match it
						if (regx.test(file)) {
							files.push(dirname + file);
						}
					} else {
						// no regex, return all files
						files.push(dirname + file);
					}
				}
			}
			return files;
		}
		return null;
	}

	var getName = function (dirname) {
		var name = ls(dirname, "^_name")[0];
		if (name) {
			FileManager.loadText(name);
			name = FileManager.get()[0][0];
		} else {
			name = /([^\/]*)\/?$/.exec(dirname)[1];
		}
		return(name);
	}

	
	var listConfigFiles = function (dirname, dirprettyname) {

		var found = 0;
		var target = $('<div/>', {text:""}); // new blank div

		var files = ls(dirname, "^_conf"); // get only files that start with "_conf"
		if (files && files.length) {
			found = files.length;
			for (var i=0; i<files.length; i++) {
				FileManager.loadJSON(files[i]);
				var conf = FileManager.get()[0];
				if (conf) {
					conf.dirname = dirname;
					conf.dirprettyname = dirprettyname;
					configurations.push(conf);
					$('<div/>', {class: "conf_title"      , onclick: "GUI.loadSimulation(" + (configurations.length-1) + ")" }).html(conf.name).appendTo(target);
					$('<div/>', {class: "conf_description", onclick: "GUI.loadSimulation(" + (configurations.length-1) + ")" }).html(conf.description).appendTo(target);
					//var html = "<span class=>" + conf.name + "</span> ";
					//html += "<button type='button' onClick='GUI.loadSimulation(" + (configurations.length-1) + "); return false;'>  Learn  </button><br>";
					//html += "<span class='conf_description'>" + conf.description + "</span><br><br>";
					//target.html(html);
				}
			}
			if (configurations.length==0) {
			target.html("No well-formed configuration files found.");
			}
			
		} else {
			target.html("No configuration files found.");
		}
		return({found: found, target: target});
	}
*/


/*
	var updateStatus = function (message) {
		$("#status").append(message + "<br>");
		$("#status").scrollTop($("#status").prop("scrollHeight"));
	}
*/

	var loadLocalSimulation = function(simulationIndex) {

		var key = Object.keys(localStorage)[simulationIndex];
		var files = JSON.parse(localStorage.getItem(key))
		var conf = {};
		for (var i=0; i<files.length; i++){
			if(files[i].type && files[i].type==="configuration") {
				conf = JSON.parse(files[i].content);
			}
		}
		console.log(conf);
		for (var i=0; i<files.length; i++){
			if(files[i].type && files[i].type==="constraints") {
				conf.files.constraints = JSON.parse(files[i].content);
			}
			if(files[i].type && files[i].type==="training") {
				conf.files.training = JSON.parse(files[i].content);
			}
			if(files[i].type && files[i].type==="testing") {
				conf.files.testing = JSON.parse(files[i].content);
			}
		}
		
		
		$("#local_downloadify").hide();
		$("#local_simulationtitle").html(
			key + "<br><br>"
		);
		$("#local_status").html(
			$('<a/>', {
				text: "Learn", 
				href: "javascript:void(" +  Math.random(1) + ");" , 
				onclick: "GUI.runSimulation(" + (simulationIndex) + ",'local')"
			})
		);

		$("#local_status").show();
		
		var featureFileText;
		if (conf.files.features) {
			featureFileText = "<span class='hand' onClick='GUI.showFile(\"" + conf.dirname + conf.files.features + "\")'>" + conf.files.features + "</span>";
		} else {
			featureFileText = "<span class='hand' onClick='GUI.showFile(\"" + Aligner.defaultFeatureFile + "\")'>" + "(default)" + "</span>";
		}
		

		$("#local_params").html("");
		$("#local_params").append(
			"<br>Files:" +
			"<ul>" + 
			"<li><span style='min-width:6em; display: inline-block;'>Training:</span> " + "<span class='hand' onClick='GUI.showFile(\"" + conf.files.training +"\")'>" + conf.files.training + "</span>" +
			"<li><span style='min-width:6em; display: inline-block;'>Testing:</span> " + "<span class='hand' onClick='GUI.showFile(\"" + conf.files.testing +"\")'>" + conf.files.testing + "</span>" +
			"<li><span style='min-width:6em; display: inline-block;'>Constraints:</span> " + "<span class='hand' onClick='GUI.showFile(\"" + conf.files.constraints +"\")'>" + conf.files.constraints + "</span>" +
			"<li><span style='min-width:6em; display: inline-block;'>Features:</span> " + featureFileText + 
			"</ul>" + 
			"Learning parameters:" +
			"<ul>" +
			"<li><span style='min-width:12em; display: inline-block;'>Learning data size:</span> " +   conf.learner.howMuchTraining + 
			"<li><span style='min-width:12em; display: inline-block;'>Minimal sublexicon size:</span> " + conf.learner.minProductiveSize +
			"<li><span style='min-width:12em; display: inline-block;'>Mutation type:</span> " + conf.learner.mutationType +
			"<li><span style='min-width:12em; display: inline-block;'>Mutation orientation:</span> " +  conf.learner.changeOrientations.mutate + 
			"<li><span style='min-width:12em; display: inline-block;'>Deletion orientation:</span> " + conf.learner.changeOrientations["delete"] + 
			"<li><span style='min-width:12em; display: inline-block;'>Metathesis orientation:</span> " + conf.learner.changeOrientations.metathesize +
			"</ul>"  
		);
		
		$("body").animate({scrollTop:0}, 'slow');


	}

	var loadSimulation = function (simulationIndex) {
	
		var conf = configurations[simulationIndex];
		
		$("#downloadify").hide();
		$("#simulationtitle").html(
			conf.dirprettyname + " / " + conf.name + "<br><br>"
		);
		$("#status").html(
			$('<a/>', {
				text: "Learn", 
				href: "javascript:void(" +  Math.random(1) + ");" , 
				onclick: "GUI.runSimulation(" + (simulationIndex) + ")"
			})
		);

		$("#status").show();
		
		var featureFileText;
		if (conf.files.features) {
			featureFileText = "<span class='hand' onClick='GUI.showFile(\"" + conf.dirname + conf.files.features + "\")'>" + conf.files.features + "</span>";
		} else {
			featureFileText = "<span class='hand' onClick='GUI.showFile(\"" + Aligner.defaultFeatureFile + "\")'>" + "(default)" + "</span>";
		}
		

		$("#params").html("");
		$("#params").append(
			"<br>Files:" +
			"<ul>" + 
			"<li><span style='min-width:6em; display: inline-block;'>Training:</span> " + "<span class='hand' onClick='GUI.showFile(\"" + conf.dirname + conf.files.training +"\")'>" + conf.files.training + "</span>" +
			"<li><span style='min-width:6em; display: inline-block;'>Testing:</span> " + "<span class='hand' onClick='GUI.showFile(\"" + conf.dirname + conf.files.testing +"\")'>" + conf.files.testing + "</span>" +
			"<li><span style='min-width:6em; display: inline-block;'>Constraints:</span> " + "<span class='hand' onClick='GUI.showFile(\"" + conf.dirname + conf.files.constraints +"\")'>" + conf.files.constraints + "</span>" +
			"<li><span style='min-width:6em; display: inline-block;'>Features:</span> " + featureFileText + 
			"</ul>" + 
			"Learning parameters:" +
			"<ul>" +
			"<li><span style='min-width:12em; display: inline-block;'>Learning data size:</span> " +   conf.learner.howMuchTraining + 
			"<li><span style='min-width:12em; display: inline-block;'>Minimal sublexicon size:</span> " + conf.learner.minProductiveSize +
			"<li><span style='min-width:12em; display: inline-block;'>Mutation type:</span> " + conf.learner.mutationType +
			"<li><span style='min-width:12em; display: inline-block;'>Mutation orientation:</span> " +  conf.learner.changeOrientations.mutate + 
			"<li><span style='min-width:12em; display: inline-block;'>Deletion orientation:</span> " + conf.learner.changeOrientations["delete"] + 
			"<li><span style='min-width:12em; display: inline-block;'>Metathesis orientation:</span> " + conf.learner.changeOrientations.metathesize +
			"</ul>"  
		);
		
		$("body").animate({scrollTop:0}, 'slow');

	}

	var showFile = function(file) {
		console.log(file);
		window.open(file, '_blank');
	}
	
	var runSimulation = function (simulationIndex, local) {

		//console.log(configurations[simulationIndex]);

		var conf = configurations[simulationIndex];

		if (typeof Promise !== "undefined" && Promise.toString().indexOf("[native code]") !== -1){
			// all is good, browser has support for promises
		} else {
			$("#status").html("Error: your browser is not supported. Please try Firefox or Chrome.");
			$("#status").css('color', 'red');
			return null;
		}


		var promise = new Promise(function(resolve, reject) {
		  if (true) {
			resolve(null);
		  }
		  else {
			reject(Error("It broke"));
		  }
		});


		promise.then( function() {
			//
			
		}).then( function() {
			$("#status").html("Working...");
		}).then( function() {
			Aligner.initialize({
				onscreen: false,
				FeatureManager: FeatureManager,
				featureFile:  (conf.files.features) ? conf.dirname + conf.files.features : conf.files.features,
				features: conf.dirname + conf.aligner.features,
				insert_delete: 1.5,
				substitution: 2,
				swap: conf.aligner.swap || 8,
				tolerance: 0,
				debug: false,
			});
		}).then( function() {
			outputLog();
		}).then( function() {
			Grammar.initialize({
				constraintFile: (local) ? conf.files.constraints :  conf.dirname + conf.files.constraints,
		        useGaussianPriors: conf.grammar.useGaussianPriors,
				defaultSigma: conf.grammar.defaultSigma
			});
		}).then( function() {
			outputLog();
		}).then( function() {
			//updateStatus("Initializing MaxEnt module...");
		}).then( function() {
			Maxent.initialize({
				iterationCount: conf.maxent.iterationCount,
				learningRate: conf.maxent.learningRate,
				noPositiveWeights: conf.maxent.noPositiveWeights,
				initialWeight: conf.maxent.initialWeight
			});
		}).then( function() {
			outputLog();
		}).then( function() {
			//updateStatus("Initializing learner...");
		}).then( function() {
			var status = Learner.initialize({
				trainingData: (local) ? conf.files.training : conf.dirname + conf.files.training,
				testingData: (local) ? conf.files.testing : conf.dirname + conf.files.testing,
				outputFile: conf.files.output,
				downloadButton: "downloadify",
				aligner: Aligner,
				minProductiveSize: conf.learner.minProductiveSize,
				mutationType: conf.learner.mutationType,
				trainingSize: conf.learner.howMuchTraining,
				changeOrientations: {
					delete: conf.learner.changeOrientations.delete, 
					mutate: conf.learner.changeOrientations.mutate, 
					metathesize: conf.learner.changeOrientations.metathesize
				},
				useGrammarsProper: conf.learner.useGrammarsProper
			});
			
			if (status===0) {
				// no sublexicons
				$("#status").html("No sublexicons were constructed.");
			} else {
				// sublexicons, provide download link
				$("#status").hide();
				$("#downloadify").show();
			}
			
		}).then( function() {
			outputLog();
		}).catch(function(err) {
			// something bad happened
			console.error(err.stack);
			$("#status").html("Error");
			$("#status").css('color', 'red');
	        soundManager.play("dimdom");
    	    document.title = "(error) " + document.title;
		})
		;
		


		
	}
	
	var fileToId = function (name) {
		// stupid function makes file names into id's that jquery doesn't hate
		name = encodeURI(name);
		name = name
			.replace(/\-/g, "%2D")
			.replace(/\_/g, "%5F")
			.replace(/\./g, "%2E")
			.replace(/\!/g, "%21")
			.replace(/\~/g, "%7E")
			.replace(/\*/g, "%2A")
			.replace(/\'/g, "%27")
			.replace(/\(/g, "%28")
			.replace(/\)/g, "%29")
		;
		name = name.replace(/\%/g,"_");
		return name;
	}
	
	var saveSimulation = function () {
		var hasTraining = false;
		for (var i=0; i<Object.keys(localFiles).length; i++) {
			var f = Object.keys(localFiles)[i];
			if (localFiles[f].type==="training") { hasTraining = true };
			//console.log(localFiles[f]);
		}
		var name = $("#file_save input")[0].value || "(unnamed)";
		if (!hasTraining) {
			$("#file_save_feedback").html("No training file.").css('color', 'red');
		} else {
			localStorage.setItem(name , JSON.stringify(localFiles) );
			$("#file_save_feedback").html("Files saved.").css('color', 'black');
		}
	}


	var listLocalFiles = function() {

		$("#local_list_status").html("loading your files...<br>&nbsp;");
		$("#local_list").html("");
		
		var keys = Object.keys(localStorage);

		for (var i=0; i<keys.length; i++) {
			
			$('<div/>', {class: "conf_title title_local_delete", html:"✗", "data-name":keys[i]}).click( function() {
				console.log(this.dataset.name);
				localStorage.removeItem(this.dataset.name);
				listLocalFiles();
			}).appendTo("#local_list");
			$('<div/>', {html: keys[i], class: "conf_title title_local", onclick: "GUI.loadLocalSimulation(" + i + ")"}).appendTo("#local_list");

			var folder = JSON.parse( localStorage.getItem( keys[i] ) );
			for (var j=0; j<folder.length; j++) {
				if (folder[j].type==="configuration") {
					var c = JSON.parse(folder[j].content);
					if (c && c.description) {
						$('<div/>', {class: "conf_description", onclick: "GUI.loadLocalSimulation(" + i + ")"}).html(c.description).appendTo("#local_list");
					}
				}
			}
		}

		if (keys.length>0) {
			$("#local_list_status").hide();
		} else {
			$("#local_list_status").html("No local files found.");
		}



	}


    return {
        log: log,
        loadSimulation: loadSimulation,
        loadLocalSimulation: loadLocalSimulation,
        runSimulation: runSimulation,
        initialize: initialize,
        showFile: showFile,
        localFiles:localFiles,
        fileToId: fileToId,
        saveSimulation: saveSimulation,
        listLocalFiles: listLocalFiles
    };

})(jQuery);


$(document).ready(function(){

	GUI.initialize({
	});


	$('.tabs .tab-links a').on('click', function(e)  {
        var currentAttrValue = $(this).attr('href');
 
        // Show/Hide Tabs
        $('.tabs ' + currentAttrValue).show().siblings().hide();
 
        // Change/remove current tab to active
        $(this).parent('li').addClass('active').siblings().removeClass('active');
 
        e.preventDefault();
    });


	$("#tab2title").click( function() {
		GUI.listLocalFiles();
	});

	Dropzone.autoDiscover = false;
	var myDropzone = new Dropzone("#dropzone", { url: "javascript:void(0);"});
	$("#file_save_link").click(function(){ GUI.saveSimulation(); });
	myDropzone.on("addedfile", function(file) {

		var reader = new FileReader();
		reader.readAsText(file);
		reader.onload = function(evt) {
//			console.log();
			acceptedFile(file.name, evt.target.result);
		};
		
		var acceptedFile = function (filename, fileAsString) {
			$(".dz-preview").hide();
			
			$("#files").append(
				$("<div/>").append(
					$('<div/>',{text: filename, style:'min-width:12em; display: inline-block;'}),
					$('<select/>',{id: GUI.fileToId("file_" + filename)}).append(
						$('<option/>',{text: "training"      }) ,
						$('<option/>',{text: "testing"       }) , 
						$('<option/>',{text: "constraints"   }) ,
						$('<option/>',{text: "configuration" }) , 
						$('<option/>',{text: "features"      }) , 
						$('<option/>',{text: "unknown",       selected: true})
					).change(
						function() {
							
							//console.log(this.id);
							//console.log(this[this.selectedIndex].value);
							for (var i=0; i<GUI.localFiles.length; i++) {
								if (GUI.localFiles[i].name===this.id) {
									GUI.localFiles[i].type = this[this.selectedIndex].value;
								}
							}
							//GUI.localFiles[this.id].type = this[this.selectedIndex].value;
							//console.log(GUI.localFiles[this.id]);
						}
					)
				)
			);
			var guessType = "unknown";
			if (/train/.test(filename)) {guessType = "training"     ; $("#" + GUI.fileToId("file_" + filename))[0].selectedIndex = 0; };
			if (/test/.test(filename))  {guessType = "testing"      ; $("#" + GUI.fileToId("file_" + filename))[0].selectedIndex = 1; };
			if (/con/.test(filename))   {guessType = "constraints"  ; $("#" + GUI.fileToId("file_" + filename))[0].selectedIndex = 2; };
			if (/conf/.test(filename))  {guessType = "configuration"; $("#" + GUI.fileToId("file_" + filename))[0].selectedIndex = 3; }; // order matters here
			if (/feat/.test(filename))  {guessType = "features"     ; $("#" + GUI.fileToId("file_" + filename))[0].selectedIndex = 4; };
			
			GUI.localFiles.push(
				{name: GUI.fileToId("file_" + filename), content: fileAsString, type: guessType}
			);
			guessName();
			$("#file_save").show();
		}
		
		var guessName = function() {
			if (true) {
				for (var i=0; i<GUI.localFiles.length; i++) {
					if (GUI.localFiles[i].type==="configuration") {
						var c = JSON.parse(GUI.localFiles[i].content);
						if (c && c.name) {
							$("#file_save input")[0].value = c.name;
						}
					}
				}
			}
		}
		
		
	});
	/*  myDropzone.on("error", function(file, err, xhr) { 
		console.log(file); 
		console.log("d" + err); 
		console.log(xhr); 
	}); */

});



























