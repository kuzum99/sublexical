

var GUI = (function($, undefined){
	
	var browserStupidityTimeout = 10;	

    var initialized = false;
    var REMOTE = 1;
    var LOCAL = 2;
    
    var cgiURL = "cgi/listConfigFiles.cgi" + "?rand=" + Math.random(1);
	var defaultFeatureFile = "lib/default_feature_file.txt";
	var defaultConfigFile = "lib/default_config_file.txt";
	
	var title = "The Sublexical Learner";
	
	var defaultConf;

	FileManager.loadJSON(defaultConfigFile, false, function(data){
		defaultConf = data;
	});
	
	//console.log(defaultConf);

	var logs = [];
    var log = function (message) {
    	console.log(message);
        //logs.push(message);
    }
    var outputLog = function () {
    	/* for (var i=0; i<logs.length; i++) {
			$("#console").append(logs[i]);
			$("#console").scrollTop($("#console").prop("scrollHeight"));
    	}*/
    	logs = [];
    }

	var localFiles = []; // the files in the current upload batch

	var configurations = [];
	configurations[REMOTE] = [];
	configurations[LOCAL] = [];
	
	var conf; // the current configuration

	var dirname;
	
	//var downloadify = $("<div/>",{id: "downloadify"});
	
	var initialize = function (obj) {

		document.title = title;

		listSimulations(REMOTE);
		listSimulations(LOCAL);

	}



	var listSimulations = function (remoteness) {

		if(!remoteness) {remoteness = LOCAL};
		var destination = (remoteness===REMOTE) ? "#server" : "#local" ;

		$(destination + " .simulation_list_status").html("loading simulations...");
		$(destination + " .simulation_list").html("");

		if (remoteness===REMOTE) {
			var data = FileManager.loadJSON(cgiURL, true, function(data){
				for (var i=0; i<data.length; i++) {
					var folder = data[i];
					$('<div/>', {text: folder.folderprettyname, class: "dirname"}).appendTo(destination + " .simulation_list");
					for (var j=0; j<folder.files.length; j++) {
						var conf = folder.files[j].content;
						conf.filename = folder.files[j].filename;
						conf.dirname = "examples/" + folder.foldername + "/";
						conf.dirprettyname = folder.folderprettyname;
						configurations[remoteness].push(conf);
						$('<div/>', {class: "conf_title"      , onclick: "GUI.loadSimulation("+REMOTE+"," + (configurations[remoteness].length-1) + ")" }).html(conf.name).appendTo(destination + " .simulation_list");
						$('<div/>', {class: "conf_description", onclick: "GUI.loadSimulation("+REMOTE+"," + (configurations[remoteness].length-1) + ")" }).html(conf.description).appendTo(destination + " .simulation_list");
					}
				}
				//console.log(configurations[remoteness]);
				if (data.length>0) {
					$(destination + " .simulation_list_status").hide();
				} else {
					$(destination + " .simulation_list_status").html("No examples were found on the server.<br> Try again later.")
				}
			});
		}

		if (remoteness===LOCAL) {
			//console.log("listing local files");

			var keys = Object.keys(localStorage);
			for (var i=0; i<keys.length; i++) {
  
				$('<div/>', {class: "conf_title title_local_delete", html:"✗", "data-name":keys[i]}).click( function() {
					if (confirm("Delete this simulation?")) {
						localStorage.removeItem(this.dataset.name);
						GUI.listSimulations();
					}
				}).appendTo(destination + " .simulation_list");
				$('<div/>', {html: keys[i], class: "conf_title", onclick: "GUI.loadLocalSimulation(" + LOCAL + "," + i + ")"}).appendTo(destination + " .simulation_list");

				var description = "&nbsp;";
				// look for actual description
				var folder = JSON.parse( localStorage.getItem( keys[i] ) );
				for (var j=0; j<folder.length; j++) {
					if (folder[j].type==="configuration") {
						var c = JSON.parse(folder[j].content);
						description = (c && c.description) ? c.description : "&nbsp;";
					}
				}
				$('<div/>', {class: "conf_description", onclick: "GUI.loadLocalSimulation(" + LOCAL + "," + i + ")"}).html(description).appendTo(destination + " .simulation_list");
			}
			if (keys.length>0) {
				$(destination + " .simulation_list_status").hide();
			} else {
				$(destination + " .simulation_list_status").html("No local files found. <br> Go ahead and upload some!").show();
				//$(destination + " .simulation_current").html("");
			}
		}


	
	}	
	

	var loadLocalSimulation = function(remoteness, simulationIndex) {

		var key = Object.keys(localStorage)[simulationIndex];
		var files = JSON.parse(localStorage.getItem(key))

		var foundConf = false;
		for (var i=0; i<files.length; i++){
			if(files[i].type && files[i].type==="configuration") {
				foundConf = true;
				conf = JSON.parse(files[i].content);
			}
		}
		if (!foundConf) { 
			conf = defaultConf;
		};

		for (var i=0; i<files.length; i++){
			if(files[i].type && files[i].type==="constraints") {
				conf.files.constraints = {name: files[i].name , content: FileManager.stringToTable(files[i].content)};
			}
			if(files[i].type && files[i].type==="training") {
				conf.files.training =    {name: files[i].name , content: FileManager.stringToTable(files[i].content)};
			}
			if(files[i].type && files[i].type==="testing") {
				conf.files.testing =     {name: files[i].name , content: FileManager.stringToTable(files[i].content)};
			}
			if(files[i].type && files[i].type==="features") {
				conf.files.features =    {name: files[i].name , content: FileManager.stringToTable(files[i].content)};
			}
		}
		loadSimulation(remoteness, simulationIndex, key)
	}

	var loadSimulation = function (remoteness, simulationIndex, key) {

		if(!remoteness) {remoteness = LOCAL};
		var destination = (remoteness===REMOTE) ? "#server" : "#local" ;

		var key;
		var files;

		if (remoteness===REMOTE) {
			conf = {}; // empty out the current configuration
			conf = configurations[remoteness][simulationIndex];
		}
		if (!conf.learner) {conf.learner = defaultConf.learner};
		if (!conf.learner.changeOrientations) {conf.learner.changeOrientations = defaultConf.learner.changeOrientations};
		if (!conf.aligner) {conf.aligner = defaultConf.aligner}		
		if (!conf.maxent)  {conf.maxent  = defaultConf.maxent}

		$(destination + " .simulation_downloadify").hide();
		$(destination + " .simulation_title").html(
			(key) ? key : conf.dirprettyname + " / " + conf.name
		);
		$(destination + " .simulation_status").html(
			$('<a/>', {
				id: "learnbutton" + remoteness,
				text: "Learn", 
				href: "javascript:void(" +  Math.random(1) + ");" , 
				onclick: "GUI.runSimulation(" + remoteness + "," + (simulationIndex) + ")"
			})
		);

		$(destination + " .simulation_gray_text").show();
		$(destination + " .simulation_status").show();
		displaySimulationParameters(conf, remoteness);
		$("body").animate({scrollTop:0}, 'slow');
		$(destination + " .simulation_current").css("border-left", "1px solid");
	}

	var displaySimulationParameters = function (conf, remoteness) {

		if(!remoteness) {remoteness = LOCAL};
		var destination = (remoteness===REMOTE) ? "#server" : "#local" ;

		//var featureFileText = (conf.files.features) ? conf.files.features : "(default)";
		$(destination + " .simulation_params").html("");
		
		$(destination + " .simulation_params").append($('<div/>', {id: destination.slice(1) + "files-title", text: "Files", class: "title"}));
		$(destination + " .simulation_params").append($('<ul/>',{id: destination.slice(1) + "files" }));
		$(destination + "files").append(
			"<li><span class='simulation_file'>Training:</span>"    + "<span class='hand' onClick='GUI.showFile(\"training\")'>"    + ((remoteness===REMOTE) ? conf.files.training    : conf.files.training.name)    + "</span>" +
			"<li><span class='simulation_file'>Testing:</span>"     + "<span class='hand' onClick='GUI.showFile(\"testing\")'>"     + ((remoteness===REMOTE) ? conf.files.testing     : conf.files.testing.name)     + "</span>" +
			"<li><span class='simulation_file'>Constraints:</span>" + "<span class='hand' onClick='GUI.showFile(\"constraints\")'>" + ((remoteness===REMOTE) ? conf.files.constraints : conf.files.constraints.name) + "</span>" +
			"<li><span class='simulation_file'>Features:</span>"    + "<span class='hand' onClick='GUI.showFile(\"features\")'>"    + (((remoteness===REMOTE) ? conf.files.features    : (conf.files.features && conf.files.features.name))||"default")    + "</span>"
		)

		$(destination + " .simulation_params").append($('<div/>', {id: destination.slice(1) + "params-title", text: "Learning parameters", class: "title"}));
		$(destination + " .simulation_params").append($('<ul/>',  {id: destination.slice(1) + "params" }));
		$(destination + "params").append(
			"<li class='" + ((conf.learner.default                    || !conf.learner.preReductionProductivityThreshold ) ? "default" : "specified") + "'><span class='simulation_param'>Minimal hypothesis size:</span> "  + "<span class='simulation_value'>" + (conf.learner.preReductionProductivityThreshold || defaultConf.learner.preReductionProductivityThreshold) + "</span>" +
			"<li class='" + ((conf.learner.default                    || !conf.learner.minProductiveSize                 ) ? "default" : "specified") + "'><span class='simulation_param'>Minimal sublexicon size:</span> "  + "<span class='simulation_value'>" + (conf.learner.minProductiveSize                 || defaultConf.learner.minProductiveSize                ) + "</span>" +
			"<li class='" + ((conf.learner.default                    || !conf.learner.mutationType                      ) ? "default" : "specified") + "'><span class='simulation_param'>Mutation type:</span> "            + "<span class='simulation_value'>" + (conf.learner.mutationType                      || defaultConf.learner.mutationType                     ) + "</span>" +
			"<li class='" + ((conf.learner.changeOrientations.default || !conf.learner.changeOrientations.mutate         ) ? "default" : "specified") + "'><span class='simulation_param'>Mutation orientation:</span> "     + "<span class='simulation_value'>" + (conf.learner.changeOrientations.mutate         || defaultConf.learner.changeOrientations.mutate        ) + "</span>" +
			"<li class='" + ((conf.learner.changeOrientations.default || !conf.learner.changeOrientations.delete         ) ? "default" : "specified") + "'><span class='simulation_param'>Deletion orientation:</span> "     + "<span class='simulation_value'>" + (conf.learner.changeOrientations.delete         || defaultConf.learner.changeOrientations.delete        ) + "</span>" +
			"<li class='" + ((conf.learner.changeOrientations.default || !conf.learner.changeOrientations.metathesize    ) ? "default" : "specified") + "'><span class='simulation_param'>Metathesis orientation:</span> "   + "<span class='simulation_value'>" + (conf.learner.changeOrientations.metathesize    || defaultConf.learner.changeOrientations.metathesize   ) + "</span>" +
			"<li class='" + ((conf.learner.default                    || !conf.learner.howMuchTraining                   ) ? "default" : "specified") + "'><span class='simulation_param'>Learning data size:</span> "       + "<span class='simulation_value'>" + (conf.learner.howMuchTraining                   || defaultConf.learner.howMuchTraining                  ) + "</span>" +
			"<li class='" + ((conf.learner.default                    || !conf.learner.useGrammarsProper                 ) ? "default" : "specified") + "'><span class='simulation_param'>Use Grammars Proper:</span> "      + "<span class='simulation_value'>" + (conf.learner.useGrammarsProper                 || defaultConf.learner.useGrammarsProper                ) + "</span>" +
			"<li class='" + ((conf.learner.default                    || !conf.learner.vowelFeature                      ) ? "default" : "specified") + "'><span class='simulation_param'>Vowel feature:</span> "            + "<span class='simulation_value'>" + (conf.learner.vowelFeature                      || defaultConf.learner.vowelFeature                     ) + "</span>" +
			""
		);
		if(conf.learner.default) {
			$(destination + "params-title").addClass("default");
			$(destination + "params-title").append($('<div/>',{text: "+", class: "open", click: function(){ $(destination + "params").show() } }));
			$(destination + "params").hide();
		};

		

		$(destination + " .simulation_params").append($('<div/>', {id: destination.slice(1) + "maxent-title", text: "MaxEnt", class: "title"}));
		$(destination + " .simulation_params").append($('<ul/>',  {id: destination.slice(1) + "maxent" }));
		$(destination + "maxent").append(
			"<li class='" + ((conf.maxent.default || !conf.maxent.useGaussianPriors ) ? "default" : "specified") + "'><span class='simulation_param'>Use Gaussian priors:</span> " + "<span class='simulation_value'>" + (conf.maxent.useGaussianPriors || defaultConf.maxent.useGaussianPriors ) + "</span>" +
			"<li class='" + ((conf.maxent.default || !conf.maxent.defaultMu         ) ? "default" : "specified") + "'><span class='simulation_param'>Default &mu;:</span> "        + "<span class='simulation_value'>" + (conf.maxent.defaultMu         || defaultConf.maxent.defaultMu         ) + "</span>" +
			"<li class='" + ((conf.maxent.default || !conf.maxent.defaultSigma      ) ? "default" : "specified") + "'><span class='simulation_param'>Default &sigma;:</span> "     + "<span class='simulation_value'>" + (conf.maxent.defaultSigma      || defaultConf.maxent.defaultSigma      ) + "</span>" +
			"<li class='" + ((conf.maxent.default || !conf.maxent.iterationCount    ) ? "default" : "specified") + "'><span class='simulation_param'>Iteration count:</span> "     + "<span class='simulation_value'>" + (conf.maxent.iterationCount    || defaultConf.maxent.iterationCount    ) + "</span>" +
			"<li class='" + ((conf.maxent.default || !conf.maxent.learningRate      ) ? "default" : "specified") + "'><span class='simulation_param'>Learning rate:</span> "       + "<span class='simulation_value'>" + (conf.maxent.learningRate      || defaultConf.maxent.learningRate      ) + "</span>" +
			"<li class='" + ((conf.maxent.default || !conf.maxent.noPositiveWeights ) ? "default" : "specified") + "'><span class='simulation_param'>No positive weights:</span> " + "<span class='simulation_value'>" + (conf.maxent.noPositiveWeights || defaultConf.maxent.noPositiveWeights ) + "</span>" +
			"<li class='" + ((conf.maxent.default || !conf.maxent.initialWeight     ) ? "default" : "specified") + "'><span class='simulation_param'>Initial weight:</span> "      + "<span class='simulation_value'>" + (conf.maxent.initialWeight     || defaultConf.maxent.initialWeight     ) + "</span>" +
			""
		);
		if(conf.maxent.default) {
			$(destination + "maxent-title").addClass("default");
			$(destination + "maxent-title").append($('<div/>',{text: "+", class: "open", click: function(){ $(destination + "maxent").show() } }));
			$(destination + "maxent").hide();
		};



		$(destination + " .simulation_params").append($('<div/>', {id: destination.slice(1) + "align-title", text: "Alignment", class: "title"}));
		$(destination + " .simulation_params").append($('<ul/>',  {id: destination.slice(1) + "align" }));
		$(destination + "align").append(
			"<li class='" + ((conf.aligner.default  || !conf.aligner.features      ) ? "default" : "specified") + "'><span class='simulation_param'>Use features:</span> "    + "<span class='simulation_value'>" + (conf.aligner.features      || defaultConf.aligner.features      ) + "</span>" +
			"<li class='" + ((conf.aligner.default  || !conf.aligner.insert_delete ) ? "default" : "specified") + "'><span class='simulation_param'>Insert/delete penalty:</span> "   + "<span class='simulation_value'>" + (conf.aligner.insert_delete || defaultConf.aligner.insert_delete ) + "</span>" +
			"<li class='" + ((conf.aligner.default  || !conf.aligner.substitution  ) ? "default" : "specified") + "'><span class='simulation_param'>Substitution penalty:</span> "    + "<span class='simulation_value'>" + (conf.aligner.substitution  || defaultConf.aligner.substitution  ) + "</span>" +
			"<li class='" + ((conf.aligner.default  || !conf.aligner.metathesis    ) ? "default" : "specified") + "'><span class='simulation_param'>Metathesis penalty:</span> "      + "<span class='simulation_value'>" + (conf.aligner.metathesis    || defaultConf.aligner.metathesis    ) + "</span>" +
			"<li class='" + ((conf.aligner.default  || !conf.aligner.tolerance     ) ? "default" : "specified") + "'><span class='simulation_param'>Tolerance:</span> "       + "<span class='simulation_value'>" + (conf.aligner.tolerance     || defaultConf.aligner.tolerance     ) + "</span>" +
			""
		);
		if(conf.aligner.default) {
			$(destination + "align-title").addClass("default");
			$(destination + "align-title").append($('<div/>',{text: "+", class: "open", click: function(){ $(destination + "align").show() } }));
			$(destination + "align").hide();
		};



		$(destination + " .simulation_params").append($('<div/>',{class: "simulation_gray_text", text: "Default values are in gray."}).show());
			
	
	}



	var showFile = function(file) {

		var toHTML = function (content) {
			var table = "";
			for (var i=0; i<content.length; i++) {
				table += content[i] + "<br>";
			}
			return table;
		}
		var newWindow = function (content) {
				window.open().document.write(content);
		}

		if (conf && conf.files && conf.files[file]) {
			if (typeof conf.files[file] === "string") {
				// file on server, get it
				FileManager.loadText( conf.dirname + conf.files[file] );
				if (FileManager.status()) {
					text = FileManager.get();
					newWindow(toHTML(text));
				}
			} else {
				// local file, display content
				newWindow(toHTML(conf.files[file].content));
			}
		} else {
			// show the default feature file
			FileManager.loadText( defaultFeatureFile );
			if (FileManager.status()) {
				text = FileManager.get();
				newWindow(toHTML(text));
			}
		}
		
	}
	
	var runSimulation = function (remoteness, simulationIndex) {

		var startTime = new Date();
        log("Learning starting at " + startTime);

		if(!remoteness) {remoteness = LOCAL};
		var destination = (remoteness===REMOTE) ? "#server" : "#local" ;

		//var conf = configurations[REMOTE][simulationIndex];
		// the current conf is in the top-level variable "conf"
		//console.log(conf);


		// check browser support for Promises
		if (typeof Promise !== "undefined" && Promise.toString().indexOf("[native code]") !== -1){
			// all is good
		} else {
			$(destination + " .simulation_status").html("Error: your browser is not supported. Please try Chrome, Firefox, or Safari.");
			$(destination + " .simulation_status").css('color', 'red');
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
			$(destination + " .simulation_status").html("Working...");
			document.title = "(working) " + title;
		}).then( function() {
			Aligner.initialize({
				onscreen: false,
				FeatureManager: FeatureManager,
				featureFile:   (conf.files.features) ? conf.dirname + conf.files.features : conf.files.features,
				features:      conf.dirname + conf.aligner.features,
				insert_delete: conf.aligner.insert_delete || defaultConf.aligner.insert_delete,
				substitution:  conf.aligner.substitution  || defaultConf.aligner.substitution,
				swap:          conf.aligner.metathesis    || defaultConf.aligner.metathesis,
				tolerance:     conf.aligner.tolerance     || defaultConf.aligner.tolerance,
				debug: false,
			});
		}).then( function() {
			outputLog();
		}).then( function() {
			Grammar.initialize({
				constraintFile:    (remoteness===REMOTE) ? conf.dirname + conf.files.constraints :  conf.files.constraints,
		        useGaussianPriors: conf.maxent.useGaussianPriors || defaultConf.maxent.useGaussianPriors,
				defaultSigma:      conf.maxent.defaultSigma      || defaultConf.maxent.defaultSigma,
				defaultMu:         conf.maxent.defaultMu         || defaultConf.maxent.defaultMu,				
			});
		}).then( function() {
			outputLog();
		}).then( function() {
			//updateStatus("Initializing MaxEnt module...");
		}).then( function() {
			Maxent.initialize({
				iterationCount:    conf.maxent.iterationCount    || defaultConf.maxent.iterationCount,
				learningRate:      conf.maxent.learningRate      || defaultConf.maxent.learningRate,
				noPositiveWeights: conf.maxent.noPositiveWeights || defaultConf.maxent.noPositiveWeights,
				initialWeight:     conf.maxent.initialWeight     || defaultConf.maxent.initialWeight
			});
		}).then( function() {
			outputLog();
		}).then( function() {
			//updateStatus("Initializing learner...");
		}).then( function() {
			var status = Learner.initialize({
				trainingData:              (remoteness===REMOTE) ?  conf.dirname + conf.files.training : conf.files.training,
				testingData:               (remoteness===REMOTE) ?  conf.dirname + conf.files.testing  : conf.files.testing,
				trainOutputFile:           conf.files.trainOutputFile,
				testOutputFile:            conf.files.testOutputFile,
				downloadButton:            destination + " .simulation_downloadify",
				aligner:                   Aligner,
				minProductiveSize:         (conf.learner.minProductiveSize || defaultConf.learner.minProductiveSize),
				mutationType:              (conf.learner.mutationType || defaultConf.learner.mutationType),
				trainingSize:              (conf.learner.howMuchTraining || defaultConf.learner.howMuchTraining),
				changeOrientations: {
					delete:                (conf.learner.changeOrientations.delete || defaultConf.learner.changeOrientations.delete), 
					mutate:                (conf.learner.changeOrientations.mutate || defaultConf.learner.changeOrientations.mutate), 
					metathesize:           (conf.learner.changeOrientations.metathesize || defaultConf.learner.changeOrientations.metathesize)
				},
				useGrammarsProper:                 conf.learner.useGrammarsProper || defaultConf.learner.useGrammarsProper,
				disableLastNucleusHypotheses:      conf.learner.disableLastNucleusHypotheses || defaultConf.learner.disableLastNucleusHypotheses,
				vowelFeature:                      conf.learner.vowelFeature || defaultConf.learner.vowelFeature,
				verboseReduction:                  conf.learner.verboseReduction || defaultConf.learner.verboseReduction,
				preReductionProductivityThreshold: conf.learner.preReductionProductivityThreshold || defaultConf.learner.preReductionProductivityThreshold
			});
			
			if (status===0) {
				// no sublexicons
				$(destination + " .simulation_status").html("No sublexicons were constructed.");
			} else {
				// sublexicons, provide download link
				$(destination + " .simulation_status").hide();
				$(destination + " .simulation_downloadify").show();
			}


			log("\nLearning completed in " +  timePrettifier(startTime));
			outputLog();
			$("#dimdom")[0].play() //soundManager.play("dimdom");



	        document.title = "(done) " + title;
			
		}).then( function() {
			outputLog();
		}).catch(function(err) {
			// something bad happened
			console.log("\n\nError occurred after " +  timePrettifier(startTime));
			console.error(err.stack);
			$(destination + " .simulation_status").html("Error");
			$(destination + " .simulation_status").css('color', 'red');
	        $("#dimdom")[0].play() //soundManager.play("dimdom");
    	    document.title = "(error) " + title;
		});
		
	}


	var timePrettifier = function (startTime) {

		var str;
		var endTime = new Date();
		var timediff = parseInt((endTime - startTime)/1000);
		var minutes = Math.round(timediff/60);
		if (minutes<1) {
			// less than one minute
			if (timediff === 1) {
				str = "1 second.";
			} else {
				str = timediff + " seconds.";
			}
		} else {
			if (minutes === 1) {
				str = timediff + " seconds, i.e. ~1 minute.";
			} else {
				// more than one minute
				if (minutes>60) {
					var hours = Math.floor(minutes/60);
					var hminutes = minutes - hours*60;
					if (hours === 1) {
						str = minutes + " minutes, i.e. 1 hour";			
					} else {
						str = minutes + " minutes, i.e. " + hours + " hours";
					}
					if (hminutes>0) {
						str += (hminutes==1)? " and 1 minute." : " and " + hminutes + " minutes."
					} else {
						str += ".";
					}
				} else {
					// less than one hour
					str = timediff + " seconds, i.e. ~" + minutes + " minutes.";
				}
			}
		}
		return str;
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
		var name        = $("#file_save input")[0].value || "(unnamed)";
		var description = $("#file_save input")[1].value || "";
		if (!hasTraining) {
			$("#file_save_feedback").html("No training file.").css('color', 'red');
		} else {
			localStorage.setItem(name , JSON.stringify(localFiles) );
			$("#file_save_feedback").html("Files saved.").css('color', 'black');
		}
	}
	
	var clear = function() {
		this.localFiles = [];
		$("#files").html("");
		$("#file_save input")[0].value = "";
		$("#file_save input")[1].value = "";
		$("#file_save").hide();
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
        clear: clear,
        listSimulations: listSimulations,
        defaultConf: defaultConf
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


	$("#localtitle").click( function() {
		GUI.listSimulations();
	});

	Dropzone.autoDiscover = false;
	var myDropzone = new Dropzone("#dropzone", { url: location.href });
	$("#file_save_link").click(function(){ GUI.saveSimulation(); });
	$("#file_save_clear").click(function(){ GUI.clear(); });
	myDropzone.on("addedfile", function(file) {

		if (GUI.localFiles.length===0) {
			$("#files").html("");
		}
			

		var reader = new FileReader();
		reader.readAsText(file);
		reader.onload = function(evt) {
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
								if (GUI.localFiles[i].id===this.id) {
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
				{id: GUI.fileToId("file_" + filename), name: filename, content: fileAsString, type: guessType}
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
						if (c && c.description) {
							$("#file_save input")[1].value = c.description;
						}
					}
				}
			}
		}
		
		
	});
	myDropzone.on("error", function(file, err, xhr) { 
		console.log(file); 
		console.log("d" + err); 
		console.log(xhr); 
	});

});



























