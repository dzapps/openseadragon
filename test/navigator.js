QUnit.config.autostart = false;

(function () {
    var viewer = null;
    var displayRegion = null;
    var navigator = null;
    var navigatorAspectRatio = null;
    var leftScalingFactor = null;

    module("navigator", {
        setup:function () {
            //This is longer than is ideal so the tests will pass cleanly under Safari
            QUnit.config.testTimeout = 20000;
            resetDom();
            resetTestVariables();
        }
    });

    $(document).ready(function () {
        start();
    });

    var resetTestVariables = function()
    {
         if (viewer != null) {
             viewer.close();
         }
         displayRegion = null;
         navigator = null;
         navigatorAspectRatio = null;
         leftScalingFactor = null;
    };

    var resetDom = function()
    {
        if ($('#exampleNavigator').is(':ui-dialog')) {
            $('#exampleNavigator').dialog('destroy');
        }
        $("#exampleNavigator").remove();
        $(".navigator").remove();
        $("#example").empty();
        $("#tallexample").empty();
        $("#wideexample").empty();
        $("#example").parent().append('<div id="exampleNavigator"></div>');
    };

    var equalsWithSomeVariance = function (value1, value2, variance) {
        return Math.abs(value1 - value2) <= variance;
    };


    var assessNumericValueWithSomeVariance = function (value1, value2, variance, message) {
        ok(equalsWithSomeVariance(value1, value2, variance), message + " Expected:" + value1 + " Found: " + value2 + " Variance: " + variance);
    };

    var assessNavigatorLocation = function (expectedX, expectedY) {
        var navigator = $(".navigator");

        assessNumericValueWithSomeVariance(expectedX, navigator.offset().left, 4, ' Navigator x position');
        assessNumericValueWithSomeVariance(expectedY, navigator.offset().top, 4, ' Navigator y position');
    };

    var navigatorRegionBoundsInPoints = function (theDisplayRegionSelector)
    {
        var regionBoundsInPoints;
        if (displayRegion === null)
        {
            displayRegion = $(theDisplayRegionSelector);
        }
        if (navigator === null)
        {
            navigator = $(".navigator");
            navigatorAspectRatio = navigator.height() /navigator.width();
            leftScalingFactor = navigatorAspectRatio * viewer.source.aspectRatio;
        }
        var mainViewerBounds = viewer.viewport.getBounds();

        var maxHeightFactor = 1;
        var spaceFromLeftEdgeOfViewerToContentStart = 0;
        var spaceFromTopEdgeOfViewerToContentStart = 0;
        if (viewer.source.aspectRatio < 1)
        {
            if (viewer.source.aspectRatio < navigatorAspectRatio)
            {
                maxHeightFactor =  viewer.source.aspectRatio * navigatorAspectRatio;
            }
            else
            {
                maxHeightFactor =  viewer.source.aspectRatio;
            }
            spaceFromLeftEdgeOfViewerToContentStart = ((1/maxHeightFactor)-1) / 2 * maxHeightFactor * navigator.width();
        }
        else
        {
            if (viewer.source.aspectRatio < navigatorAspectRatio)
            {
                spaceFromTopEdgeOfViewerToContentStart =  (navigatorAspectRatio - (1/viewer.source.aspectRatio)) / 2 /navigatorAspectRatio * navigator.height();
            }
            else
            {
                spaceFromTopEdgeOfViewerToContentStart =  (navigatorAspectRatio - (1/viewer.source.aspectRatio)) / 2 /navigatorAspectRatio * navigator.height();
                leftScalingFactor = 1;
            }
        }
        var expectedDisplayRegionWidth = navigator.width() / viewer.viewport.getZoom() * maxHeightFactor;
        var expectedDisplayRegionHeight = navigator.height() / viewer.viewport.getZoom() * maxHeightFactor;
        var expectedDisplayRegionXLocation = mainViewerBounds.x * maxHeightFactor * navigator.width()   + spaceFromLeftEdgeOfViewerToContentStart;
        var expectedDisplayRegionYLocation = mainViewerBounds.y *  leftScalingFactor * navigator.width()  + spaceFromTopEdgeOfViewerToContentStart ;
        regionBoundsInPoints = new OpenSeadragon.Rect(expectedDisplayRegionXLocation,expectedDisplayRegionYLocation,expectedDisplayRegionWidth,expectedDisplayRegionHeight);


        return regionBoundsInPoints;

    };

    var assessNavigatorDisplayRegionAndMainViewerState = function (theViewer, theDisplayRegionSelector, status) {

        var expectedBounds = navigatorRegionBoundsInPoints(theDisplayRegionSelector);
        assessNumericValueWithSomeVariance(expectedBounds.width, displayRegion.width() + viewer.navigator.totalBorderWidths.x, 2, status + ' Width synchronization');
        assessNumericValueWithSomeVariance(expectedBounds.height, displayRegion.height() + viewer.navigator.totalBorderWidths.y, 2, status + ' Height synchronization');
        assessNumericValueWithSomeVariance(expectedBounds.x, displayRegion.position().left, 4, status + ' Left synchronization');
        assessNumericValueWithSomeVariance(expectedBounds.y, displayRegion.position().top, 4, status + ' Top synchronization');
    };

    var filterToDetectThatDisplayRegionHasBeenDrawn = function () {
        var self = $(this);
        return self.width() > 0 &&
            self.height() > 0 &&
            (typeof self.position() !== 'undefined');
    };

    var waitUntilFilterSatisfied = function () {
        return function () {
            return function (selector, filterfunction, handler, recursiveCall, count) {
                var found;
                if (recursiveCall !== true) {
                    count = 0;
                }
                var $this = $(selector).filter(filterfunction);
                found = found || $this.length > 0;
                if (!found && count < 20) {
                    setTimeout(function () {
                        count++;
                        waitUntilFilterSatisfied(selector, filterfunction, handler, true, count);
                    }, 50)
                }
                else {
                    console.log( "waitUntilFilterSatisfied:" + found + ":" + $this.length + ":" + count );
                    handler();
                }
            };
        }();
    }();

    var waitForViewer = function () {
        return function () {
            return function (theViewer, handler, targetPropery, viewportFunctionToInspectTargetProperty, recursiveCall, count, lastDisplayRegionLeft, lastDisplayWidth) {
                var currentDisplayRegionLeft;
                var currentDisplayWidth;
                if (displayRegion === null)
                {
                    displayRegion = $(".displayregion");
                }
                var propertyAchieved = false;
                if (recursiveCall !== true) {
                    count = 0;
                    lastDisplayRegionLeft = null;
                    lastDisplayWidth = null;
                }
                if (typeof viewportFunctionToInspectTargetProperty === "function") {
                    try
                    {
                        currentDisplayRegionLeft =  displayRegion.position().left;
                        currentDisplayWidth =  displayRegion.width();
                        propertyAchieved = equalsWithSomeVariance(lastDisplayRegionLeft, currentDisplayRegionLeft,.0001) &&
                            equalsWithSomeVariance(lastDisplayWidth,currentDisplayWidth,.0001) &&
                            equalsWithSomeVariance(theViewer.viewport.getBounds(true).x,theViewer.viewport.getBounds().x,.0001) &&
                                equalsWithSomeVariance(theViewer.viewport.getBounds(true).y,theViewer.viewport.getBounds().y,.0001);
                    }
                    catch(err)
                    {
                        //Ignore.  Subsequent code will try again shortly
                    }
                }
                if ((theViewer.drawer === null || theViewer.drawer.needsUpdate() || (typeof viewportFunctionToInspectTargetProperty === "function" && !propertyAchieved)) && count < 40) {
                    count++;
                    setTimeout(function () {
                        waitForViewer(theViewer, handler, targetPropery, viewportFunctionToInspectTargetProperty, true, count, currentDisplayRegionLeft, currentDisplayWidth);
                    }, 100)
                }
                else {
                    try
                    {
                        if (typeof viewportFunctionToInspectTargetProperty === "function") {
                    console.log( "waitForViewer:" + theViewer.drawer + ":" + theViewer.drawer.needsUpdate()  + ":" + propertyAchieved + ":" + lastDisplayRegionLeft + ":" + currentDisplayRegionLeft + ":" + lastDisplayWidth + ":" + currentDisplayWidth + ":" + viewportFunctionToInspectTargetProperty.call(theViewer.viewport) + ":" + viewportFunctionToInspectTargetProperty.call(theViewer.viewport,true) + ":" + count );
                        }
                        else
                        {
                            console.log( "waitForViewer:" + theViewer.drawer + ":" + theViewer.drawer.needsUpdate()  + ":" + propertyAchieved + ":" + lastDisplayRegionLeft + ":" + currentDisplayRegionLeft + ":" + lastDisplayWidth + ":" + currentDisplayWidth + ":"  + count );

                        }
                        }
                    catch (err)
                    {
                        console.log( "stophere:");
                    }
                    handler();
                }
            };
        }();
    }();

    var clickOnNavigator = function(theContentCorner)
    {
       var xPos, yPos;
       if (theContentCorner === "TOPRIGHT")
       {
           xPos = 0;
           yPos = 0;
       }
       else if (theContentCorner === "TOPRIGHT")
       {
           xPos = 1;
           yPos = 0;

       }
       else if (theContentCorner === "BOTTOMRIGHT")
       {
           xPos = 0;
           yPos = 1;
       }
       else if (theContentCorner === "BOTTOMLEFT")
       {
           xPos = 1;
           yPos = 1;
       }
        Util.simulateNavigatorClick(viewer.navigator, xPos, yPos);
    };

    var dragNavigatorBackToCenter = function()
    {
        var start = viewer.viewport.getBounds().getTopLeft();
        var target = new OpenSeadragon.Point(0.5,1/viewer.source.aspectRatio/2);
        var delta = target.minus(start);
        Util.simulateNavigatorDrag(viewer.navigator, delta.x, delta.y);
    };

    var assessNavigatorViewerPlacement = function (seadragonProperties, testProperties) {
        viewer = OpenSeadragon(seadragonProperties);

        var assessAfterDragNavigatorFromTopRight = function() {
               assessNavigatorDisplayRegionAndMainViewerState(viewer, testProperties.displayRegionLocator, "After drag on navigator");
               start();
       };

         var assessAfterClickOnNavigatorTopRight = function() {
             var dragVector = new OpenSeadragon.Point(0.1,0.1);
             var expectedCenter = new OpenSeadragon.Point(0.5, viewer.source.aspectRatio/2).plus(dragVector);
             assessNavigatorDisplayRegionAndMainViewerState(viewer, testProperties.displayRegionLocator, "After click on navigator");
             dragNavigatorBackToCenter();
             //Util.simulateNavigatorDrag(viewer.navigator, dragVector.x, dragVector.y);
             waitForViewer(viewer, assessAfterDragNavigatorFromTopRight, expectedCenter, viewer.viewport.getCenter);
        };

        var assessAfterDragOnViewer = function () {
            var navigatorCenter = viewer.navigator.viewport.getCenter();
            var expectedCenter = new OpenSeadragon.Point(0.5, viewer.source.aspectRatio/2);
            assessNavigatorDisplayRegionAndMainViewerState(viewer, testProperties.displayRegionLocator, "After pan");
            clickOnNavigator("TOPRIGHT");
            //Util.simulateNavigatorClick(viewer.navigator, navigatorCenter.x, navigatorCenter.y);
            waitForViewer(viewer, assessAfterClickOnNavigatorTopRight, expectedCenter, viewer.viewport.getCenter);
        };

        var assessAfterZoomOnViewer = function () {
            var target = new OpenSeadragon.Point(0.4, 0.4);
            assessNavigatorDisplayRegionAndMainViewerState(viewer, testProperties.displayRegionLocator, "After image zoom");
            viewer.viewport.panTo(target);
            waitForViewer(viewer, assessAfterDragOnViewer, target, viewer.viewport.getCenter);
        };

        var captureInitialStateAfterOpenAndThenAct = function () {
            assessNavigatorDisplayRegionAndMainViewerState(viewer, testProperties.displayRegionLocator, "After image load");

            testProperties.determineExpectationsAndAssessNavigatorLocation(seadragonProperties, testProperties);

            viewer.viewport.zoomTo(viewer.viewport.getZoom() * 2);
            waitForViewer(viewer, assessAfterZoomOnViewer, 2, viewer.viewport.getZoom);
        };

        var proceedOnceTheIntialImagesAreLoaded = function () {
            waitUntilFilterSatisfied(testProperties.displayRegionLocator, filterToDetectThatDisplayRegionHasBeenDrawn, captureInitialStateAfterOpenAndThenAct);
        };

        var waitForNavigator = function () {
            waitForViewer(viewer.navigator, proceedOnceTheIntialImagesAreLoaded);
        };

        var openHandler = function () {
            viewer.removeHandler('open', openHandler);
            waitForViewer(viewer, waitForNavigator);
        };

        viewer.addHandler('open', openHandler);

    };

    asyncTest('ZoomAndDragOnCustomNavigatorLocation', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                navigatorId:'exampleNavigator',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'#exampleNavigator .displayregion',
                navigatorLocator:'#exampleNavigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    assessNavigatorLocation(mainViewerElement.offset().left,
                        mainViewerElement.offset().top + mainViewerElement.height());
                }
            });
    });

    asyncTest('DefaultNavigatorLocation', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('NavigatorOnJQueryDialog', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                navigatorId:'exampleNavigator',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/testpattern.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'#exampleNavigator .displayregion',
                navigatorLocator:'#exampleNavigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var jqueryDialog = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(jqueryDialog.offset().left,
                        jqueryDialog.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithWideImageSquareViewer', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/wide.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithWideImageTallViewer', function () {
        assessNavigatorViewerPlacement({
                id:'tallexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/wide.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithWideImageWideViewer', function () {
        assessNavigatorViewerPlacement({
                id:'wideexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/wide.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithTallImageSquareViewer', function () {
        assessNavigatorViewerPlacement({
                id:'example',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithTallImageTallViewer', function () {
        assessNavigatorViewerPlacement({
                id:'tallexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });

    asyncTest('DefaultNavigatorLocationWithTallImageWideViewer', function () {
        assessNavigatorViewerPlacement({
                id:'wideexample',
                prefixUrl:'/build/openseadragon/images/',
                tileSources:'/test/data/tall.dzi',
                showNavigator:true
            },
            {
                displayRegionLocator:'.navigator .displayregion',
                navigatorLocator:'.navigator',
                determineExpectationsAndAssessNavigatorLocation:function (seadragonProperties, testProperties) {
                    var mainViewerElement = $("#" + seadragonProperties.id);
                    var navigatorElement = $(testProperties.navigatorLocator);
                    assessNavigatorLocation(mainViewerElement.offset().left + mainViewerElement.width() - navigatorElement.width(),
                        mainViewerElement.offset().top);
                }
            });
    });


    //Try with different navigator locations, in a jquery dialog and in a default location
    //Test whether showNavigator works
    //Test whether the initial locations works

    //Other tests that require additional sample images
    //Switch content, make sure things work

    //Other tests that require a reasonable event simulation approach
    //Test autohide
    //Operate on the navigator


})();
