
var Faithfulness = (function($, undefined){

    var initialized = false;
    var FeatureManager = Aligner.FeatureManager;
    var faithfulnessConstraintFile = "";
    var faithfulnessConstraintDict = {};

    var _log = function (message) {
        console.log(message);
    }

    var initialize = function (obj) {

        _log("Initializing Faithfulness module...");
        var obj = obj || {};

        var faithfulnessConstraintFile = obj.faithfulnessConstraintFile || "faith_constraints.txt";

        _log("Loading faithfulness constraint dictionary: " + faithfulnessConstraintFile);
        FileManager.loadText(faithfulnessConstraintFile);
        if (FileManager.status()) {
            constraints = FileManager.get();
            for (var i=0;i<constraints.length;i++) {
                faithfulnessConstraintDict[constraints[i][0]] = constraints[i][1];
            }
        }
        _log("Faithfulness constraint dictionary loaded.");

        _log("Faithfulness module initialized.");
    };


    var translateFaithfulnessConstraint = function(name) {
        /* Decide whether to convert Faithfulness constraint by looking it
         * up in the dictionary file or translating it automatically */
        if (faithfulnessConstraintDict[name]) {
            return faithfulnessConstraintDict[name];
        } else {
            return autoFaithConstraintConversion(name);
        }
    };


    var autoFaithConstraintConversion = function(constraint) {
        /* Translate Faithfulness constraint from its name (string) to
         * a violation-assessing function.  Requires that the constraint name
         * be in the standard Faithfulness constraint format. */
        constraint = constraint.split(' ');

        var faithType = constraint[1];
        var targetFeatures = constraint[2];
        var contextualFeatures = constraint[3];
        if (targetFeatures) {
        	// remove square brackets, split on comma, e.g. "[back,round]" -> ["back","round"]
            targetFeatures = targetFeatures.slice(1, -1).split(',');
        } else {
            targetFeatures = null;
        }
        if (contextualFeatures) {
        	// make into object, e.g. "[+back,-round]" -> {back: "+", round: "-"}
            contextualFeatures = contextualFeatures.slice(1, -1).split(',');
            var c = {};
            for (var i=0; i<contextualFeatures.length; i++) {
            	c[contextualFeatures[i].slice(1)] = contextualFeatures[i].slice(0,1);
            }
            contextualFeatures = c;
        } else {
            contextualFeatures = null;
        }


        if (faithType === "Ident") {
            var identConstraint = function(alignment) {
                var input = alignment[0];
                var output = alignment[1];

                if (input === null) {
                    input = output; // blake, when would this happen? shouldn't faith be vacuously satisfied if either input or output are missing?
                }
                var violationAccumulator = 0;
                // console.log(input)
                // console.log(output)
                // temp
                // if (input.length !== output.length) {
                //     return 0;
                // }
                // temp above
                for (var i=0;i<output.length;i++) {
                    if (input[i] !== null && output[i] !== null) {
                        if (targetFeatures) {
                            // console.log(i)
                            // console.log(input[i])
                            // makes two arrays, each length of targetFeatures, with the feature values, e.g. [high] + o->u == ["-"], ["+"]
                            var inputFeatureValues = $.map(targetFeatures, function(f){return FeatureManager.getSegment(input[i])[f]});
                            var outputFeatureValues = $.map(targetFeatures, function(f){return FeatureManager.getSegment(output[i])[f]});

							if (inputFeatureValues.toString() !== outputFeatureValues.toString()) {
							// the two arrays are collapsed, i.e. multiple target features = one violation if one of the features is violated
							// this isn't necessarily the right behavior, but we don't really expect that people will have multiple
							// target features, anyway
								if (contextualFeatures) {
                               		// penalize only if output segment matches all contextual features
									var match = 1;
									for (var k in contextualFeatures) {
										if (contextualFeatures[k] != FeatureManager.getSegment(output[i])[k]) {
											match = 0;
										}
									}
									if (match===1) {
										violationAccumulator += 1;
									}
								} else {
									// no contextual features, so a violation is incurred irrregardless
									violationAccumulator += 1;
								}
							}
							/*
                            for (var j=0;j<inputFeatureValues.length;j++) {
                                if (inputFeatureValues[j] !== outputFeatureValues[j]) {

                                	if(contextualFeatures) {
                                		// penalize only if output segment matches all contextual features
                                		var match = 1;
                                		for (var k in contextualFeatures) {
                                			if (contextualFeatures[k] != FeatureManager.getSegment(output[i])[k]) {
                                				match = 0;
                                			}
                                		}
                                		if (match==1) {
                                			violationAccumulator += 1;
                                			break;
                                		}
                                	} else {
	                                    violationAccumulator += 1; // records a violation for each feature separately?!
    	                                break; // so at most one violation is recorded?
                                	}
                                }
                            }
                            */

                        /*} else {
                            // if no target features, then raw faith(?)
                            if (input[i] !== output[i]) {
                                violationAccumulator += 1
                            }*/
                        }
                    }
                }
                return violationAccumulator;
            }


            return identConstraint;
        }

        if (faithType === "Max") {
            var maxConstraint = function(alignment) {
                var input = alignment[0]
                var output = alignment[1]

                if (input === null) {
                    input = output;
                }
                var violationAccumulator = 0;
                for (var i=0;i<output.length;i++) {
                    if (input[i] !== null && output[i] === null) {
                        if (targetFeatures) {
                            var inputFeatureValues = $.map(targetFeatures, function(f){return FeatureManager.getSegment(input[i])[f.slice(1)]});

                            var specifiedValues = $.map(targetFeatures, function(f){return f[0]});
                            var resultBooleans = $.map(specifiedValues, function(x,i){ return specifiedValues[i] === inputFeatureValues[i]});

                            if (resultBooleans.every(Boolean)) {
                                violationAccumulator += 1;
                            }
                        } else {
                            violationAccumulator += 1;
                        }
                    }
                }
                return violationAccumulator;
            }


            return maxConstraint;
        }

        if (faithType === "Dep") {
            var maxConstraint = function(alignment) {
                var input = alignment[0]
                var output = alignment[1]

                if (input === null) {
                    input = output;
                }
                var violationAccumulator = 0;
                for (var i=0;i<output.length;i++) {
                    if (input[i] === null && output[i] !== null) {
                        if (targetFeatures) {
                            var outputFeatureValues = $.map(targetFeatures, function(f){return FeatureManager.getSegment(output[i])[f.slice(1)]});

                            var specifiedValues = $.map(targetFeatures, function(f){return f[0]});
                            var resultBooleans = $.map(specifiedValues, function(x,i){ return specifiedValues[i] === outputFeatureValues[i]});

                            if (resultBooleans.every(Boolean)) {
                                violationAccumulator += 1;
                            }
                        } else {
                            violationAccumulator += 1;
                        }
                    }
                }
                return violationAccumulator;
            }


            return maxConstraint;
        }

        else {
            _log("Faithfulness constraint type invalid: " + faithType);
        }
    };


    return {
        initialize: initialize,
        translateFaithfulnessConstraint: translateFaithfulnessConstraint
    };

})(jQuery);
