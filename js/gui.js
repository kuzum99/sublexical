

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

	var localFiles = [];

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
	
	var runSimulation = function (simulationIndex) {

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
				featureFile: (conf.files.features) ? conf.dirname + conf.files.features : conf.files.features,
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
				constraintFile: conf.dirname + conf.files.constraints,
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
				trainingData: conf.dirname + conf.files.training,
				testingData: conf.dirname + conf.files.testing,
				outputFile: conf.files.output,
				downloadButton: "downloadify",
				aligner: Aligner,
				minProductiveSize: conf.learner.minProductiveSize,
				mutationType: conf.learner.mutationType,
				trainingSize: conf.learner.trainingSize,
				changeOrientations: {
					delete: conf.learner.changeOrientations.delete, 
					mutate: conf.learner.changeOrientations.mutate, 
					metathesize: conf.learner.changeOrientations.metathesize
				}
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
	


    return {
        log: log,
        loadSimulation: loadSimulation,
        runSimulation: runSimulation,
        initialize: initialize,
        showFile: showFile,
        localFiles:localFiles
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


	Dropzone.autoDiscover = false;
	var myDropzone = new Dropzone("#dropzone", { url: "javascript:void(0);"});
	myDropzone.on("addedfile", function(file) {

		var reader = new FileReader();
		reader.readAsText(file);
		reader.onload = function(evt) {
//			console.log();
			acceptedFile(file.name, evt.target.result);
		};
		
		var acceptedFile = function (filename, fileAsString) {
			$(".dz-preview").hide()

			var guessType = "unknown";
			if (/train/.test(filename)) { guessType = "train" };
			if (/test/.test(filename))  { guessType = "test" };
			if (/con/.test(filename))   { guessType = "cons" };
			if (/conf/.test(filename))  { guessType = "conf" }; // order matters here
			if (/feat/.test(filename))  { guessType = "feat" };

			$("<div/>").append(
				$('<div/>',{text: filename, style:'min-width:12em; display: inline-block;'}),
				$('<select/>',{id: "filetype" + GUI.localFiles.length}).append(
					$('<option/>',{text: "training",      selected: guessType=="train"  }) ,
					$('<option/>',{text: "testing",       selected: guessType=="test"   }) , 
					$('<option/>',{text: "constraints",   selected: guessType=="cons"   }) ,
					$('<option/>',{text: "configuration", selected: guessType=="conf"   }) , 
					$('<option/>',{text: "features",      selected: guessType=="feat"   }) , 
					$('<option/>',{text: "unknown",       selected: guessType=="unknown"})
				)
			).appendTo("#files");
			GUI.localFiles.push({name: filename, content: fileAsString, type: guessType});
			guessName();
			$("#file_save").show();
		}
		
		var guessName = function() {
			if(true) {
				for (var i=0; i<GUI.localFiles.length; i++) {
					if (GUI.localFiles[i].type==="conf") {
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



























