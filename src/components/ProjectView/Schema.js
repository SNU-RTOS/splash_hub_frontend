import React, {useEffect, useState} from 'react';
import * as go from 'gojs';
import { ReactDiagram } from 'gojs-react';
import '../../libs/gojs/GoJS/Figures.js';
import './diagramComponent.css'
function CustomLayout() {
    go.Layout.call(this);
}
CustomLayout.prototype.doLayout = function(coll) {
    coll = this.collectParts(coll);

    var supers = new go.Set(/*go.Node*/);
    coll.each(function(p) {
        if (p instanceof go.Node && p.category === "buildUnit") supers.add(p);
    });

    function membersOf(sup, diag) {
        var set = new go.Set(/*go.Part*/);
        var arr = sup.data._members;
        for (var i = 0; i < arr.length; i++) {
        var d = arr[i];
        set.add(diag.findNodeForData(d));
        }
        return set;
    }

    function isReady(sup, supers, diag) {
        var arr = sup.data._members;
        if(arr === undefined) return false;
        for (var i = 0; i < arr.length; i++) {
            var d = arr[i];
            if (d.category === "buildUnit") continue;
            var n = diag.findNodeForData(d);
            if (supers.has(n)) return false;
        }
        return true;
    }
    // implementations of doLayout that do not make use of a LayoutNetwork
    // need to perform their own transactions
    this.diagram.startTransaction("Custom Layout");
    while (supers.count > 0) {
        var ready = null;
        var it = supers.iterator;
        while (it.next()) {
            if (isReady(it.value, supers, this.diagram)) {
                ready = it.value;
                break;
            }
        }
        supers.remove(ready);
        var b = this.diagram.computePartsBounds(membersOf(ready, this.diagram));
        ready.location = new go.Point(b.position.x, b.position.y - 25);
        var body = ready.findObject("BODY");
        if (body) { 
            body.desiredSize = new go.Size(b.size.width, b.size.height + 25);
        }
    }
    this.diagram.commitTransaction("Custom Layout");
};
let myDiagram;
const factory_mode_select_map = new Map();
function initDiagram() {
    go.Diagram.inherit(CustomLayout, go.Layout);
        
    const $ = go.GraphObject.make;
    myDiagram =
        $(go.Diagram, 
        {
            initialDocumentSpot: go.Spot.TopCenter,
            initialViewportSpot: go.Spot.TopCenter,
            layout: $(CustomLayout), 
            "draggingTool.isGridSnapEnabled": true,
            "undoManager.isEnabled": true,
            "animationManager.isEnabled": false,
            model: $(go.GraphLinksModel,
                {
                  linkKeyProperty: 'key'  // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
                })
        }); 
    myDiagram.grid =
        $(go.Panel, "Grid",
            {
                name: "GRID",
                visible: true,
                gridCellSize: new go.Size(10, 10),
                gridOrigin: new go.Point(0, 0)
            },
            $(go.Shape, "LineH", { stroke: "lightgray", strokeWidth: 0.5, interval: 1 }),
            $(go.Shape, "LineH", { stroke: "gray", strokeWidth: 0.5, interval: 5 }),
            $(go.Shape, "LineH", { stroke: "gray", strokeWidth: 1.0, interval: 10 }),
            $(go.Shape, "LineV", { stroke: "lightgray", strokeWidth: 0.5, interval: 1 }),
            $(go.Shape, "LineV", { stroke: "gray", strokeWidth: 0.5, interval: 5 }),
            $(go.Shape, "LineV", { stroke: "gray", strokeWidth: 1.0, interval: 10 })
        );
    myDiagram.linkTemplate = 
        $(go.Link,
            {
            // routing: go.Link.AvoidsNodes,
            routing: go.Link.Orthogonal,
            curve: go.Link.JumpOver,
            corner: 0,
            relinkableFrom: false, relinkableTo: false,
            reshapable: false,
            selectionAdorned: false, // Links are not adorned when selected so that their color remains visible.
            shadowOffset: new go.Point(0, 0), shadowBlur: 5, shadowColor: "blue",
            },
            new go.Binding("isShadowed", "isSelected").ofObject(),
            
            //new go.Binding("isShadowed", "segArray", go.Binding.toString()).makeTwoWay(),
            $(go.Shape,
            { name: "SHAPE", strokeWidth: 1, stroke: "black" }),
        );
    const  template_streamPort = 
        $(go.Node, "Spot", splash_portStyle(),
        { 
            name: "STREAM_UNTYPED_PORT",
            zOrder : 10,
        },
        $(go.Shape, "Rectangle", 
        { width: 20, height:20, },
        new go.Binding("fill", "", function(data,node) {
            return isNaN(data.Rate) || data.Rate == "" ? "white" : "gray";
        }).makeTwoWay(),
        ),
        $(go.Shape, "TriangleRight", 
        { width: 10, height: 10, },
        new go.Binding("fill", "", function(data,node) {
            return isNaN(data.Rate) || data.Rate == "" ? "black" : "white";
        }).makeTwoWay(),
        ),
        $(go.Shape, "Rectangle", splash_streamPortStyle(),
        { portId: "", alignment: new go.Spot(0.5, 0.5) }),
        $(go.TextBlock,
        {
            editable: true,
            alignment: new go.Spot(1.0, -0.5), alignmentFocus: go.Spot.TopLeft,
            textAlign: "center",
            maxLines: 1,
            isMultiline: false,
        },
        new go.Binding("text", "Channel").makeTwoWay(),
        ),
        new go.Binding("name", "PORT_TYPE").makeTwoWay(),
    ); 
    function splash_componentStyle() {
        return [
            new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            new go.Binding("isShadowed", "isSelected").ofObject(),
            {
                movable: false,
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: false,
                resizeObjectName: "SHAPE",
                visible: true,
            }
        ];
    }
    function splash_portStyle() {
        return [
          splash_componentStyle(),
          new go.Binding("location", "loc", calcPortLocation).makeTwoWay(go.Point.stringify),
          {
            resizable: false,
          }            
        ];
      }     
      function splash_atomicComponentStyle() {
        return [
          splash_componentStyle(),
          {
            ungroupable: true,
            locationSpot: go.Spot.Center,
            zOrder: 5,
            layerName: "Background",
          }
        ];
      }
      
      function splash_factoryStyle() {
        return [
          splash_componentStyle(),
          {
            ungroupable: true,
            locationSpot: go.Spot.Center,
            zOrder: 1,
            layerName: "Background",
          }
        ];
      }
      function splash_streamPortStyle() {
        return {
          name: "STREAM_PORT",
          desiredSize: new go.Size(20, 20),
          fill: "transparent",
          fromSpot: go.Spot.Right,
          fromLinkable: false,
          fromMaxLinks: Number.MAX_VALUE,
          toSpot: go.Spot.Left,
          toLinkable: false,
          toMaxLinks: 1,
          stroke: "black",
          cursor: "pointer",
        };
      }
      function splash_eventPortStyle() {
        return {
          name: "EVENT_PORT",
          desiredSize: new go.Size(20, 20),
          fill: "transparent",
          fromSpot: go.Spot.Top,
          fromLinkable: false,
          fromMaxLinks: Number.MAX_VALUE,
          toSpot: go.Spot.Top,
          toLinkable: false,
          toMaxLinks: 1,
          stroke: "black",
          cursor: "pointer",
        };
      } 
      var template_eventInputPort = 
      $(go.Node, "Spot", splash_portStyle(),
        { 
          name: "EVENT_INPUT_PORT",
          zOrder : 10
          },
        $(go.Shape, "Rectangle", 
          { fill: "white", width: 20, height:20 }),
        $(go.Shape, "ISOProcess", 
          { fill: "black", width: 16, height: 13, stroke: "white", angle: 90, alignment: new go.Spot(0.5, 0.5)},
        ),
        $(go.Shape, "Rectangle", splash_eventPortStyle(),
          { portId: "", alignment: new go.Spot(0.5, 0.5) }),
        new go.Binding("name", "PORT_TYPE").makeTwoWay(),
    ); 
  
  
    var template_eventOutputPort = 
      $(go.Node, "Spot", splash_portStyle(),
        { 
          name: "EVENT_OUTPUT_PORT",
          zOrder : 10,
        },
        $(go.Shape, "Rectangle", 
          { fill: "white", width: 20, height:20 }),
        $(go.Shape, "ISOProcess", 
          { fill: "black", width: 16, height: 13, stroke: "white", angle: 270, alignment: new go.Spot(0.5, 0.5)},
        ),
        $(go.Shape, "Rectangle", splash_eventPortStyle(),
        { 
          portId: "", 
          alignment: new go.Spot(0.5, 0.5) 
        }),
        $(go.TextBlock,
        {
          editable: true,
          alignment: new go.Spot(1.0, 0.0), alignmentFocus: go.Spot.BottomLeft,
          textAlign: "center",
          maxLines: 1,
          isMultiline: false,
        },
        new go.Binding("text", "Event").makeTwoWay(),
      ),
        new go.Binding("name", "PORT_TYPE").makeTwoWay(),
    );     
    function splash_modeChangePortStyle() {
        return {
          name: "MODECHANGE_PORT",
          desiredSize: new go.Size(20, 20),
          fill: "transparent",
          fromSpot: go.Spot.Top,
          fromLinkable: false,
          fromMaxLinks: Number.MAX_VALUE,
          toSpot: go.Spot.Top,
          toLinkable: false,
          toMaxLinks: 1,
          stroke: "black",
          cursor: "pointer",
        };
      } 
      
    var template_modeChangeInputPort = 
      $(go.Node, "Spot", splash_portStyle(),
        { 
          name: "MODECHANGE_INPUT_PORT",
          zOrder : 10
          },
        $(go.Shape, "Rectangle", 
          { fill: "white", width: 20, height:20 }),
        $(go.Shape, "Circle", 
          { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.5, 0.7) }),
        $(go.Shape, "Circle", 
          { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.5-0.231, 0.3) }),
        $(go.Shape, "Circle", 
          { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.5+0.231, 0.3) }),
        $(go.Shape, "Rectangle", splash_modeChangePortStyle(),
          { portId: "", alignment: new go.Spot(0.5, 0.5) }),
        new go.Binding("name", "PORT_TYPE").makeTwoWay(),
      ); 
    
    
    var template_modeChangeOutputPort = 
      $(go.Node, "Spot", splash_portStyle(),
        { 
          name: "MODECHANGE_OUTPUT_PORT",
          zOrder : 10
          },
        $(go.Shape, "Rectangle", 
          { fill: "white", width: 20, height:20 }),
        $(go.Shape, "Circle", 
          { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.5, 0.3) }),
        $(go.Shape, "Circle", 
          { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.5-0.231, 0.7) }),
        $(go.Shape, "Circle", 
          { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.5+0.231, 0.7) }),
        $(go.Shape, "Rectangle", splash_modeChangePortStyle(),
        { portId: "", alignment: new go.Spot(0.5, 0.5) }
        ),
        new go.Binding("name", "PORT_TYPE").makeTwoWay(),
      );      
      var template_processingComponent =
        $(go.Group, "Spot", splash_atomicComponentStyle(),
          {
            name: "PROCESSING",   
          },
          $(go.Shape, "Rectangle",
            { 
              name: "SHAPE" ,
              fill: "white", stroke: "black", strokeWidth: 1.5,
             	height: 100, width: 100,

            },
            new go.Binding("width", "WIDTH").makeTwoWay(),
            new go.Binding("height", "HEIGHT").makeTwoWay(), 
          ),   
          $(go.TextBlock,
            {
              editable: false,
              stretch: go.GraphObject.Horizontal,
              alignment: go.Spot.BottomLeft,
              alignmentFocus: new go.Spot(0,0,0,0),
              textAlign: "center",
              margin: 2,
              overflow: go.TextBlock.OverflowEllipsis,
              maxLines: 5,
              isMultiline: false,
            },
            new go.Binding("text", "key").makeTwoWay(),
          ),
          
          $(go.Shape, "Rectangle",
            { 
              name: "AREA_STREAM_INPUT_PORT",
              stretch: go.GraphObject.Vertical,
              fill: null, stroke: null, strokeWidth: 0,
              width: 30,
              opacity: 0.5,
              alignment: go.Spot.Left,
              alignmentFocus: new go.Spot(0,0.5,0,0),
              }                        
          ),  
          $(go.Shape, "Rectangle",
            { 
              name: "AREA_STREAM_OUTPUT_PORT",
              stretch: go.GraphObject.Vertical,
              fill: null, stroke: null, strokeWidth: 0,
              width: 30,
              opacity: 0.5,
              alignment: go.Spot.Right,
              alignmentFocus: new go.Spot(1,0.5,0,0),              
              }            
          ),  
          $(go.Shape, "Rectangle",
            { 
              name: "AREA_EVENT_PORT",
              stretch: go.GraphObject.Horizontal,
              fill: null, stroke: null, strokeWidth: 0,
              height: 30,
              opacity: 0.5,
              alignment: go.Spot.TopLeft,
              alignmentFocus: new go.Spot(0,0,0,0),              
            },             
          ),
          $(go.Shape, "Rectangle",
            { 
              name: "AREA_MODECHANGE_PORT",
              stretch: go.GraphObject.Horizontal,
              fill: null, stroke: null, strokeWidth: 0,
              height: 30,
              opacity: 0.5,
              alignment: go.Spot.TopLeft,
              alignmentFocus: new go.Spot(0,0,0,0),              
            },             
          ),
        ); 
        var template_sourceComponent = 
          $(go.Group, "Spot", splash_atomicComponentStyle(),
          { 
              name: "SOURCE",
              resizable: false,
          },
            
          $(go.Shape, "Rectangle",
            { 
              name: "SHAPE",
              fill: "white", width: 80, height: 40, stroke: "black", strokeWidth: 1.5,
              alignmentFocus: new go.Spot(0,0,0,0),
            },
          ), 
          
          $(go.TextBlock,
            {
              editable: false,
              stretch: go.GraphObject.Horizontal,
              alignment: go.Spot.BottomLeft,
              alignmentFocus: new go.Spot(0,0,0,0),
              textAlign: "center",
              margin: 2,
              overflow: go.TextBlock.OverflowEllipsis,
              maxLines: 5,              
              isMultiline: false,
            },
            new go.Binding("text", "key").makeTwoWay(),
          ),
          
          $(go.Shape, "Rectangle",
            { 
              name: "AREA_STREAM_OUTPUT_PORT",
              stretch: go.GraphObject.Vertical,
              fill: null, stroke: null, strokeWidth: 0,
              width: 30,
              opacity: 0.5,
              alignment: go.Spot.Right,
              alignmentFocus: new go.Spot(1,0.5,0,0),              
            },          
          ), 
        );          
        var template_sinkComponent = 
        $(go.Group, "Spot", splash_atomicComponentStyle(),
        { 
            name: "SINK",
            resizable: false,
        },  
        $(go.Shape, "Rectangle",
          { 
            name: "SHAPE",
            fill: "white", width: 80, height: 40, stroke: "black", strokeWidth: 1.5
          },
        ), 
        $(go.TextBlock,
          {
            editable: false,
            stretch: go.GraphObject.Horizontal,
            alignment: go.Spot.BottomLeft,
            alignmentFocus: new go.Spot(0,0,0,0),
            textAlign: "center",
            margin: 2,
            overflow: go.TextBlock.OverflowEllipsis,
            maxLines: 5,              
            isMultiline: false,
          },
          new go.Binding("text", "key").makeTwoWay(),   
        ),
  
        $(go.Shape, "Rectangle",
          { 
            name: "AREA_STREAM_INPUT_PORT",
            stretch: go.GraphObject.Vertical,
            fill: null, stroke: null, strokeWidth: 0,
            width: 30,
            opacity: 0.5,
            alignment: go.Spot.Left,
            alignmentFocus: new go.Spot(0,0.5,0,0),              
          }            
        ), 
      );   
      var template_fusionOperator =
        $(go.Group, "Spot", splash_atomicComponentStyle(),
          {
            name: "FUSION",
          },
          $(go.Shape, "Trapezoid",
            { 
              name: "SHAPE" , 
              height: 40, width: 100,
              fill: "white", stroke: "red", strokeWidth: 1.5, angle: 90 
            },
            new go.Binding("stroke", "fusionRule", function(r) {
                return r ? "black" : "red";
            }),
            new go.Binding("height", "WIDTH").makeTwoWay(),  
            new go.Binding("width", "HEIGHT").makeTwoWay(),              
          ),
          $(go.Shape, "Rectangle",
            { 
              name: "AREA_STREAM_INPUT_PORT",
              stretch: go.GraphObject.Vertical,
              fill: null, stroke: null, strokeWidth: 0,
              width: 20,
              opacity: 0.5,
              alignment: go.Spot.Left,
              alignmentFocus: new go.Spot(0,0.5,0,0),
              }            
          ),  

          $(go.Shape, "Rectangle",
            { 
              name: "AREA_STREAM_OUTPUT_PORT",
              stretch: go.GraphObject.Vertical,
              fill: null, stroke: null, strokeWidth: 0,
              width: 20,
              opacity: 0.5,
              alignment: go.Spot.Right,
              alignmentFocus: new go.Spot(1,0.5,0,0),              
            }            
          ),

          $(go.TextBlock,
            {
              editable: true,
              stretch: go.GraphObject.Horizontal,
              alignment: go.Spot.BottomLeft,
              alignmentFocus: new go.Spot(0,0,0,0),
              textAlign: "center",
              margin: 2,
              overflow: go.TextBlock.OverflowEllipsis,
              maxLines: 5,              
              isMultiline: false,
              textValidation: function okName(textblock, oldstr, newstr) {
                                return oldstr === newstr || myDiagram.model.findNodeDataForKey(newstr) === null;
                              }
            },
            new go.Binding("text", "key").makeTwoWay(),
          ),

          $(go.Shape, "Rectangle",
            new go.Binding("height", "actualBounds", function(b) {return b.height*0.6;}).ofObject("SHAPE"),
            { 
              name: "AREA_STREAM_OUTPUT_PORT",
              stretch: go.GraphObject.Vertical,
              fill: null, stroke: null, strokeWidth: 0,
              width: 30,
              opacity: 0.5,
              alignment: go.Spot.Right,
              alignmentFocus: new go.Spot(1,0.5,0,0),              
              }
          ),            
        ); 
        go.Shape.defineFigureGenerator("NoBottomRectangle", function(shape, w, h) {
            // this figure takes one parameter, the size of the corner
            var geo = new go.Geometry();
            // a single figure consisting of straight lines and quarter-circle arcs
            geo.add(new go.PathFigure(0, h*0.87, false)
             .add(new go.PathSegment(go.PathSegment.Line, 0, 0))
             .add(new go.PathSegment(go.PathSegment.Line, w, 0))
             .add(new go.PathSegment(go.PathSegment.Line, w, h*0.87)));
            // geo.add(new go.PathFigure(0, p1)
            //         .add(new go.PathSegment(go.PathSegment.Arc, 180, 90, p1, p1, p1, p1))
            //         .add(new go.PathSegment(go.PathSegment.Line, w - p1, 0))
            //         .add(new go.PathSegment(go.PathSegment.Arc, 270, 90, w - p1, p1, p1, p1))
            //         .add(new go.PathSegment(go.PathSegment.Line, w, h))
            //         .add(new go.PathSegment(go.PathSegment.Line, 0, h).close()));
            // don't intersect with two top corners when used in an "Auto" Panel
            return geo;
        });
        var template_factory =
        $(go.Group, "Spot", splash_factoryStyle(),
          {
            name: "FACTORY",
            memberAdded: function(grp, node) {
            	if(node.name === "FACTORY") {
                    grp.zOrder = node.zOrder-1;
                }
                if(grp.part.data.mode_configuration) {
                    var flag = false;
                    if(node.category !== "modeChangeInputPort" && factory_mode_select_map.get(grp.key) > 0) {
                        flag = true;
                    }
                    myDiagram.nodes.each(function(node2){
                        if(node2.part.data.category === "modeChangeInputPort" && node2.part.data.group === grp.key) {
                            if(flag) {
                                node2.deletable = false;
                            }
                        }
                    })
                }
            },
          },

          $(go.Shape, "RoundedRectangle",
            { 
              name: "SHAPE" ,
              fill: "white", stroke: "black", parameter1: 10, strokeWidth: 3, 
              width: 350, height: 250,
              minSize: new go.Size( 350, 200 ),
            }, 
            new go.Binding("width", "WIDTH").makeTwoWay(),
            new go.Binding("height", "HEIGHT").makeTwoWay(),     

          ),  
          $(go.TextBlock,
            {
              editable: false,
              stretch: go.GraphObject.Horizontal,
              alignment: go.Spot.BottomLeft,
              alignmentFocus: new go.Spot(0,0,0,0),
              textAlign: "center",
              margin: 2,
              overflow: go.TextBlock.OverflowEllipsis,
              maxLines: 5,              
              isMultiline: false,
              textValidation: function okName(textblock, oldstr, newstr) {
                                return oldstr === newstr || myDiagram.model.findNodeDataForKey(newstr) === null;
                              }
            },
            new go.Binding("text", "key").makeTwoWay(), 
          ),
          $(go.Shape, "Rectangle",
            { 
              name: "AREA_STREAM_INPUT_PORT",
              stretch: go.GraphObject.Vertical,
              fill: null, stroke: null, strokeWidth: 0,
              width: 30,
              opacity: 0.5,
              alignment: go.Spot.Left,
              alignmentFocus: new go.Spot(0,0.5,0,0),
              }            
          ),  
          $(go.Shape, "Rectangle",
            { 
              name: "AREA_STREAM_OUTPUT_PORT",
              stretch: go.GraphObject.Vertical,
              fill: null, stroke: null, strokeWidth: 0,
              width: 30,
              opacity: 0.5,
              alignment: go.Spot.Right,
              alignmentFocus: new go.Spot(1,0.5,0,0),              
              }            
          ),
          $(go.Shape, "Rectangle",
            { 
              name: "AREA_MODECHANGE_PORT",
              stretch: go.GraphObject.Horizontal,
              fill: null, stroke: null, strokeWidth: 0,
              height: 30,
              opacity: 0.5,
              alignment: go.Spot.TopLeft,
              alignmentFocus: new go.Spot(0,0,0,0),              
            }  
          ),
          $(go.Panel, "Spot", 
            {
                name: "MODE_A",
                alignment: new go.Spot(0.1, 0.03, 0, 0),
                alignmentFocus: go.Spot.BottomLeft,
                click: function(e, obj) { 
                    factory_mode_select_map.set(obj.part.data.key, 0);
                    selectMode(0, "MODE_A", obj);
                }
            },
            new go.Binding("visible", "", function(o) {
                if(!o.mode_configuration) {
                    return false;
                }
                if(o.mode_configuration.mode_list[0]) 
                    return true;
                return false;
            }),
            new go.Binding("alignment", "HEIGHT", function(data, node) {
                var new_y = Math.max(0.0507 * Math.exp(-0.002* data), 0.0052);
                return new go.Spot(0.1, new_y, 0, 0);
            }),
            $(go.Shape, "NoBottomRectangle",
                { 
                    stroke: "black", strokeWidth: 3, 
                    width: 70, height: 20 
                },
                new go.Binding("width", "WIDTH", function(data, node) {
                    return data * 0.2;
                })
            ),
            $(go.TextBlock, "Mode A",
                { 
                    name: "TEXT",
                    alignment: go.Spot.Center, 
                    width: 67, height: 17, background: 'white', 
                    textAlign: 'center',
                    stroke: "blue",
                    font: 'bold 10pt sans-serif'
                },
                new go.Binding("width", "WIDTH", function(data, node) {
                    return data * 0.2 - 3;
                }),
                new go.Binding("text", "mode_configuration", function(data, node) {
                    return data.mode_list[0].name;
                }),
                new go.Binding("font", "", function(data, node) {
                    var value = factory_mode_select_map.get(data.key);
                    if(value === 0 || value === undefined) {
                        return "bold 10pt sans-serif";
                    }
                    return 'normal 10pt sans-serif';
                })
            )
          ),
          $(go.Panel, "Spot",
            {
                name: "MODE_B",
                alignment: new go.Spot(0.3, 0.03, 0, 0),
                alignmentFocus: go.Spot.BottomLeft,
                click: function(e, obj) { 
                    factory_mode_select_map.set(obj.part.data.key, 1);
                    selectMode(1, "MODE_B", obj);
                }
            },
            new go.Binding("alignment", "HEIGHT", function(data, node) {
                var new_y = Math.max(0.0507 * Math.exp(-0.002* data), 0.0052);
                return new go.Spot(0.3, new_y, 0, 0);
            }),
            new go.Binding("visible", "", function(o) {
                if(!o.mode_configuration) {
                    return false;
                }
                if(o.mode_configuration.mode_list[1]) 
                    return true;
                return false;
            }),
            $(go.Shape, "NoBottomRectangle",
                { 
                    stroke: "black", strokeWidth: 3, 
                    width: 70, height: 20 
                },
                new go.Binding("width", "WIDTH", function(data, node) {
                    return data * 0.2;
                })
            ),
            $(go.TextBlock, "Mode B",
                { 
                    name: "TEXT",
                    alignment: go.Spot.Center, 
                    width: 67, height: 17, background: 'white', 
                    textAlign: 'center'
                },
                new go.Binding("width", "WIDTH", function(data, node) {
                    return data * 0.2 - 3;
                }),
                new go.Binding("text", "mode_configuration", function(data, node) {
                    return data.mode_list[1].name;
                }),
                new go.Binding("stroke", "", function(data, node) {
                    var value = factory_mode_select_map.get(data.key);
                    if(value === 1) {
                        return "blue";
                    }
                    return 'black';
                }),
                new go.Binding("font", "", function(data, node) {
                    var value = factory_mode_select_map.get(data.key);
                    if(value === 1) {
                        return "bold 10pt sans-serif";
                    }
                    return 'normal 10pt sans-serif';
                })
            )
          ),
          $(go.Panel, "Spot", 
            {
                name: "MODE_C",
                alignment: new go.Spot(0.5, 0.03, 0, 0),
                alignmentFocus: go.Spot.BottomLeft,
                click: function(e, obj) { 
                    factory_mode_select_map.set(obj.part.data.key, 2);
                    selectMode(2, "MODE_C", obj);
                }
            },
            new go.Binding("visible", "", function(o) {
                if(!o.mode_configuration) {
                    return false;
                }
                if(o.mode_configuration[2]) 
                    return true;
                return false;
            }),
            new go.Binding("alignment", "HEIGHT", function(data, node) {
                var new_y = Math.max(0.0507 * Math.exp(-0.002* data), 0.0052);
                return new go.Spot(0.5, new_y, 0, 0);
            }),
            $(go.Shape, "NoBottomRectangle",
                { 
                    stroke: "black", strokeWidth: 3, 
                    width: 70, height: 20 
                },
                new go.Binding("width", "WIDTH", function(data, node) {
                    return data * 0.2;
                })
            ),
            $(go.TextBlock, "Mode C",
                { 
                    name: "TEXT",
                    alignment: go.Spot.Center, 
                    width: 67, height: 17, background: 'white', 
                    textAlign: 'center'
                },
                new go.Binding("width", "WIDTH", function(data, node) {
                    return data * 0.2 - 3;
                }),
                new go.Binding("text", "mode_configuration", function(data, node) {
                    return data.mode_list[2].name;
                }),
                new go.Binding("stroke", "", function(data, node) {
                    var value = factory_mode_select_map.get(data.key);
                    if(value === 2) {
                        return "blue";
                    }
                    return 'black';
                }),
                new go.Binding("font", "", function(data, node) {
                    var value = factory_mode_select_map.get(data.key);
                    if(value === 2) {
                        return "bold 10pt sans-serif";
                    }
                    return 'normal 10pt sans-serif';
                })
            )
          ),
          $(go.Panel, "Spot", 
            {
                name: "MODE_D",
                alignment: new go.Spot(0.7, 0.03, 0, 0),
                alignmentFocus: go.Spot.BottomLeft,
                click: function(e, obj) { 
                    factory_mode_select_map.set(obj.part.data.key, 3);
                    selectMode(3, "MODE_D", obj);
                }
            },
            new go.Binding("visible", "", function(o) {
                if(!o.mode_configuration) {
                    return false;
                }
                if(o.mode_configuration[3]) 
                    return true;
                return false;
            }),
            new go.Binding("alignment", "HEIGHT", function(data, node) {
                var new_y = Math.max(0.0507 * Math.exp(-0.002* data), 0.0052);
                return new go.Spot(0.7, new_y, 0, 0);
            }),
            $(go.Shape, "NoBottomRectangle",
                { 
                    stroke: "black", strokeWidth: 3, 
                    width: 70, height: 20 
                },
                new go.Binding("width", "WIDTH", function(data, node) {
                    return data * 0.2;
                })
            ),
            $(go.TextBlock, "Mode D",
                { 
                    name: "TEXT",
                    alignment: go.Spot.Center, 
                    width: 67, height: 17, background: 'white', 
                    textAlign: 'center'
                },
                new go.Binding("width", "WIDTH", function(data, node) {
                    return data * 0.2 - 3;
                }),
                new go.Binding("text", "mode_configuration", function(data, node) {
                    return data.mode_list[3].name;
                }),
                new go.Binding("stroke", "", function(data, node) {
                    var value = factory_mode_select_map.get(data.key);
                    if(value === 3) {
                        return "blue";
                    }
                    return 'black';
                }),
                new go.Binding("font", "", function(data, node) {
                    var value = factory_mode_select_map.get(data.key);
                    if(value === 3) {
                        return "bold 10pt sans-serif";
                    }
                    return 'normal 10pt sans-serif';
                })
            )
          ),
        ); 
      myDiagram.nodeTemplateMap.add("streamPort", template_streamPort);
      myDiagram.nodeTemplateMap.add("eventInputPort", template_eventInputPort);
      myDiagram.nodeTemplateMap.add("eventOutputPort", template_eventOutputPort);
      myDiagram.nodeTemplateMap.add("modeChangeInputPort", template_modeChangeInputPort);
      myDiagram.nodeTemplateMap.add("modeChangeOutputPort", template_modeChangeOutputPort); 
      myDiagram.groupTemplateMap.add("sourceComponent", template_sourceComponent);   
      myDiagram.groupTemplateMap.add("sinkComponent", template_sinkComponent);            
      myDiagram.groupTemplateMap.add("fusionOperator", template_fusionOperator);     
      myDiagram.groupTemplateMap.add("processingComponent", template_processingComponent);
      myDiagram.groupTemplateMap.add("factory", template_factory);
      
      function calcPortLocation(data, node) {
        if(node.isSelected) return go.Point.parse(data);

        var node_loc = go.Point.parse(data); // go.Point form
        var node_x = node_loc.x;
        var node_y = node_loc.y;
        var grp = node.containingGroup; 

        var grp_loc = grp.location;
        var grp_x = grp_loc.x;
        var grp_y = grp_loc.y;
        var grp_width = grp.actualBounds.width;
        var grp_height = grp.actualBounds.height;
        //var grp_height = grp.actualBounds.height;
        //var node_y_rel = (grp_y-node_y)/(grp_height/2);

        if(node.name === "STREAM_OUTPUT_PORT"
          || node.name === "STREAM_INPUT_PORT"
          || node.name === "STREAM_DELEGATION_PORT") {
          if(grp) {
            if(grp_x - node_x > 0) {
              node_x = grp_x - grp_width/2 - 10;
            } else  {
              node_x = grp_x + grp_width/2 - 10;
            } 
          } else {
            // on the background
          }
        } else if(node.name === "EVENT_INPUT_PORT"
                || node.name === "EVENT_OUTPUT_PORT"
                || node.name === "EVENT_DELEGATION_INPUT_PORT"
                || node.name === "EVENT_DELEGATION_OUTPUT_PORT") {
          if(grp) {
              if(node.name === "EVENT_OUTPUT_PORT") {
                  node_y = grp_y - grp_height/2 - 25;
              }
              else {
                  node_y = grp_y - grp_height/2 - 10;
              }
          }
        } else if (node.name === "SOURCE" || node.name === "SINK") {
          if(grp) {
            node_y = grp_y - grp_height/2;
          }
        } else if(node.name === "MODECHANGE_INPUT_PORT"
                || node.name === "MODECHANGE_DELEGATION_INPUT_PORT") {
          if(grp) {
              if(grp.findObject("MODE_A").visible) {
                  node_x = grp_x - grp_width/2 + 10;
                  node_y = grp_y - grp_height/2;
              }
              else {
                  node_x = grp_x - grp_width/2 + 10;
                  node_y = grp_y - grp_height/2 - 10;
              }
          }
        } else if(node.name === "MODECHANGE_OUTPUT_PORT"
                || node.name === "MODECHANGE_DELEGATION_OUTPUT_PORT") {
          if(grp) {
              if(grp.findObject("MODE_A").visible) {
                  node_x = grp_x + grp_width/2 - 30;
                  node_y = grp_y - grp_height/2 + 10;
              }
              else {
                  node_x = grp_x + grp_width/2 - 30;
                  node_y = grp_y - grp_height/2 - 10;
              }
          }
        }else {
          // on the background
        } 
        

        node_loc.x = node_x;
        node_loc.y = node_y;
        //console.log(node_loc.x+" "+node_loc.y);
        return node_loc; // return as go.Point form
      }
      
      
    return myDiagram;
  }
  function makeVisibleRecursive(child, visible) {
    child.visible = visible
    if(child.part.memberParts != undefined) {
        child.part.memberParts.each(function(member) {
            if(visible && child.part.data.category === "factory") {
                if(member.part.data.mode === child.part.data.mode_configuration.mode_list[factory_mode_select_map.get(child.key)].name) {
                    makeVisibleRecursive(member, true);        
                }
                else {
                    makeVisibleRecursive(member, false);
                }
            } 
            else {
                makeVisibleRecursive(member, visible);
            }
        })
    }
}
function selectMode(mode_index, mode, obj) {
    obj.panel.findObject("MODE_A").findObject("TEXT").stroke = "black"
    obj.panel.findObject("MODE_A").findObject("TEXT").font = "normal 10pt sans-serif"
    obj.panel.findObject("MODE_B").findObject("TEXT").stroke = "black"
    obj.panel.findObject("MODE_B").findObject("TEXT")   .font = "normal 10pt sans-serif"
    obj.panel.findObject("MODE_C").findObject("TEXT").stroke = "black"
    obj.panel.findObject("MODE_C").findObject("TEXT").font = "normal 10pt sans-serif"
    obj.panel.findObject("MODE_D").findObject("TEXT").stroke = "black"
    obj.panel.findObject("MODE_D").findObject("TEXT").font = "normal 10pt sans-serif"
    obj.panel.findObject(mode).findObject("TEXT").stroke = "blue"
    obj.panel.findObject(mode).findObject("TEXT").font = "bold 10pt sans-serif"
    obj.part.memberParts.each(function(node) {
        if(node.part.data.category === "modeChangeInputPort") return;
        makeVisibleRecursive(node, node.part.data.mode === myDiagram.model.findNodeDataForKey(node.part.data.group).mode_configuration.mode_list[mode_index].name);
    })
    myDiagram.links.each(function(link) {
        if(!myDiagram.findNodeForKey(link.part.data.to).visible || !myDiagram.findNodeForKey(link.part.data.from).visible) {
            link.visible = false;
        }
        else {
            link.visible = true;
        }
    })
    myDiagram.nodes.each(function(node) {
        if(node.part.data.category === "buildUnit") {
            var flag = false; 
            myDiagram.nodes.each(function(node2) {
                if(node2.part.data.buildUnit === node.part.data.key) {
                    console.log(node2.part.data.key, node2.visible)
                    if(!node2.visible) {
                        flag = true;
                        return false;
                    }
                }  
            })
            node.visible = !flag;
        }
    })
    
}
function handleModelChange(changes) {
    myDiagram.nodes.each(function(node) {
        if(node.part.data.category === "factory") {
            factory_mode_select_map.set(node.part.data.key, 0);
            var MODE_AREA_NAME_ARRAY = ["MODE_A", "MODE_B", "MODE_C", "MODE_D"];
            if(node.part.data.mode_configuration) {
                console.log(node.part.data.mode_configuration)
                for(var i = 0; i < node.part.data.mode_configuration.mode_list.length; i++) {
                    let obj = node.findObject(MODE_AREA_NAME_ARRAY[i])
                    obj.visible = true;
                    selectMode(0, "MODE_A", obj);
                }
                node.memberParts.each(function(node2) {
                    if(node2.part.data.category === "modeChangeInputPort") {
                        return;   
                    }
                    if(node2.part.data.category === "factory") {
                        return
                    }
                    if(node2.part.data.mode !== node.part.data.mode_configuration.initial_mode) {
                        node2.visible = false;
                        node2.part.memberParts.each(function(member) {
                            member.visible = false;    
                            myDiagram.links.each(function(link) {
                                if(link.part.data.to === member.key)
                                    link.visible = false;
                                else if(link.part.data.from === member.key)
                                    link.visible = false;
                            })
                        })
                    }
                    else {
                        node2.visible = true;
                        node2.part.memberParts.each(function(member) {
                            member.visible = true;    
                            myDiagram.links.each(function(link) {
                                if(link.part.data.to === member.key)
                                    link.visible = true;
                                else if(link.part.data.from === member.key)
                                    link.visible = true;
                            })
                        })
                    }
                    
                })
            }
                
        }
    })
}

const Schema = (props) => {
    const [nodeDataArray, setNodeDataArray] = useState(null)
    const [linkDataArray, setLinkDataArray] = useState(null)
    const [isStarted, setIsStarted] = useState(false);

    useEffect(()=>{
        if(props.schemaData) {
            try {
                const data = JSON.parse(props.schemaData)
                setNodeDataArray(data.nodeDataArray)
                setLinkDataArray(data.linkDataArray)
                }
            catch {

            }
            setIsStarted(true);
        }
    },[props])
    if(isStarted) {
        return <div>
            <ReactDiagram
            initDiagram={initDiagram}
            divClassName='diagramComponent'
            nodeDataArray={nodeDataArray}
            linkDataArray={linkDataArray}
            onModelChange={handleModelChange}
            />
        </div>
    }
    return <div/>
}

export default Schema;