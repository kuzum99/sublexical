
var Learner = (function($, undefined){

    var initialized = false;
    var FeatureManager = Aligner.FeatureManager;
    var trainingData = [];
    var testingData = [];
    var aligner = {};
    var minProductiveSize = 0;
    var mutationType = "both"; // {"featural", "segmental", "both"}
    var changeOrientations = {delete: 'product', mutate: 'product', metathesize: 'product'}; // each can be {'source', 'product'}
    var useGrammarsProper = true;
    var disableLastNucleusHypotheses = false;
    var vowelFeature = 'syllabic';
    var sizeBiasPriorFunction = function(x){return 1;}; // one alternative: function(x){return x;}, for a meaningful prior
    var onscreen = true;
	

    var log_destination = "console"; // where to send log messages

    var _log = function (message) {
        console.log(message);
        //GUI.log(message);
    }

    var initialize = function (obj) {

        var obj = obj || {};

		var startTime = new Date();
        _log("Initializing Learner... starting at " + startTime);

        aligner = obj.aligner;

        var trainingDataFile = obj.trainingData || "";

        var testingDataFile = obj.testingData || "";

        var testOutputFile = obj.testOutputFile || "test.txt";
        var testDownloadButton = obj.testDownloadButton || "";
        var trainOutputFile = obj.trainOutputFile || "train.txt";
        var trainDownloadButton = obj.trainDownloadButton || "";
        
        var trainingSize = obj.trainingSize || "all";

        _log("Loading training data: " + trainingDataFile);
        FileManager.loadText(trainingDataFile);
        if (FileManager.status()) {
            trainingData = FileManager.get();
        }
        _log("Training data loaded.");

        _log("Loading testing data: " + testingDataFile);
        FileManager.loadText(testingDataFile);
        if (FileManager.status()) {
            rawTestingData = FileManager.get();
            testingData = $.map(rawTestingData, function(d){return d[0]})
        }
        _log("Testing data loaded.");

        minProductiveSize = obj.minProductiveSize || 0
        _log("Minimum number of relevant data points for a pattern to be considered productive: " + minProductiveSize);

        if ("mutationType" in obj) {
            mutationType = obj.mutationType;
        }
        _log("Allowed mutation changes (can be featural, segmental, or both): " + mutationType);

        if ("changeOrientations" in obj) {
            changeOrientations = obj.changeOrientations;
        }

        if ("useGrammarsProper" in obj) {
            useGrammarsProper = obj.useGrammarsProper;
        }
        _log("Construction and use of Grammars Proper (in addition to Gatekeeper Grammars) is set to: " + useGrammarsProper);

        vowelFeature = obj.vowelFeature || 'syllabic';
        disableLastNucleusHypotheses = obj.disableLastNucleusHypotheses || false;
		_log("Whether or not to enable 'last nucleus' hypotheses is set to: " + disableLastNucleusHypotheses);

        sizeBiasPriorFunction = obj.sizeBiasPriorFunction || function(x){return 1;}; // one alternative: function(x){return 1;}
		_log("The function responsible for implementing the sublexicon size bias (prior) is set to: " + sizeBiasPriorFunction);

        initialized = true;
        _log("Learner initialized.");

        var arr = learn(trainingData, trainingSize); // hypotheses

        if (arr.length > 0) {

			// ---- The code below applies the learned sublexicons to testing data.
			testDerivatives = produceDerivatives(testingData, arr);
			for (var i=0;i<testDerivatives.length;i++) {
				thisDeriv = testDerivatives[i];
				_log('wug: ' + thisDeriv.base)
				for (var j=0;j<thisDeriv.derivatives.length;j++) {
					_log('derivative ' + j + ': ' + thisDeriv.derivatives[j].form + ' , gkHarmony: ' + thisDeriv.derivatives[j].gkHarmony + ' , gpHarmony: ' + thisDeriv.derivatives[j].gpHarmony + ' , combinedProbability: ' + thisDeriv.derivatives[j].combinedProbability);
				}
			}

			var testOutputString = derivativesToString(testDerivatives);
			var testOutputBlob = new Blob([testOutputString], { type: 'text/plain' });
			var testOutputURL = URL.createObjectURL(testOutputBlob);			

			var trainOutputString = 'meow meow';
			var trainOutputBlob = new Blob([trainOutputString], { type: 'text/plain' });
			var trainOutputURL = URL.createObjectURL(trainOutputBlob);			

			testDownloadButton = trainDownloadButton || "downloadify";
			$("#" + testDownloadButton).html([
				$('<a/>', {
					text: "Download testing item predictions", 
					download: testOutputFile,
					href: testOutputURL 
				}),
				$('<br/>'),
				$('<a/>', {
					text: "Download re-organized training data", 
					download: trainOutputFile,
					href: trainOutputURL 
				})
			]);
			
		} else {
			
        	console.log("\nNo sublexicons were constructed.");
            //return null;
        }

        var endTime = new Date();
        var timediff = parseInt((endTime - startTime)/1000);
        var minutes = Math.round(timediff/60);
        if (minutes<1) {
        	if (timediff === 1) {
		        _log("\nLearning completed in 1 second."); 
        	} else {
		        _log("\nLearning completed in " + timediff + " seconds."); 
        	}
        } else {
        	if (minutes === 1) {
		        _log("\nLearning completed in " + timediff + " seconds, i.e. ~1 minute."); 
        	} else {
		        _log("\nLearning completed in " + timediff + " seconds, i.e. ~" + minutes + " minutes."); 
        	}
        }
        soundManager.play("dimdom");
        document.title = "(done) " + document.title;

        return arr.length;
    };



    var learn = function (lexicon, trainingSize, hypotheses) {
        /* Main function: given a lexicon of word pairs, produce two grammars
         * (Gatekeeper and Grammar Proper) for each sublexicon found. */

        lexicon = lexicon || [];

        trainingSize = parseInt(trainingSize) || lexicon.length; // number of pairs to be drawn from lexicon, "all" would give NaN, which would correctly lead to learning from the entire lexicon
        _log("Number of pairs drawn from lexicon: " + (trainingSize===lexicon.length? "all (" +lexicon.length + ")" : trainingSize ));

        hypotheses = hypotheses || [];
        _log("Previously constructed hypotheses given to Learner: ");
        if (hypotheses.length === 0) {
            _log("None.");
            } else {
            _log(hypotheses);
        }

        /* Maybe we'll make this sensitive to word frequency at some point.
         * Sensitive to base frequency or derivative frequency?*/


        lexicon = lexicon.chooseRandom(trainingSize);
    

        _log("Aligning training data word pairs...");
        var alignedPairs = alignPairs(lexicon);
        _log("Training data word pairs aligned.  Total number of alignments: " + alignedPairs.length);

        _log("Constructing hypotheses from differences between word pairs...");
        for (var i=0;i<alignedPairs.length;i++) {
            var wordHypotheses = createHypotheses(alignedPairs[i]);
            for (var j=0;j<wordHypotheses.length;j++) {
                hypotheses.push(wordHypotheses[j]);
            }
        }
        _log("Hypotheses constructed.")

        // Extract an array of all productive base-derivative pairs
        var productivePairs = [];
        for (var i=0;i<hypotheses.length;i++) {
			for (var j=0;j<hypotheses[i].contexts.length;j++) {
				productivePairs.push(hypotheses[i].contexts[j].form + ' / ' + hypotheses[i].contexts[j].derivative);
			}
        }
        productivePairs = _.uniq(productivePairs);

        _log("Consolidating hypotheses...");
        hypotheses = consolidateHypotheses(hypotheses);

       	// // Remove any consolidated hypotheses with a number of contexts fewer than minProductiveSize -- experimental!
       	// hypotheses = hypotheses.filter( function(h) {
       	// 	return h.contexts.length >= minProductiveSize;
        // });
        // console.log(hypotheses);

        _log("... and removing subset hypotheses...");
        hypotheses = removeSubsetHypotheses(hypotheses);
        if (hypotheses.length === 0) {
            _log("No hypotheses met the minimum word requirement for productivity.");
            return [];
        }
        _log("Hypotheses consolidated.");

        // Ensure that all of productivePairs made it into the consolidated hypotheses
        var survivingPairs = []
        for (var i=0;i<hypotheses.length;i++) {
			for (var j=0;j<hypotheses[i].hypothesis.contexts.length;j++) {
				survivingPairs.push(hypotheses[i].hypothesis.contexts[j].form + ' / ' + hypotheses[i].hypothesis.contexts[j].derivative);
			}
        }
        survivingPairs = _.uniq(survivingPairs);

        if (_.difference(productivePairs, survivingPairs).length > 0) {
        	_log('WARNING! Some base-derivative pairs that should have been included in the distilled hypotheses have been lost, specifically:')
        	_log(_.difference(productivePairs, survivingPairs))
        	throw new Error('Exiting script.');

        }

		// Remove sublexicons that lack enough forms to be considered productive
		var productiveSublexicons = [];
        for (var i=0;i<hypotheses.length;i++) {
            if (hypotheses[i].derivatives.length >= minProductiveSize) {
                productiveSublexicons.push(hypotheses[i].hypothesis);
            }
        }
        hypotheses = productiveSublexicons;
        _log("Total number of productive sublexicons: " + hypotheses.length);

        if (onscreen) {
            for (var i=0; i<hypotheses.length; i++) {

                /* $('<div>')
                    .attr("id","hypothesis_" + escape(hypotheses[i].changes.toString()))
                    .html(hypotheses[i].toString())
                    .appendTo("#sublexicons")
                    */
            }
        }

        _log("Saturating context lists with zero-probability derivatives.");
        _log("At this point many alignments must be generated in order for Faithfulness violations to be counted.  May take some time...");
        hypotheses = addOtherContexts(hypotheses, lexicon);
        _log("Context lists saturated.");

        _log("Adding Gatekeepers to hypotheses...\n");
        hypotheses = addGatekeepers(hypotheses);
        _log("All Gatekeepers added.");

        if (useGrammarsProper) {
            _log("Adding Grammars Proper to hypotheses...\n");
            hypotheses = addGrammarsProper(hypotheses);
            _log("All Grammars Proper added.");
        }

        return hypotheses;
    };


    var alignPairs = function (pairsToLearn) {
        /* Given an array of word pairs, align each of them and return an
         * array of all (potential) alignments. */
        var alignedPairs = [];

        for (var i=0;i<pairsToLearn.length;i++) {
            var theseAlignments = aligner.align(pairsToLearn[i][0],
                                                        pairsToLearn[i][1]);

            for (var j=0;j<theseAlignments.length;j++) {
                var base = [];
                var derivative = [];

                for (var k=0;k<theseAlignments[j].length;k++) {
                    base.push(theseAlignments[j][k]['elem1']);
                    derivative.push(theseAlignments[j][k]['elem2']);
                }

                var probability = pairsToLearn[i][2] || 1;

                alignedPairs.push([base, derivative, probability]);
            }
        }

        return alignedPairs;
    };


    var alignmentToArrays = function (alignment) {
        /* Given an alignment as returned by Aligner (length = length of
         * base/derivative), return a length-2 alignment array in which
         * element 0 is the base and element 1 is the derivative,
         * both as an aligned word. */
        var base = [];
        var derivative = [];

        for (var k=0;k<alignment.length;k++) {
            base.push(alignment[k]['elem1']);
            derivative.push(alignment[k]['elem2']);
        }

        return [base, derivative];
    };

    var cartesianProduct = function (list) {
        /* Generate the Cartesian product of all arrays in the input
         * array.  Used for creating change objects due to the 
         * ambiguous nature of locality (from left or from right)
         * and change material (to [t] or to [-voice]). */
        var first = list[0];
        var rest = list.slice(1);

        if (first) {
            var output = [];

            if (rest.length > 0) {
                var prod_rest = cartesianProduct(rest);

                for (var i = 0; i < prod_rest.length; i++) {
                    for (var j = 0; j < first.length; j++) {
                        output.push([first[j]].concat(prod_rest[i]));
                    }
                }
            } else {
                for (var j = 0; j < first.length; j++) {
                    output.push([first[j]]);
                }
            }

            return output;
        } else {
            return [];
        }
    }

    var makeFeatureMutation = function (mutation) {
        /* From a mutation change object with input and output stated in
         * segmental terms, create a change object with input and output
         * described in terms of their non-shared features. */
        mutation = $.extend(true, {}, mutation);
        var baseSegFeatures = FeatureManager.getSegment(mutation.input[0]);
        var derivSegFeatures = FeatureManager.getSegment(mutation.output[0]);

        var featureInput = {};
        var featureOutput = {};
        for (feature in baseSegFeatures) {
            if (baseSegFeatures[feature] !== derivSegFeatures[feature]) {
                if (feature !== "symbol") {
                    featureInput[feature] = baseSegFeatures[feature];
                    featureOutput[feature] = derivSegFeatures[feature];
                }
            }
        }
        mutation.input = featureInput;
        mutation.output = featureOutput;

        return mutation;
    };


    var checkIfLastNucleus = function (change, base) {
        change = $.extend(true, {}, change);

		var checkChunk = function (chunk) {
			if (chunk[0] === null) {
				return false;
			}
			return (FeatureManager.getSegment(chunk[0])[vowelFeature] === '+');
		}

		if (typeof FeatureManager.getSegment(change.input[0]) === 'undefined') {
			return false;
		}
        if (FeatureManager.getSegment(change.input[0])[vowelFeature] === '+') {
        	var rightwardSegments = base.slice(((change.location-1)/2)+1)
        	var rightwardStatuses = $.map(rightwardSegments, checkChunk)
        	if ($.inArray(true, rightwardStatuses)===-1) {
				return true;
        	}
        }
        return false;
    };

	
	var findLastNucleus = function (base) {
		for (var m=base.length-1;m>0;m--) {
			if (base[m] !== undefined) {
				var segment = $.isArray(base[m]) ? base[m][0] : base[m];
				if (segment !== null) {
					if (FeatureManager.getSegment(segment)[vowelFeature] === '+') {
						return m;
					}
				}	
			}
		}
	return false;
	}


    var createHypotheses = function (alignedPair) {
        /* Given an aligned pair (returned by alignmentToArrays), generate
         * a list of hypotheses about the morphological change that relates
         * the base to the derivative.  The returned hypothesis object also
         * includes information about which forms are associated with it.
         * Assumes first member of pair is base/UR. */
        var base = alignedPair[0];
        var derivative = alignedPair[1];
        var probability = parseFloat(alignedPair[2]);

        var flatBase = linearizeWord(base);
        var flatDerivative = linearizeWord(derivative);

        var differences = findDifferences(base, derivative); // output is segmental, positive-indexed changes

        if (differences.length > 0) {
            var changesCartesianProduct = changesToCartesianProduct(differences, base, mutationType);
            for (var i=0;i<changesCartesianProduct.length;i++) {
                changesCartesianProduct[i].toString = function(){return this.join('\n');};
            }
            var pairHypotheses = [];
            for (var i=0;i<changesCartesianProduct.length;i++) {
                var hypothesis = {changes: changesCartesianProduct[i],
                                  contexts : [{form : flatBase, derivative: flatDerivative, 
                                              probability : probability, toString: function(){return contextToString(this);}}],
                                  probabilitySum: probability,
                                  toString: function() {return hypothesisToString(this);},
                                  changesToString: function() {return changesToString(this.changes);}
                                 };
                pairHypotheses.push(hypothesis);
            }
        } else { // null change
            var pairHypotheses = [{changes: [{type: 'none',
                                             input: null,
                                             output: null,
                                             location: null,
                                             toString: function(){return 'No change'}}],
                                  contexts : [{form : flatBase, derivative: flatDerivative, 
                                              probability : probability, toString: function(){return contextToString(this);}}],
                                  probabilitySum: probability,
                                  toString: function() {return hypothesisToString(this);},
                                  changesToString: function() {return changesToString(this.changes);}
                                 }];
        }




        var hypothesisToString = function (hypothesis) {
            /* Convert a hypothesis object into a string for printing or
             * writing to file. */
            var c = hypothesis.changes;
            var obj = {};

            var output = 'Hypothesis:\n';
            output += hypothesis.changes.toString();

            output += "\n";
            var w = hypothesis.contexts;
            if (w.length < 7) {
                var displayNumber = w.length;
            } else {
                var displayNumber = 7;
            }
            for (var i=0;i<displayNumber;i++) {
                if (w[i]['probability'] > 0) {
                    output += w[i]['form'] + ', ';
                }
            }
            output += '... (Sum of context probabilities: ' + Grammar.round(hypothesis.probabilitySum, 2) + ', relative size: ' + hypothesis['relativeSize'] + ')';

            return output + '\n';
        };

        var changesToString = function (changes) {
            /* Convert an array of change objects into a string for printing
             * or writing to file. */
            var changesList = [];
            for (var i=0;i<changes.length;i++) {
                changesList.push(changes[i].toString());
            }
            return changesList.join(', ');
        }

        return pairHypotheses;
    };


    var findDifferences = function (base, derivative) {
        /* Given a base and a derivative from an aligned pair, find the 
         * differences between them and encode those differences as a change 
         * object.  Continuous sequences that have been inserted or deleted
         * are grouped together in a single change object.  Produces only
         * segmental, positive-indexed change objects. */
        var differences = [];

        var surfaceIndex = 0;
        for (var i=0;i<base.length;i++) {
            if (base[i].toString() !== derivative[i].toString()) {  // if the input and output are not the same
                if (base[i].toString() === [null].toString()) {
                    differences.push({type: 'insert',
                                      location: surfaceIndex * 2,
                                      input: base[i],
                                      output: derivative[i]});
                    // surfaceIndex does not increment.
                } else if (derivative[i].toString() === [null].toString()) {
                    differences.push({type: 'delete',
                                      location: surfaceIndex * 2 + 1,
                                      input: base[i],
                                      output: derivative[i]});
                    surfaceIndex++;
                } else if (base[i].length > 1 || derivative[i] > 1) {
                    if (checkMetathesis(base[i], derivative[i])) {
                        differences.push({type: 'metathesize',
                                      location: surfaceIndex * 2 + 1,
                                      input: base[i],
                                      output: derivative[i]});
                    }
                    surfaceIndex = surfaceIndex + 2;
                } else {
                    differences.push({type: 'mutate',
                                      location: surfaceIndex * 2 + 1,
                                      input: base[i],
                                      output: derivative[i]});
                    surfaceIndex++;
                }
            } else { surfaceIndex++; }
        }

        differences = groupDiffsToContinuous(differences);

        var changeToString = function(changeObj) {
            /* Convert a change object to a string for printing or writing
             * to file. */

            var featureBundleToString = function(featureBundle) {
                var featureList = [];
                for (f in featureBundle) {
                    featureList.push(featureBundle[f] + f);
                }
                return featureList.join(',');
            }

            var changeLocations = [];
            if (changeObj.type === 'delete' || changeObj.type === 'mutate' || changeObj.type === 'metathesize') {
                if ($.isArray(changeObj.input) === false) {
                    changeLocations = [changeObj.location];
                } else {
                	if (changeObj.location === 'last nucleus') {
                		changeLocations.push('last nucleus');
                	} else {
	                    for (var i=0; i<changeObj.input.length; i++) {
	                        changeLocations.push(changeObj.location+i*2);
	                    }
	                }
                }
            } else {
                changeLocations = [changeObj.location];
            }

            if (changeObj.type === 'insert') {
                return 'Insert [' + linearizeWord(changeObj.output) + '] at ' + changeLocations;
            } else if (changeObj.type === 'delete') {
                if (changeOrientations['delete'] === 'source') {
                    return 'Delete [' + linearizeWord(changeObj.input) + '] at ' + changeLocations;
                } else {
                    var segmentWord = linearizeWord(changeObj.input).length > 1 ? 'segments' : 'segment';
                    return ('Delete ' + ((linearizeWord(changeObj.input).length+1)/2) + ' ' + segmentWord + 
                            ' at ' + changeLocations);
                }
            } else if (changeObj.type === 'mutate') {
                if ($.isArray(changeObj.input)) {
                    var changeInputStr = '[' + changeObj.input + ']';
                    var changeOutputStr = '[' + changeObj.output + ']';
                } else {
                    var changeInputStr = '[' + featureBundleToString(changeObj.input) + ']';
                    var changeOutputStr = '[' + featureBundleToString(changeObj.output) + ']';
                }
                if (changeOrientations.mutate === 'source') {
                    return 'Mutate ' + changeInputStr + ' at ' + changeLocations + ' to ' + changeOutputStr;
                } else {
                    return 'Mutate the segment(s) at ' + changeLocations + ' to ' + changeOutputStr;
                }
            } else if (changeObj.type === 'metathesize') {
                if (changeOrientations.metathesize === 'source') {
                    return 'Metathesize [' + linearizeWord(changeObj.input) + '] at ' + changeLocations;
                } else {
                    return 'Metathesize the segments at ' + changeLocations;
                }
            }
        }

        for (var i=0;i<differences.length;i++) {
            differences[i].toString = function(){return changeToString(this);};
        }

        return differences;
    };


    var groupDiffsToContinuous = function (differences) {
        /* Given an array of the change objects (segmental, positive-indexed)
         * that distinguish a base and a derivative, group adjacent insertion
         * and deletion changes into a single inserted/deleted 'morphemic'
         * change object and return all change objects. */
        var insertions = differences.subset('type', 'insert');
        var deletions = differences.subset('type', 'delete');

        var insertedLocations = [];
        var groupedInsertions = [];
        for (var i=0;i<insertions.length;i++) {
            if ((i>0) && (insertions[i].location === insertions[i-1].location)) {
                groupedInsertions[groupedInsertions.length-1].output =
                    groupedInsertions[groupedInsertions.length-1].output.concat(insertions[i].output);
            } else {
                groupedInsertions.push(insertions[i]);
            }
            insertedLocations += insertions[i];
        }

        var groupedDeletions = [];
        for (var i=0;i<deletions.length;i++) {
            if ((i>0) && (deletions[i].location === deletions[i-1].location + 2) &&
                    ($.inArray(deletions[i]-1, insertedLocations) === -1)) {
                groupedDeletions[groupedDeletions.length-1].input = 
                    groupedDeletions[groupedDeletions.length-1].input.concat(deletions[i].input);
            } else {
                groupedDeletions.push(deletions[i]);
            }
        }

        return groupedInsertions.concat(groupedDeletions, 
                                            differences.subset('type', 'mutate'),
                                            differences.subset('type', 'metathesize'));
    };


    var changesToCartesianProduct = function (changeObjects, base, mutationType) {
        /* Generate the Cartesian product of different versions (positive/
         * negative-indexed, segmental/featural) of change objects associated
         * with a single aligned pair of words.  The returned array represents
         * all possible combinations of these objects. */
        var changePossibilities = []

        for (var i=0;i<changeObjects.length;i++) {
        	if (!disableLastNucleusHypotheses) {
	        	var includeLastNucleusChange = checkIfLastNucleus(changeObjects[i], base);
        	} else {
        		var includeLastNucleusChange = false;
        	}

            if (changeObjects[i].type === 'mutate' && mutationType != 'segmental') {
                if (mutationType === 'both') {
                	changePossibilities[i] = [];
                	if (includeLastNucleusChange) {
						var newPossibility = $.extend(true, {}, changeObjects[i]);
						newPossibility.location = 'last nucleus';
						changePossibilities[i].push(newPossibility);
                    }
                    changePossibilities[i].push(changeObjects[i]);
                    changePossibilities[i].push(negativeIndexing(changeObjects[i], base));
                    changePossibilities[i].push(makeFeatureMutation(changeObjects[i]));
                    changePossibilities[i].push(negativeIndexing(changePossibilities[i][changePossibilities[i].length-1], base));
                } else if (mutationType === 'featural') {
                	changePossibilities[i] = [];
                	if (includeLastNucleusChange) {
						var newPossibility = $.extend(true, {}, changeObjects[i]);
						newPossibility.location = 'last nucleus';
						changePossibilities[i].push(makeFeatureMutation(newPossibility));
                    }
                    changePossibilities[i].push(makeFeatureMutation(changeObjects[i]));
                    changePossibilities[i].push(negativeIndexing(changePossibilities[i][changePossibilities[i].length-1], base));
                }
            } else {
            	changePossibilities[i] = [];
                if (includeLastNucleusChange) {
					var newPossibility = $.extend(true, {}, changeObjects[i]);
					newPossibility.location = 'last nucleus';
					changePossibilities[i].push(newPossibility);
                }
                changePossibilities[i].push(changeObjects[i]);
                changePossibilities[i].push(negativeIndexing(changeObjects[i], base));
            }
        }


        return cartesianProduct(changePossibilities);
    };


    var negativeIndexing = function (changeObject, base) {
        /* Convert a positive-indexed location in the change object into
         * a negative-indexed one, based on the length of the base form. */
        base = addNulls(linearizeWord(base));
        var len = base.length

        negIndexedChange = $.extend(true, {}, changeObject);
        negIndexedChange.location = - (len - changeObject.location);

        return negIndexedChange;
    };


    var checkMetathesis = function (unit1, unit2) {
        /* Check to see whether the two units are metathesized versions
         * of each other. */
        var switchedUnit2 = [unit2[1], unit2[0]];

        if (unit1.length === 1 || unit2.length === 1) {
            return false;
        } else if (unit1.toString() === switchedUnit2.toString()) {
            return true;
        } else {return false;}
    };


    var consolidateHypotheses = function (hypotheses, allPairs) {
        /* Consolidate the list of hypotheses by combining identical ones
         * into a single hypothesis. */

        var finalHypotheses = [];

        for (var i=0;i<hypotheses.length;i++) {
            var currentChangesStr = hypotheses[i]['changes'].toString();
            var currentContext = hypotheses[i]['contexts'][0];

            var targetHypothesis = -1;  // default: hypothesis not found
            for (var j=0;j<finalHypotheses.length;j++) {
                if (finalHypotheses[j].changes.toString() === currentChangesStr) {
                    targetHypothesis = j;
                    break;
                }
            }

            if (targetHypothesis === -1) {
                finalHypotheses.push(hypotheses[i]);
            } else {
                finalHypotheses[targetHypothesis]['contexts'].push(currentContext);
                finalHypotheses[targetHypothesis]['probabilitySum'] += currentContext.probability;
            }
        }

        return finalHypotheses;

    };



    var sortThings = function (things, sortParameter, length) {
        /* Order hypotheses or other objects starting w/ those with the
         * highest count or evidence (or any other sortParameter). 
         * If length=true, then sorting is based on the length of
         * thing.sortParameter. */
        length = length || false;

        var compareThings = function (a, b) {
          if (a[sortParameter] < b[sortParameter]) {
             return 1;}
          if (a[sortParameter] > b[sortParameter]) {
            return -1;}
          return 0;
        };

        var compareThingsLength = function (a, b) {
          if (a[sortParameter].length < b[sortParameter].length) {
             return 1;}
          if (a[sortParameter].length > b[sortParameter].length) {
            return -1;}
          return 0;
        };

        if (length) {
            return things.sort(compareThingsLength);
        } else {
            return things.sort(compareThings);
        }
    };


    var removeSubsetHypotheses = function (hypotheses) {
        /* Condenses the list of hypotheses about the entire dataset into the
         * minimum number required to account for all base-derivative pairs 
         * that meet the requirement for productivity. */
        var derivationObjs = [];

        var consumeSubsets = function(sortedHypotheses) {
            /* Given an array of hypotheses ordered by their count parameter
             * (descending), return an array of only those which are not
             * proper subsets (in terms of contexts) of others. */
			for (var i=sortedHypotheses.length-1;i>=0;i--) { // i = consumed, usually smaller
				if (sortedHypotheses[i] !== "purgeable") {
					var contextsToAdd = []; // to copy from consumed to consumer (because consumer lacks them)
					var consumabilityStatuses = []; // keep track of whether each context has a consumer
					for (var m=0;m<sortedHypotheses[i].hypothesis.contexts.length;m++) { // iterate over contexts of consumed
						var consumedBase = sortedHypotheses[i].hypothesis.contexts[m].form;
						var consumedDerivative = sortedHypotheses[i].hypothesis.contexts[m].derivative;
						var hasConsumer = false;
						for (var j=0;j<sortedHypotheses.length;j++) { // j = consumer, usually bigger
							if ((sortedHypotheses[j] !== "purgeable") && (i !== j)) {
								var consumerDerivative = applyHypothesis(consumedBase, sortedHypotheses[j].hypothesis, false, changeOrientations)
								if (consumerDerivative === consumedDerivative) {
									var consumerContextStrings = $.map(sortedHypotheses[j].hypothesis.contexts, contextToString);
									if ($.inArray(contextToString(sortedHypotheses[i].hypothesis.contexts[m]), consumerContextStrings) === -1) { // if this context isn't among the consumer's contexts, add it
										contextsToAdd.push([sortedHypotheses[i].hypothesis.contexts[m], j])
									}
									hasConsumer = true;
									break;
								}
							}

						}
						consumabilityStatuses.push(hasConsumer);
					}
					if (consumabilityStatuses.every(Boolean)) { // if every context has a consumer, mark consumed as "purgeable" and add its contexts to their appropriate consumers
							sortedHypotheses[i] = "purgeable"
							for (var n=0;n<contextsToAdd.length;n++) {
								sortedHypotheses[contextsToAdd[n][1]].hypothesis.contexts.push(contextsToAdd[n][0]); // element 0 is the context and element 1 is the index of the consumer that it is given to
								sortedHypotheses[contextsToAdd[n][1]].derivatives.push(contextsToAdd[n][0]['derivative']);
							}
						}
				}
			}

            sortedHypotheses = _.without(sortedHypotheses, 'purgeable');

			for (var i=0;i<sortedHypotheses.length;i++) {
				sortedHypotheses[i]['hypothesis']['probabilitySum'] = numeric.sum($.map(sortedHypotheses[i]['hypothesis']['contexts'], function(c){return c.probability;}));
			}

			var allProbabilities = $.map(sortedHypotheses, function(h){return h['hypothesis']['probabilitySum']});
			var allProbabilitiesSum = numeric.sum(allProbabilities);
            for (var i=0; i<sortedHypotheses.length;i++) {
				sortedHypotheses[i]['hypothesis']['relativeSize'] = sortedHypotheses[i]['hypothesis']['probabilitySum'] / allProbabilitiesSum;
            }

            for (var i=0;i<sortedHypotheses.length;i++) {
	            probs = $.map(sortedHypotheses[i].hypothesis.contexts, function(c){return c['probability'];});
		        var probSum = numeric.sum(probs);
			
		        for (var j=0;j<sortedHypotheses[i].hypothesis.contexts.length;j++){
		            sortedHypotheses[i]['hypothesis']['contexts'][j]['probability'] = sortedHypotheses[i]['hypothesis']['contexts'][j]['probability'] / probSum;
		        }
		    }

            return sortedHypotheses;
        };

        var subsetOf = function(smallList, bigList) {
            /* Return true iff the contexts in `smallHypothesis` are a proper
             * subset of those in `potentiallyAccountedFor`. */
            var diff = _.difference(smallList, bigList);
            return diff.toString() === [].toString();
        };


        for (var i=0;i<hypotheses.length;i++) {
            var h = hypotheses[i];
            var derivatives = h.contexts.map(function(a) {return applyHypothesis(a.form, h, false, changeOrientations)});

            var tempObj = {hypothesis: h,
                           derivatives: derivatives
                          };
            derivationObjs.push(tempObj);
        }

        var preDistillationSort = function (a, b) {
        	// Ensure not only that hypotheses are sorted by size, but also that nucleus-based and featural changes are preferred.
        	if (a.derivatives.length > b.derivatives.length) {
        		return -1;
        	} else if (a.derivatives.length < b.derivatives.length) {
        		return 1;
        	} else {
        		var aLastNucleusCount = $.map(a.hypothesis.changes, function(c,i){return c.location}).filter(function(loc){return (loc==='last nucleus')}).length;
        		var aFeatureCount = a.hypothesis.changes.filter(function(c){return !(c.output instanceof Array)}).length;
				var aScore = (10 * aLastNucleusCount) + aFeatureCount;

        		var bLastNucleusCount = $.map(b.hypothesis.changes, function(c,i){return c.location}).filter(function(loc){return (loc==='last nucleus')}).length;
        		var bFeatureCount = b.hypothesis.changes.filter(function(c){return !(c.output instanceof Array)}).length;
        		var bScore = (10 * bLastNucleusCount) + bFeatureCount;

        		if (aScore > bScore) {
        			return -1;
        		} else if (aScore < bScore) {
        			return 1;
        		} else {
        			// _log('Warning! Hypothesis sorting may not be deterministic.');
        			return 0;
        		}
        	}
        }

        var outputHypotheses = [];
        var sorted = derivationObjs.sort(preDistillationSort);
        var remainingHypotheses = consumeSubsets(sorted);

        return remainingHypotheses;
    };


    var addOtherContexts = function(hypotheses, allPairs) {
        /* Saturate each hypothesis's lists of contexts with
         * "zero-probability" forms, i.e. only found in other hypotheses. */
        for (var i=0;i<hypotheses.length;i++) {
            var contextNames = $.map(hypotheses[i].contexts, function(n, x){
                return n.form;
            });

            for (var j=0;j<allPairs.length;j++) {
                var base = allPairs[j][0];
                var derivative = allPairs[j][1];
                for (var k=0;k<contextNames.length;k++) {
                }
                if ($.inArray(base, contextNames) == -1) {
                    hypotheses[i].contexts.push({
                                            form : base,
                                            derivative : derivative,
                                            probability : 0,
                                            alignment : alignmentToArrays(aligner.align(base, derivative)[0]),
                                            toString: function(){return contextToString(this);}
                                        });
                }
            }
        }

    return hypotheses;
    };


    var addGatekeepers = function (hypotheses) {
        /* Construct a Gatekeeper for each hypothesis and add it to the
         * hypothesis object. */
        for (var i=0;i<hypotheses.length;i++) {
            _log("Commencing Gatekeeper construction for " + hypotheses[i].toString());
            _log("Constructing Gatekeeper...");
            var gk = Grammar.constructGatekeeper(hypotheses[i].contexts);
            hypotheses[i].gatekeeper = gk;
            Maxent.learnWeights(hypotheses[i].gatekeeper);
            _log("Gatekeeper constructed.  Most influential constraints:");
            hypotheses[i].gatekeeper.printWeights(5);
            _log("\n");
        }

        return hypotheses;
    };


    var addGrammarsProper = function(hypotheses) {
        /* Construct a Grammmar Proper for each hypothesis and add it to the
         * hypothesis object. */
        for (var i=0;i<hypotheses.length;i++) {
            _log("Commencing Grammar Proper construction for " + hypotheses[i].toString());
            _log("Constructing Grammar Proper...");
            var gp = Grammar.constructGrammarProper(hypotheses[i]);
            hypotheses[i].grammarProper = gp;
            Maxent.learnWeights(hypotheses[i].grammarProper);
            _log("Grammar Proper constructed.  Most influential constraints:");
            hypotheses[i].grammarProper.printWeights(5);
            _log("\n");
        }

        return hypotheses;
    }




    var produceDerivatives = function (wordlist, hypotheses) {
        /* Given a list of wugs and a complete set of hypotheses,
         * generate possible derivatives for each wug and score each one
         * according to its Gatekeeper and (optionally) Grammar Proper. */
        var allDerivatives = [];
        for (var i=0;i<wordlist.length;i++) {
            var wordDerivatives = {base: wordlist[i], derivatives: []};
            var gkLogProbSum = 0;
            for (var j=0;j<hypotheses.length;j++) {
                var evaluated = Grammar.applyGatekeeper(hypotheses[j].gatekeeper, wordlist[i]);
                var gkViolatedConstraints = evaluated.violatedConstraints;
                var gkHarmony = evaluated.harmony;
                var gkProbability = Math.exp(gkHarmony);
                gkLogProbSum += gkProbability
                var gkViolationVector = evaluated.violationVector;
                var gkConstraints = evaluated.constraints;
                var derivative = applyHypothesis(wordlist[i], hypotheses[j], false, changeOrientations);
                wordDerivatives.derivatives.push({form : derivative,
                                      gkHarmony : gkHarmony,
                                      gkProbability : gkProbability,
                                      gkViolatedConstraints : gkViolatedConstraints,
                                      gkViolationVector : gkViolationVector,
                                      gkConstraints : gkConstraints,
                                      relativeSublexiconSize : hypotheses[j]['relativeSize'],
                                      changesString : hypotheses[j].changesToString()});
            }
            for (var j=0;j<wordDerivatives.derivatives.length;j++) {
                wordDerivatives.derivatives[j].gkProbability /= gkLogProbSum;
            }

            if (useGrammarsProper) {
                var gpLogProbSum = 0;
                for (var k=0;k<wordDerivatives.derivatives.length;k++) {
                    // This assumes (so far unproblematically) that hypotheses and wordDerivatives.derivatives are the same length.
                    var predictedDerivative = applyHypothesis(wordDerivatives.base, hypotheses[k], false, changeOrientations);
                    if (predictedDerivative === 'incompatible') {
                        wordDerivatives.derivatives[k]['predictedAlignment'] = null;
                        wordDerivatives.derivatives[k]['gpConstraints'] = hypotheses[k].grammarProper.constraints;
                        wordDerivatives.derivatives[k]['gpViolatedConstraints'] = [];
                        wordDerivatives.derivatives[k].gpHarmony = null;
                        wordDerivatives.derivatives[k]['gpViolationVector'] = $.map(
                                                wordDerivatives.derivatives[k]['gpConstraints'], function(){return 0});
                        wordDerivatives.derivatives[k].gpProbability = null;
                    } else {
                        alignment = applyHypothesis(wordDerivatives.base, hypotheses[k], true);
                        wordDerivatives.derivatives[k]['predictedAlignment'] = alignment;
                        var evaluated = Grammar.applyGrammarProper(hypotheses[k].grammarProper, alignment);
                        wordDerivatives.derivatives[k]['gpViolatedConstraints'] = evaluated.violatedConstraints;
                        wordDerivatives.derivatives[k].gpHarmony = evaluated.harmony;
                        wordDerivatives.derivatives[k]['gpViolationVector'] = evaluated.violationVector;
                        wordDerivatives.derivatives[k]['gpConstraints'] = evaluated.constraints;
                        wordDerivatives.derivatives[k].gpProbability = Math.exp(evaluated.harmony);
                        gpLogProbSum += wordDerivatives.derivatives[k].gpProbability;
                    }
                }
                var comboProbSum = 0;
                for (var k=0;k<wordDerivatives.derivatives.length;k++) {
                    wordDerivatives.derivatives[k].gpProbability /= gpLogProbSum;
                    wordDerivatives.derivatives[k]['combinedProbability'] = wordDerivatives.derivatives[k]['gpProbability'] * wordDerivatives.derivatives[k]['gkProbability'];
                    comboProbSum += wordDerivatives.derivatives[k]['combinedProbability'];
                }
                for (var k=0;k<wordDerivatives.derivatives.length;k++) {
                    wordDerivatives.derivatives[k]['combinedProbability'] /= comboProbSum;
                }
            } else {
                for (var k=0;k<wordDerivatives.derivatives.length;k++) {
                    wordDerivatives.derivatives[k]['combinedProbability'] = wordDerivatives.derivatives[k]['gkProbability'];
                }
            }

			for (var j=0;j<wordDerivatives.derivatives.length;j++) {
            	wordDerivatives.derivatives[j]['combinedProbability'] = sizeBiasPriorFunction(wordDerivatives.derivatives[j]['relativeSublexiconSize']) * wordDerivatives.derivatives[j]['combinedProbability'];
            }
            var cpSum = numeric.sum($.map(wordDerivatives.derivatives, function(d){return d['combinedProbability']}));
            for (var j=0;j<wordDerivatives.derivatives.length;j++) {
            	wordDerivatives.derivatives[j]['combinedProbability'] = wordDerivatives.derivatives[j]['combinedProbability'] / cpSum;
            }

            wordDerivatives.derivatives = sortThings(wordDerivatives.derivatives, 'combinedProbability')
            allDerivatives.push(wordDerivatives);
        }

        return allDerivatives;
    };


    var derivativesToString = function (derivatives) {
        /* Return a tab-spaced table (string) containing provided wug bases,
         * their derivatives, change labels, harmony scores, probabilities,
         * and violation matrices. */
        var lineEnd = "\r\n"; /// the added \r is nice for windows users
        if (useGrammarsProper) {
            var outputString = ["base\tbase.harmony\tchange\tderivative\t",
                            "derivative.harmony\tharmony.sum\tprobability"].join("");

            var gkConstraints = derivatives[0]['derivatives'][0]['gkConstraints'];
            var gpConstraints = derivatives[0]['derivatives'][0]['gpConstraints'];

            for (var i=0;i<gkConstraints.length;i++) {
                outputString += "\t" + gkConstraints[i]['name'];
            }
            for (var i=0;i<gpConstraints.length;i++) {
                outputString += "\t" + gpConstraints[i]['name'];
            }

            for (var k=0;k<derivatives[0]['derivatives'].length;k++) {
                outputString += lineEnd + "\t\t";
                outputString += derivatives[0]['derivatives'][k]['changesString'];
                outputString += "\t\t\t\t";
                for (var i=0;i<gkConstraints.length;i++) {
                    outputString += "\t" + derivatives[0]['derivatives'][k]['gkConstraints'][i].weight;
                }
                for (var i=0;i<gpConstraints.length;i++) {
                    outputString += "\t" + derivatives[0]['derivatives'][k]['gpConstraints'][i].weight;
                }
            }

            outputString += lineEnd + "\t\t\t\t\t\t";
            for (var i=0;i<gkConstraints.length;i++) {
                outputString += "\tGK";
            }
            for (var i=0;i<gpConstraints.length;i++) {
                outputString += "\tGP";
            }
            outputString += lineEnd;


            for (var i=0;i<derivatives.length;i++) {
                for (var j=0;j<derivatives[i]['derivatives'].length;j++) {
                    var harmonySum = derivatives[i]['derivatives'][j]['gkHarmony'] + derivatives[i]['derivatives'][j]['gpHarmony'];

                    outputString += derivatives[i]['base'];
                    outputString += "\t" + derivatives[i]['derivatives'][j]['gkHarmony'];
                    outputString += "\t" + derivatives[i]['derivatives'][j]['changesString'];
                    outputString += "\t" + derivatives[i]['derivatives'][j]['form'];
                    outputString += "\t" + derivatives[i]['derivatives'][j]['gpHarmony'];
                    outputString += "\t" + harmonySum;
                    outputString += "\t" + derivatives[i]['derivatives'][j]['combinedProbability'];
                    outputString += "\t" + derivatives[i]['derivatives'][j]['gkViolationVector'].join("\t");
                    outputString += "\t" + derivatives[i]['derivatives'][j]['gpViolationVector'].join("\t");
                    outputString += lineEnd;
                }
            }

            return outputString;

        } else { // useGrammarsProper = false

            var outputString = ["base\tbase.harmony\tchange\tderivative\t",
                                "probability"].join("");

            var gkConstraints = derivatives[0]['derivatives'][0]['gkConstraints'];

            for (var i=0;i<gkConstraints.length;i++) {
                outputString += "\t" + gkConstraints[i]['name'];
            }

            for (var k=0;k<derivatives[0]['derivatives'].length;k++) {
                outputString += lineEnd + "\t\t";
                outputString += derivatives[0]['derivatives'][k]['changesString'];
                outputString += "\t\t";
                for (var i=0;i<gkConstraints.length;i++) {
                    outputString += "\t" + derivatives[0]['derivatives'][k]['gkConstraints'][i].weight;
                }
            }

            outputString += lineEnd + "\t\t\t\t";
            for (var i=0;i<gkConstraints.length;i++) {
                outputString += "\tGK";
            }
            outputString += lineEnd;


            for (var i=0;i<derivatives.length;i++) {
                for (var j=0;j<derivatives[i]['derivatives'].length;j++) {
                    outputString += derivatives[i]['base'];
                    outputString += "\t" + derivatives[i]['derivatives'][j]['gkHarmony'];
                    outputString += "\t" + derivatives[i]['derivatives'][j]['changesString'];
                    outputString += "\t" + derivatives[i]['derivatives'][j]['form'];
                    outputString += "\t" + derivatives[i]['derivatives'][j]['combinedProbability'];


                    outputString += "\t" + derivatives[i]['derivatives'][j]['gkViolationVector'].join("\t");
                    outputString += lineEnd;
                }
            }

            return outputString;
        }
    };



    var addNulls = function (word) {
        /* Split the word into an array of segments and add a null
         * space between each segment and at the edges. */
        word = word.split(" ");
        var spacedWord = [null];

        for (var i=0;i<word.length;i++) {
            spacedWord.push(word[i]);
            spacedWord.push(null);
        }

        return spacedWord
    };

    var relevantHypothesis = function(hypothesis, word, changeOrientations) {
        /* Determine whether the word meets the conditions stated in the
         * given hypothesis; return boolean. */ 

        var checkChange = function(change, word, changeOrientations) {
            /* Determine whether the material in the given word at the 
             * position specified in the given change is the same as
             * the input material in the given change. */

            if (change.type === 'insert' || change.type === 'none' || changeOrientations[change.type] === 'product') {
                return true;
            }

            var nulledWord = addNulls(word);
            var positiveLocation = indexToPositive(nulledWord, change.location);

            if (change.type === 'delete' || change.type === 'mutate') {
                if ($.isArray(change.input)) {
                    var segmentChecks = [];
                    for (var i=0;i<change.input.length;i++) {
                        segmentChecks.push(nulledWord[positiveLocation + i*2] === change.input[i]);
                    }
                    return segmentChecks.every(Boolean);
                } else {
                    return checkFeatureMatch(change.input, nulledWord[positiveLocation]);
                }
            } else if (change.type === 'metathesize') {
                nulledWord = addNulls(word);
                return (nulledWord[positiveLocation] === change.input[0] && 
                        nulledWord[positiveLocation + 2] === change.input[1]);
            }
        };

        var checkFeatureMatch = function(featureBundle, segment) {
            /* Determine whether all feature values in featureBundle are
             * equal to those of the given segment. */
            var sFeatures = FeatureManager.getSegment(segment);
            var featureBooleans = []
            for (feature in featureBundle) {
                featureBooleans.push(sFeatures[feature] === featureBundle[feature]);
            }
            return featureBooleans.every(Boolean);
        };

        var booleans = [];
        for (var i=0;i<hypothesis.changes.length;i++) {
            booleans.push(checkChange(hypothesis.changes[i], word, changeOrientations));
       }

       return booleans.every(Boolean);
    };




    var indexToPositive = function (word, index) {
        /* Return positive index based on word.
         * `word` is null-spaced; `index` is negative. */
        if (index >= 0) {
            return index;
        } else {
            return word.length + index;
        }
    };


    var applyHypothesis = function (word, hypothesis, returnAlignment, changeOrientations) {
        /* Apply the changes listed in the given hypothesis to the
         * given base word to produce the derivative that the hypothesis
         * predicts given the base word. */

        var fillArray = function(value, len) {
            var arr = [];
            for (var i = 0; i < len; i++) {
                arr.push(value);
            };
            return arr;
        };

         var applyChange = function (currentBase, currentDerivative, changeObj) {
            /* Use the given set of changes to derive a new form from the base word.
             * May be only one intermediate step in the application of multiple
             * changes associated with a single hypothesis/sublexicon. */
            if (changeObj.location === 'last nucleus') {
            	var changeLocation = findLastNucleus(currentBase);
            } else {
            	var changeLocation = indexToPositive(currentBase, changeObj.location);
            }

            var changedBase = currentBase.slice(0);
            var changedDerivative = currentDerivative.slice(0);


            if (changeObj.type === 'insert') {
                changedBase[changeLocation] = fillArray(null, changeObj.output.length);
                changedDerivative[changeLocation] = changeObj.output;
            } else if (changeObj.type === 'delete') {
                for (var j=0;j<changeObj.input.length;j++) {
                    changedDerivative[changeLocation+(j*2)] = null;
                }
            } else if (changeObj.type === 'mutate') {
                if ($.isArray(changeObj.input) === false) {
                    changedDerivative[changeLocation] = changeFeatures(currentBase[changeLocation], changeObj.output);
                } else {
                    for (var j=0;j<changeObj.output.length;j++) {
                        changedDerivative[changeLocation+(j*2)] = changeObj.output[j];
                    }
                }
            } else if (changeObj.type === 'metathesize') {
                changeOutput = currentBase.slice(changeLocation, changeLocation+3).reverse();
                for (var j=0;j<changeOutput.length;j++) {
                    changedDerivative[changeLocation+j] = changeOutput[j];
                }
            }
            return [changedBase, changedDerivative];
        };


        var changeFeatures = function(segment, featureBundle) {
            /* Return a segment which has all the feature specifications given in 
             * the feature bundle, with all missing features filled in by those
             * associated with the given segment. */ 
            var outFeatures = $.extend(true, {}, FeatureManager.getSegment(segment));
            for (feature in featureBundle) {
                outFeatures[feature] = featureBundle[feature];
            }
            var outFeatureList = [];
            for (feature in outFeatures) {
                if (feature !== 'symbol') {
                    outFeatureList.push([outFeatures[feature], feature].join(""));
                }
            }

            var bestMatch = FeatureManager.naturalClass(outFeatureList).split('|')[0]
            if (bestMatch.length === 0) {
                return segment;
            } else {
                return bestMatch;
            }
        }

        changeOrientations = changeOrientations || {delete: 'product', mutate: 'product', metathesize: 'product'};
        if (!returnAlignment) {
            returnAlignment = false;
        }

        if (relevantHypothesis(hypothesis, word, changeOrientations)===false) {
            return "incompatible";
        }

        var currentBase = addNulls(word.slice(0).toString());
        var currentDerivative = addNulls(word.slice(0).toString());

        for (var i=0;i<hypothesis.changes.length;i++) {
            var currentBaseAndDerivative = applyChange(currentBase, currentDerivative, hypothesis.changes[i]);
            currentBase = currentBaseAndDerivative[0];
            currentDerivative = currentBaseAndDerivative[1];
        }

        if (returnAlignment) {
            return [_.flatten(currentBase), _.flatten(currentDerivative)];
        } else {
            return linearizeWord(currentDerivative);
        }
    };


    var linearizeWord = function (word) {
        /* Take a non-string wordform (e.g. base or derivative of an
         * alignment) and return it as a " "-spaced string with no nulls */
        var flatWord = _.flatten(word);

        var withoutNulls = _.without(flatWord, null);

        var output = withoutNulls.toString().replace(/,/g, " ");

        return output;
    };

    var contextToString = function (context) {
    	var outstr = "";
    	for (var property in context) {
		    if (context.hasOwnProperty(property)) {
		        outstr += property + ": " + context[property] + "\n"
		    }
		}
		return outstr;
    };


    return {
        log: _log,

        learn : learn,
        alignPairs : alignPairs,
        sortThings : sortThings,
        findDifferences : findDifferences,
        createHypotheses : createHypotheses,
        groupDiffsToContinuous : groupDiffsToContinuous,
        // possibleLocationCombos : possibleLocationCombos,
        negativeIndexing : negativeIndexing,
        // indicesToSegments : indicesToSegments,
        checkMetathesis : checkMetathesis,
        consolidateHypotheses : consolidateHypotheses,
        removeSubsetHypotheses : removeSubsetHypotheses,
        // consumeSubsets : consumeSubsets,
        initialize: initialize,

        produceDerivatives : produceDerivatives,
        addNulls : addNulls,
        // relevantHypothesis : relevantHypothesis,
        // checkTarget : checkTarget,
        // checkPosition : checkPosition,
        applyHypothesis : applyHypothesis,
        // orderChanges : orderChanges,
        // applyChange : applyChange,
        linearizeWord : linearizeWord,
        indexToPositive : indexToPositive,

        initialized : initialized,
        trainingData : trainingData,
        testingData : testingData
    };

})(jQuery);
