import {ReactDiagram} from 'gojs-react';
import * as go from 'gojs';
import '../libs/gojs/GoJS/Figures';
import '../libs/gojs/GoJS/Templates';
import {Inspector} from '../libs/gojs/GoJS/DataInspector';
import '../libs/gojs/GoJS/DataInspector.css'

import React, {useEffect, useState} from 'react';

import '../components/EditProject/style.css'
import {AppBar, Backdrop, Button, CircularProgress, IconButton, makeStyles, Modal, Toolbar} from '@material-ui/core';
import SaveIcon from '@material-ui/icons/Save';
import {useHistory} from "react-router-dom";

import {request} from '../utils/axios';
import ChannelConfigurationModal from '../components/EditProject/ChannelConfigurationModal';
import ModeConfigurationModal from '../components/EditProject/ModeConfigurationModal';
function CustomLayout() {
    go.Layout.call(this);
}
go.Diagram.inherit(CustomLayout, go.Layout);

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
function CustomDraggingTool() {
    go.DraggingTool.call(this);
}
go.Diagram.inherit(CustomDraggingTool, go.DraggingTool);

CustomDraggingTool.prototype.moveParts = function(parts, offset, check) {
    go.DraggingTool.prototype.moveParts.call(this, parts, offset, check);
    var diagram = this.diagram;
    this.diagram.layoutDiagram(true);
};

CustomDraggingTool.prototype.computeEffectiveCollection = function(parts) {
    console.log("computeEffectiveCollection")
    var coll = new go.Set(/*go.Part*/).addAll(parts);
    var tool = this;
    parts.each(function(p) {
        tool.walkSubTree(p, coll);
    })
    return go.DraggingTool.prototype.computeEffectiveCollection.call(this, coll);
};

// Find other attached nodes.
CustomDraggingTool.prototype.walkSubTree = function(sup, coll) {
    console.log("walkSubTree")
    if (sup === null) return;
    coll.add(sup);
    if (sup.category !== "buildUnit") return;
    // recurse through this super state's members
    var model = this.diagram.model;
    var mems = sup.data._members;
    if (mems) {
        for (var i = 0; i < mems.length; i++) {
            var mdata = mems[i];
            this.walkSubTree(this.diagram.findNodeForData(mdata), coll);
        }
    }
};
// end CustomDraggingTool class


let myDiagram, palette, myDiagram_buildUnit_selectionPane, myOverview;
let myChangingSelection = false;
let myChangingModel = false;

let externalDroppedObjectName = "NONE";
let internalSelectedObjectName = "NONE";
let isDragging = false;
var highlighted_factory = null;
var buildUnit_dragging = false;
var configuring_fusionRule = false;
var selected_fusion_operator = null;
var origin_data;
var nodes_selected_in_fusionrule = new go.Set();

const factory_mode_select_map = new Map();
var set_mode;
var set_event;


function makeVisibleRecursive(child, visible) {
    child.visible = visible
    if(child.part.memberParts != undefined) {
        child.part.memberParts.each(function(member) {
            if(visible && child.part.data.category === "factory") {
                if(!factory_mode_select_map.get(child.key)){
                    factory_mode_select_map.set(child.key, 0)
                }
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
var current_factoryKey;

function saveFactory(e, obj) {
    // get the context menu that holds the button that was clicked
    var contextmenu = obj.part;
    // get the node data to which the Node is data bound
    var nodedata = contextmenu.data;
    current_factoryKey = contextmenu.key;

    var copiedModel = new go.GraphLinksModel(e.diagram.model.nodeDataArray, myDiagram.model.linkDataArray);


    var new_nodeDataArray = copiedModel.nodeDataArray.filter(factoryRelatedNode);
    var new_linkDataArray = copiedModel.linkDataArray.filter(factoryRelatedNode);

    var factoryModel = new go.GraphLinksModel(new_nodeDataArray, new_linkDataArray);

    var blob = new Blob([factoryModel.toJson()], {type: "application/json"});
                    
}

function factoryRelatedNode(value) {
    var condition;
    if(value.key === current_factoryKey || value.group === current_factoryKey) {
        console.log(current_factoryKey +"=?"+value.key);
        console.log(current_factoryKey +"=?"+value.group);
        condition = true; 
    } else condition = false;
    
    return condition;
}

function highlightFactory(e, grp, show) { 
    console.log("highlightFactory")
    if (!grp) return;
    e.handled = true;
    if (show) {
        highlighted_factory = grp;
        // cannot depend on the grp.diagram.selection in the case of external drag-and-drops;
        // instead depend on the DraggingTool.draggedParts or .copiedParts
        var tool = grp.diagram.toolManager.draggingTool;
        var map = tool.draggedParts || tool.copiedParts;  // this is a Map
        // now we can check to see if the Group will accept membership of the dragged Parts
        if (grp.canAddMembers(map.toKeySet())) {
            return;
        }
    }
    else {
        if(!buildUnit_dragging) {
            highlighted_factory = null;
        }
    }
    grp.findObject("SHAPE").fill = "white";
    grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = null;
    grp.findObject("AREA_STREAM_INPUT_PORT").fill = null;
//   grp.findObject("AREA_EVENT_PORT").fill = null;
    grp.findObject("AREA_MODECHANGE_PORT").fill = null;

};
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
        if(node.part.data.key == -1) return;
        if(node.part.data.category === "modeChangeInputPort") return;
        if(!node.part.data.group) return;
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
function finishDrop(e, grp) {      
    console.log("finishDrop")
    var list = new go.List();
    if(grp === null) {
        e.diagram.selection.each(function(node) {
            myDiagram.nodes.each(function(part) {
                if(part.data.buildUnit === node.key){
                    list.add(part);
                }   
            })
        })
        e.diagram.commandHandler.addTopLevelParts(list, true);
        return;
    }
    
    var ok = (grp !== null
    ? grp.addMembers(grp.diagram.selection, true)
    : e.diagram.commandHandler.addTopLevelParts(e.diagram.selection, true));
    if (!ok) e.diagram.currentTool.doCancel();        
}
function addDefaultPort(part) {
    console.log("addDefaultPort()");
    var defaultPort;
    if(part.name === "SOURCE") {
        defaultPort = {
            category: "streamPort", 
            group: part.data.key, 
            port_type: "STREAM_OUTPUT_PORT",
            loc: go.Point.stringify(new go.Point(part.location.x+30, part.location.y-part.actualBounds.height/2+10)),
        };
        myDiagram.model.addNodeData(defaultPort);  
    } else if(part.name === "SINK") {
        defaultPort = {
            category: "streamPort", 
            group: part.data.key, 
            port_type: "STREAM_INPUT_PORT",
            loc: go.Point.stringify(new go.Point(part.location.x-50, part.location.y-part.actualBounds.height/2+10)),
        };
        myDiagram.model.addNodeData(defaultPort); 
    } else if(part.name === "FUSION") {
        defaultPort = {
            category: "streamPort", 
            group: part.data.key, 
            port_type: "STREAM_OUTPUT_PORT",
            loc: go.Point.stringify(new go.Point(part.location.x+10, part.location.y-part.actualBounds.height/2+40)),
        };
        myDiagram.model.addNodeData(defaultPort);  
    }
}


  function setDefaultProperty(part) {
    console.log("setDefaultProperty()");
    var new_name = ""
    var name_count = 1;
    part.data.buildUnit = "";
    if(part.name === "PROCESSING") {
        part.data.WIDTH = 100; 
        part.data.HEIGHT = 100;
    } else if (part.name === "SOURCE") {
    } else if (part.name === "FUSION") {
        part.data.HEIGHT = 100;
        part.data.WIDTH = 40;
    } else if (part.name === "FACTORY") {
        part.data.WIDTH = 450;
        part.data.HEIGHT = 250; 
    }
    myDiagram.requestUpdate()
  }
  function findNumOfTheCategory(category) {
    var count = 0;
    myDiagram.nodes.each(node => {
        if(node.part.data.category === category) {
            count = count + 1;
        }
    })
    return count;
}
//
function setKeyUUID(model, data) {
    console.log("NEW setKeyUUID");
    var new_name = ""
    var name_count = 1;
    // var new_key = createKeyUUID();
    if(data.category === "processingComponent") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "processing_component_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    else if(data.category === "sourceComponent") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "source_component_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    else if(data.category === "sinkComponent") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "sink_component_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    else if(data.category === "fusionOperator") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "fusion_operator_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    else if(data.category === "factory") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "factory_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    else if(data.category === "buildUnit") {
        new_name = data.text;
    }
    else if(data.category === "streamPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "stream_port_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    else if(data.category === "eventInputPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "event_input_port_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    else if(data.category === "eventOutputPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "event_output_port_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    else if(data.category === "modeChangeInputPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "modechange_input_port_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    else if(data.category === "modeChangeOutputPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "modechange_output_port_" + name_count;
            name_count = name_count + 1;
        }while(model.findNodeDataForKey(new_name) !== null);
    }
    let uuid = '';
    do {
        uuid = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });    
    }while(checkIfUUIDExists(uuid));
    myDiagram.model.setDataProperty(data, "UUID", uuid);
    return new_name;
}
function checkIfUUIDExists(uuid) {
    var exist_flag = false;
    myDiagram.nodes.each(function(node) {
        if(uuid == node.part.data.uuid) {
            exist_flag = true;
            return;
        }
    })
    return exist_flag;
}
function checkIfNameExists(name) {
    var exist_flag = false;
    myDiagram.nodes.each(function(node) {
        if(name == node.key) {
            exist_flag = true;
            return;
        }
    })
    return exist_flag;
}
function alignToPort(e, obj) {
    var criterion_y = go.Point.parse(obj.part.data.loc).y;

    console.log(obj.part.key);
    console.log(obj.part.data.loc);
    console.log(obj.part.location.x);
    console.log(obj.part.location.y);
    console.log(criterion_y);

    e.diagram.selection.each(function(part) {
      if(part.name === "STREAM_UNTYPED_PORT"
        || part.name === "STREAM_INPUT_PORT"
        || part.name === "STREAM_OUTPUT_PORT"
        || part.name === "STREAM_DELEGATION_PORT") {
        part.location = new go.Point(part.location.x, criterion_y);
        myDiagram.model.setDataProperty(part.data, "loc", part.location);
      }
    });
  }

function activateAllStreamPort(current_diagram) {
    toggleAllStreamPort_sync(current_diagram, true);
}

function deactivateAllStreamPort(current_diagram) {
    toggleAllStreamPort_sync(current_diagram, false);
}
function deactivateAllEventPort(current_diagram) {
    toggleAllEventPort_sync(current_diagram, false);
}        
function toggleAllStreamPort_sync(current_diagram, nextState) {
    current_diagram.nodes.each(function(node) {
      if (node.name === "STREAM_INPUT_PORT" 
          || node.name === "STREAM_OUTPUT_PORT"
          || node.name === "STREAM_DELEGATION_PORT") {
        var shp = node.findObject("STREAM_PORT");
        
        if(node.name === "STREAM_INPUT_PORT") {
          if(nextState === true) {                
            shp.toLinkable = true;
            shp.stroke = "#FF00FF";
            shp.strokeWidth = 2;
          } else {
            shp.toLinkable = false;
            shp.stroke = "black";
            shp.strokeWidth = 1;
          }
        } else if(node.name === "STREAM_OUTPUT_PORT") {
          if(nextState === true) {                
            shp.fromLinkable = true;
            shp.stroke = "#FF00FF";
            shp.strokeWidth = 2;
          } else {             
            shp.fromLinkable = false;
            shp.stroke = "black";
            shp.strokeWidth = 1;
          }
        } else if(node.name === "STREAM_DELEGATION_PORT") {
          if(nextState === true) { 
            shp.toLinkable = true;
            shp.fromLinkable = true;
            shp.stroke = "#FF00FF";
            shp.strokeWidth = 2;
          } else {             
            shp.toLinkable = false;
            shp.fromLinkable = false;
            shp.stroke = "black";
            shp.strokeWidth = 1;
          }              
        } else { }
      }
    });

}
function update_portType(node, portType) {
    node.name = portType;
} 
function toggleAllStreamPort(current_diagram, obj) {
    console.log("toggleAllStreamPort()");
    var cur_shp = obj.findObject("STREAM_PORT"); 

    var nextState;

    if(obj.name === "STREAM_INPUT_PORT") {
      nextState = !cur_shp.toLinkable;
    } else if(obj.name === "STREAM_OUTPUT_PORT") {
      nextState = !cur_shp.fromLinkable;
    } else if(obj.name === "STREAM_DELEGATION_PORT") {
      nextState = !cur_shp.toLinkable;
    } 
    console.log("name?:"+obj.name);
    console.log("nextState?:"+nextState);
    toggleAllStreamPort_sync(current_diagram, nextState);
  }
  
function toggleAllEventPort_sync(current_diagram, nextState) {
    current_diagram.nodes.each(function(node) {
      if (node.name === "EVENT_INPUT_PORT" 
          || node.name === "EVENT_DELEGATION_INPUT_PORT"
          || node.name === "EVENT_OUTPUT_PORT"
          || node.name === "EVENT_DELEGATION_OUTPUT_PORT") {
        var shp = node.findObject("EVENT_PORT");             
          if(node.name === "EVENT_INPUT_PORT") {
            shp.toSpot = go.Spot.Top;
            shp.fromSpot = go.Spot.Top;
            if(nextState === true) {                
              shp.toLinkable = true;
              shp.stroke = "#FF00FF";
              shp.strokeWidth = 2;
            } else {
              shp.toLinkable = false;
              shp.stroke = "black";
              shp.strokeWidth = 1;
            }
          } else if (node.name === "EVENT_DELEGATION_INPUT_PORT") {
            shp.toSpot = go.Spot.Top;
            shp.fromSpot = go.Spot.Bottom;
            if(nextState === true) { 
              shp.toLinkable = true;
              shp.fromLinkable = true;
              shp.stroke = "#FF00FF";
              shp.strokeWidth = 2;
            } else {             
              shp.toLinkable = false;
              shp.fromLinkable = false;
              shp.stroke = "black";
              shp.strokeWidth = 1;
            } 
          } else if(node.name === "EVENT_OUTPUT_PORT") {
            shp.toSpot = go.Spot.Top;
            shp.fromSpot = go.Spot.Top;
            if(nextState === true) {                
              shp.fromLinkable = true;
              shp.stroke = "#FF00FF";
              shp.strokeWidth = 2;
            } else {             
              shp.fromLinkable = false;
              shp.stroke = "black";
              shp.strokeWidth = 1;
            }
          } else if (node.name === "EVENT_DELEGATION_OUTPUT_PORT"){
            shp.toSpot = go.Spot.Bottom;
            shp.fromSpot = go.Spot.Top;
            if(nextState === true) { 
              shp.toLinkable = true;
              shp.fromLinkable = true;
              shp.stroke = "#FF00FF";
              shp.strokeWidth = 2;
            } else {             
              shp.toLinkable = false;
              shp.fromLinkable = false;
              shp.stroke = "black";
              shp.strokeWidth = 1;
            } 
          } else {}

      }
    });
}
function createKeyUUID() {
    return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });       
  }
function getCurrentObjectName() {
    if(externalDroppedObjectName === "NONE") {
      return internalSelectedObjectName;
    } else {
      return externalDroppedObjectName;
    }
}
function isProcessingComponent() {
    var currentObjectName = getCurrentObjectName();
    return (currentObjectName === "PROCESSING" ? true : false);
}

function isSourceComponent() {
    var currentObjectName = getCurrentObjectName();
    return (currentObjectName === "SOURCE" ? true : false);
}

function isSinkComponent() {
    var currentObjectName = getCurrentObjectName();
    return (currentObjectName === "SINK" ? true : false);
}
  
function isStreamInputPort() {
    var currentObjectName = getCurrentObjectName();
    return (currentObjectName === "STREAM_INPUT_PORT" ? true : false);
}

function isStreamOutputPort() {
    var currentObjectName = getCurrentObjectName();
    return (currentObjectName === "STREAM_OUTPUT_PORT" ? true : false);
}
function isEventOutputPort() {
    var currentObjectName = getCurrentObjectName();
    return (currentObjectName === "EVENT_OUTPUT_PORT" ? true : false);
}
function isStreamDelegationPort() {
    var currentObjectName = getCurrentObjectName();
    return (currentObjectName === "STREAM_DELEGATION_PORT" ? true : false);
}
  
function isFusionOperator() {
    var currentObjectName = getCurrentObjectName();
    return (currentObjectName === "FUSION" ? true : false);
}
  
function isFactory() {
    var currentObjectName = getCurrentObjectName();
    return (currentObjectName === "FACTORY" ? true : false);
}

function isStreamPort() {
    var currentObjectName = getCurrentObjectName();
    return(currentObjectName === "STREAM_UNTYPED_PORT" || (isStreamInputPort() || isStreamOutputPort() || isStreamDelegationPort()));
}
function isNotStreamPort() {
    var currentObjectName = getCurrentObjectName();
    return !(currentObjectName === "STREAM_UNTYPED_PORT" || (isStreamInputPort() || isStreamOutputPort() || isStreamDelegationPort()));
}
function isChannel(part) {
    return part instanceof go.Link;
}

function hasDataType(part) {
    return (isStreamPort() || isChannel(part));
}

function hasFreshness(obj) {
    if(obj.part.data.category === "sourceComponent")
        return true;
    return false;
}
  
function hasRate(obj) {
    if(obj.part.data.port_type === "STREAM_OUTPUT_PORT")
        return true;
    return false;
}
function canResize() {
    return (isProcessingComponent() || isFactory() || isFusionOperator());
}

function isComponent() {
  return (isProcessingComponent() || isSourceComponent() || isSinkComponent() || isFusionOperator() || isFactory());
}

function isNotComponent() {
  return !isComponent();
}
function relocatePort(part) {
    console.log("relocatePort()");

    var it_memberParts;
    var memeber_port;
    console.log(part.name)
    if(part.name == "SOURCE") {
        it_memberParts = part.memberParts;
        memeber_port = it_memberParts.first()

        memeber_port.location = new go.Point(part.location.x+30, part.location.y-part.actualBounds.height/2);
        

    } else if(part.name == "SINK") {
        it_memberParts = part.memberParts;
        memeber_port = it_memberParts.first()

        memeber_port.location = new go.Point(part.location.x-50, part.location.y-part.actualBounds.height/2);

    } else if(part.name == "FUSION") {
        it_memberParts = part.memberParts;

        it_memberParts.each(function(node){
            if(node.name === "STREAM_OUTPUT_PORT") memeber_port = node;
        });
        memeber_port.location = new go.Point(part.location.x+30, part.location.y-part.actualBounds.height/2+30);
    }
}

function setBuildUnit_contextMenu(e, obj) {
    var buildUnit_name;
    while(true){
        buildUnit_name = prompt("Build Unit name is","Insert Build Unit Name");  
        if(buildUnit_name === null) return;
        if(!myDiagram.model.findNodeDataForKey(buildUnit_name)) break;
        alert("Already Exists");
    }
    var buildUnit_data = {
                category: "buildUnit",  
                text: buildUnit_name,
            };
    myDiagram.model.addNodeData(buildUnit_data);  
    e.diagram.selection.each(function(part) {
        if(part.name === "PROCESSING"
            || part.name === "FUSION"
            || part.name === "SOURCE"
            || part.name === "SINK") {
            
            // part.data.buildUnit = buildUnit_name;
            // myDiagram_buildUnit.model.setGroupKeyForNodeData(part.data, buildUnit_name);
            if(part.data.buildUnit)
                return true;
            myDiagram_buildUnit_selectionPane.model.setParentKeyForNodeData(part.data, buildUnit_name);
        }
        else if(part.name === "FACTORY") {
            var it = part.memberParts;
            while (it.next()) {
                if(it.value.data.buildUnit)
                    continue;
                if(
                    it.value.data.category === "sourceComponent" ||
                    it.value.data.category === "processingComponent" ||
                    it.value.data.category === "sinkCoponent" ||
                    it.value.data.category === "fusionOperator"
                )
                    myDiagram_buildUnit_selectionPane.model.setParentKeyForNodeData(it.value.data, buildUnit_name);
            }
        }
    });
    var arr = myDiagram.model.nodeDataArray;
    for (var i = 0; i < arr.length; i++) {
        var data = arr[i];
        var buildUnit = data.buildUnit;
        if (buildUnit) {
            var sdata = myDiagram.model.findNodeDataForKey(buildUnit);
            if (sdata) {
                // update _supers to be an Array of references to node data
                if (!data._buildUnit) {
                    data._buildUnit = [sdata];
                } else {
                    data._buildUnit.push(sdata);
                }
                // update _members to be an Array of references to node data
                if (!sdata._members) {
                    sdata._members = [data];
                } else {
                    sdata._members.push(data);
                }
            }
        }
    }
}
function setBuildUnit_contextMenu_in_selectionPane(e, obj) {
    var buildUnit_name;
    while(true){
        buildUnit_name = prompt("Build Unit name is","Insert Build Unit Name");  
        if(!myDiagram.model.findNodeDataForKey(buildUnit_name)) break;
        alert("Already Exists");
    }
    var buildUnit_data = {
                category: "buildUnit",  
                text: buildUnit_name,
            };
    myDiagram.model.addNodeData(buildUnit_data);  
    e.diagram.selection.each(function(part) {
        if(part.data.buildUnit)
                return;
        var data = myDiagram.model.findNodeDataForKey(part.key);
        myDiagram_buildUnit_selectionPane.model.setParentKeyForNodeData(data, buildUnit_name);
    });
    var arr = myDiagram.model.nodeDataArray;
    for (var i = 0; i < arr.length; i++) {
        var data = arr[i];
        var buildUnit = data.buildUnit;
        if (buildUnit) {
            var sdata = myDiagram.model.findNodeDataForKey(buildUnit);
            if (sdata) {
                // update _supers to be an Array of references to node data
                if (!data._buildUnit) {
                    data._buildUnit = [sdata];
                } else {
                    data._buildUnit.push(sdata);
                }
                // update _members to be an Array of references to node data
                if (!sdata._members) {
                    sdata._members = [data];
                } else {
                    sdata._members.push(data);
                }
            }
        }
    }
}
function unsetBuildUnit_contextMenu_in_selectionPane(e, obj) {
    var node = e.diagram.findNodeForKey(obj.part.key);
    e.diagram.remove(node);
}
function updateCurrentObject(part) {
    console.log('updateCurrentObject()');
    relocatePort(part);
}

function loadFusionRule(obj) {
    var select_option_left = document.getElementById("myInfo_fusionOperator_mandatory_ports_leftValues");
    var select_option_right = document.getElementById("myInfo_fusionOperator_mandatory_ports_rightValues");
    var threshold = document.getElementById("selectedInfo_fusionOperator_rule_optionalNum")
    var correlation = document.getElementById("selectedInfo_fusionOperator_rule_correlation")

    myDiagram.nodes.each(function(node) {
        if(node.category === "streamPort" && node.data.port_type === "STREAM_INPUT_PORT") {
            if(node.data.group === obj.part.key) {
                var option = document.createElement("option");
                option.text = node.key;
                option.onclick = function(e) {
                    var name = e.target.innerHTML;
                    var node = myDiagram.findNodeForKey(name);
                    nodes_selected_in_fusionrule.clear();
                    nodes_selected_in_fusionrule.add(node);
                    myDiagram.selectCollection(nodes_selected_in_fusionrule);
                }
                console.log(obj.part.data.fusionRule)
                if(obj.part.data.fusionRule) {
                    if(obj.part.data.fusionRule.mandatory_ports.find(element => element === node.key)){
                        select_option_right.appendChild(option);
                    }
                    else {
                        select_option_left.appendChild(option)   
                    }
                }
                else {
                    select_option_left.appendChild(option)   
                }
            }
        }
    })
    if(obj.part.data.fusionRule) {
        threshold.value = obj.part.data.fusionRule.optional_ports_threshold;
        correlation.value = obj.part.data.fusionRule.correlation;
    }
    else {
        threshold.value = "";
        correlation.value = "";
    }
}
function confirmFusionRule(){
    var optional_ports_selection = document.getElementById("myInfo_fusionOperator_mandatory_ports_leftValues");
    var optional_ports_ = optional_ports_selection.options;
    var optional_ports = []
    for(var i = 0; i < optional_ports_.length; i++) {
        optional_ports[i] = optional_ports_[i].text
    }
    var mandatory_ports_selection = document.getElementById("myInfo_fusionOperator_mandatory_ports_rightValues");
    var mandatory_ports_ = mandatory_ports_selection.options;
    var mandatory_ports = []
    for(var i = 0; i < mandatory_ports_.length; i++) {
        mandatory_ports[i] = mandatory_ports_[i].text
    }
    var threshold = document.getElementById("selectedInfo_fusionOperator_rule_optionalNum").value
    var correlation = document.getElementById("selectedInfo_fusionOperator_rule_correlation").value

    saveFusionRule(selected_fusion_operator, optional_ports, mandatory_ports, threshold, correlation)
}
function saveFusionRule(name, optional_ports, mandatory_ports, threshold, correlation) {
    var new_data = {
        optional_ports: optional_ports,
        mandatory_ports: mandatory_ports,
        optional_ports_threshold: threshold,
        correlation: correlation
    };
    console.log(new_data);
    if(!checkFusionRule(new_data)) 
        return;

    myDiagram.model.setDataProperty(myDiagram.model.findNodeDataForKey(name), "fusionRule", new_data)
    var btn = document.getElementById("myInfo_fusionOperator_btn_confirm");
    btn.removeEventListener("click", confirmFusionRule)
}

function checkFusionRule(data) {
    var text = document.getElementById("myInfo_fusionOperator_text_syntax");
    
    if(data.mandatory_ports.length === 0) {
        text.innerHTML = "No mandatory port"
        text.style.visibility = "visible";
        return false;
    }
    else if(data.optional_ports.length < data.optional_ports_threshold) {
        text.innerHTML = "Threshold too big"
        text.style.visibility = "visible";
        return false;
    }
    else if(data.optional_ports_threshold === "") {
        text.innerHTML = "No threshold"
        text.style.visibility = "visible";
        return false;
    }
    else if(data.correlation === "") {
        text.innerHTML = "No correlation"
        text.style.visibility = "visible";
        return false;
    }
    return true;
}
function isChannelExisting(channel) {
    var flag = false;
    myDiagram.nodes.each(function(node) {
        if(node.name === "STREAM_OUTPUT_PORT" && node.part.data.Channel === channel) {
            flag = true;
            return false;
        }
    })
    return flag;
}

const useStyles = makeStyles((theme) => ({
    root: {
        width: 'calc(100vw - 1px)',
        height: 'calc(100vh - 10px)',
        overflow: 'hidden',
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
    topDiv: {
        width: '100%',
        height: '645px',
        display: 'flex',
        flexDirection: 'row',
    },
    bottomDiv: {
        width: '100%',
        height: 'calc(100% - 60px - 645px)',
        display: 'flex',
        flexDirection: 'row',
    },
    diagram: {
        width: 'calc(100% - 210px)',
        height: '645px',
    },
    palette: {
        width: '210px',
        height: '645px',
    },
    propertyWrapper: {
        width: '20%',
        height: '100%',
        border: 'solid 1px #9e9e9e',
    },
    propertyDiv: {
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'center',
        font: 'bold 12px sans-serif',
        overflowY: 'scroll',
        overflowX: 'hidden',
    },
    overviewWrapper: {
        border: 'solid 1px #9e9e9e',
        width: '50%',
        height: '100%',
    },
    overviewDiv: {
        width: '100%',
        height: '100%',
    },
    title: {
        width: '100%',
        fontSize: '15px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: 'white',
        backgroundColor: '#3f51b5'
    },
    selectionPaneWrapper: {
        border: 'solid 1px #9e9e9e',
        width: '30%',
        height: '100%',
    },
    selectionPaneDiv: {
        width: '100%',
        height: '100%',
    },
    appBar: {
        height: '60px',
    },
    logoWrapper: {
        width: '100%',
        alignSelf: 'center',
        color: '#cecece',
        display: 'flex',
        flexDirection: 'row',
        textDecoration: 'none',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 10,
    },
    logo: {
        height: 35,
        width : 80,
    },
    button: {
        textTransform: 'none',
    }
}));
const EditProject = (props) => {
    const history = useHistory();
    const classes = useStyles();
    const [nodeDataArray, setNodeDataArray] = useState(null);
    const [linkDataArray, setLinkDataArray] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [channelModalOpen, setChannelModalOpen] = useState(false);
    const [modeModalOpen, setModeModalOpen] = useState(false);
    const [fusionModalOpen, setFusionModalOpen] = useState(false);
    const [channelConfigured, setChannelConfigured] = useState(null);
    const [factoryConfigured, setFactoryConfigured] = useState(null);
    const [fusionConfigured, setFusionConfigured] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleOpenChannelModal = () => {
        setChannelModalOpen(true);
    };

    const handleCloseChannelModal = () => {
        setChannelModalOpen(false);
        setChannelConfigured(null);
    };
    const handleConfirmChannelModal = (channel, msg_type, rate) => {
        let prev_channel = ''
        if(channelConfigured.Channel)
            prev_channel = channelConfigured.Channel;
        if(prev_channel != channel && isChannelExisting(channel)) {
            alert('Already Exists');
            return;
        }
        myDiagram.model.setDataProperty(channelConfigured, "Channel", channel);
        myDiagram.model.setDataProperty(channelConfigured, "MessageType", msg_type);
        myDiagram.model.setDataProperty(channelConfigured, "Rate", rate);
        setChannelModalOpen(false);
        setChannelConfigured(null);
    }
    const handleOpenFusionModal = () => {
        setFusionModalOpen(true);
    };

    const handleCloseFusionModal = () => {
        setFusionModalOpen(false);
        setFusionConfigured(null);
    };
    const handleConfirmFusionModal = () => {
    }
    const handleOpenModeModal = () => {
        setModeModalOpen(true);
    };

    const handleCloseModeModal = () => {
        setModeModalOpen(false);
        setFactoryConfigured(null);
    };
    const handleConfirmModeModal = (modeList) => {
        const mode_configuration = JSON.parse(JSON.stringify(factoryConfigured.mode_configuration));
        mode_configuration.mode_list = modeList;
        myDiagram.model.setDataProperty(factoryConfigured, "mode_configuration", mode_configuration)
        setModeModalOpen(false);
        setFactoryConfigured(null);
    }

    useEffect(() => {
        if(!props.location.state) {
            history.push('/projects/')
            return
        }
        if(!props.location.state.is_new) {
            request_load(props.location.state.project_id)
        }
        else {
            setIsReady(true)
        }
    }, [])
    const request_save = async () => {
        let error_flag = false;
        myDiagram.nodes.map((node) => {
            console.log(node.part.data)
            if(node.part.data.category === "streamPort") {
                if(node.part.data.port_type === "STREAM_OUTPUT_PORT") {
                    if(!node.part.data.Channel || !node.part.data.MessageType) {
                        error_flag = true;
                    }    
                }
            }
        })
        if(error_flag) {
            alert("There's a channel without a name or a message type")
            return;
        }
        var result = window.confirm("Are you sure to want to save?");
        try {
            if(result) {
                setLoading(true);
                const project_id = props.location.state.project_id;
                const modelAsText = myDiagram.model.toJson();
                const response = await request('put', '/project/schema/'+project_id+'/', {
                    data: modelAsText
                })
                if(response.status === 201) {
                    history.push('/project/'+ project_id)
                }
            }
        } catch(err) {
            alert('Unknown error')
        } finally {
            setLoading(false)
        }
    }
    const request_cancel = () => {
        var result = window.confirm("Are you sure to want to cancel?");
        if(result) {
            history.goBack();
        }
    }
    const request_load = async (id) => {
        const response = await request('get', '/project/schema/'+id+'/')
        if(response.status === 200) {
            const schemaData = response.data.schema
            const data = JSON.parse(schemaData)
            setNodeDataArray(data.nodeDataArray)
            setLinkDataArray(data.linkDataArray)
        }
        setIsReady(true)
    }
    const handleModelChange = (changes) => {
        setNodeDataArray(myDiagram.nodes)
        setLinkDataArray(myDiagram.links)
        myDiagram.nodes.each(function(node) {
            if(node.part.data.category ==="buildUnit") {
                var flag = false;
                myDiagram.nodes.each(function(node2) {
                    if(node2.part.data.buildUnit === node.part.data.key && !node2.visible) {
                        flag = true;
                        return false;
                    }  
                })
                node.visible = !flag;
                return false;
            }
            if(node.part.data.category === "factory") {
                console.log(node.part.data.key, node.part.data.mode_configuration)
                if(!factory_mode_select_map.get(node.part.data.key))
                    factory_mode_select_map.set(node.part.data.key, 0);
                var MODE_AREA_NAME_ARRAY = ["MODE_A", "MODE_B", "MODE_C", "MODE_D"];
                if(node.part.data.mode_configuration) {
                    for(var i = 0; i < node.part.data.mode_configuration.mode_list.length; i++) {
                        let obj = node.findObject(MODE_AREA_NAME_ARRAY[i])
                        obj.visible = true;
                        const index = factory_mode_select_map.get(node.part.data.key);
                        selectMode(index, MODE_AREA_NAME_ARRAY[index], obj);
                    }
                    node.memberParts.each(function(node2) {
                        if(node2.part.data.category === "modeChangeInputPort") {
                            node2.movable = false;
                            return;   
                        }
                        if(node2.part.data.category === "factory") {
                            return
                        }  
                        if(node2.part.data.mode !== node.part.data.mode_configuration.mode_list[factory_mode_select_map.get(node.part.data.key)].name) {
                            node2.visible = false;
                            if(!node2.part.memberParts) return;
                            node2.part.memberParts.each(function(member) {
                                member.visible = false;    
                                myDiagram.links.each(function(link) {
                                    if(link.part.data.to === member.key) {
                                        link.visible = false;
                                    }
                                    else if(link.part.data.from === member.key) {
                                        link.visible = false;
                                    }
                                })
                            })
                        }
                        else {
                            node2.visible = true;
                            if(!node2.part.memberParts) return;
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
    const initDiagram = () => {
    
        const $ = go.GraphObject.make;
        myDiagram =
            $(go.Diagram, 
            {
                initialDocumentSpot: go.Spot.TopCenter,
                initialViewportSpot: go.Spot.TopCenter,
                draggingTool: $(CustomDraggingTool),
                layout: $(CustomLayout), 
                "draggingTool.isGridSnapEnabled": true,
                "undoManager.isEnabled": true,
                "animationManager.isEnabled": false,
                "ChangedSelection": function(e) {
                    if (myChangingSelection) return;
                    myChangingSelection = true;
                    var diagnodes = new go.Set();
                    myDiagram.selection.each(function(n) {
                        diagnodes.add(myDiagram_buildUnit_selectionPane.findNodeForData(n.data));
                    });
                    myDiagram_buildUnit_selectionPane.clearSelection();
                    myDiagram_buildUnit_selectionPane.selectCollection(diagnodes);
                    myChangingSelection = false;
                },  // defined below, to enable/disable commands
                mouseDragOver: function(e) { 
                    console.log("mouseDragOver");
                    isDragging = true;
                },
                mouseDrop: function(e) { 
                    console.log("mouseDrop");
                    finishDrop(e, null);
                    isDragging = false;
                },
                
                
                ExternalObjectsDropped: function(e) {
                
                    console.log("ExternalObjectsDropped()");
                    
                    e.subject.each( function(part) 
                        {
                            externalDroppedObjectName = part.name;
                            internalSelectedObjectName = "NONE";
                            setDefaultProperty(part);
                            addDefaultPort(part);
                            inspector.inspectObject();
                            inspector2.inspectObject();
                            updateCurrentObject(part);
                            if(part.name === "FACTORY") {
                                factory_mode_select_map.set(part.key, 0);
                            }
                             palette.clearSelection();
                            //console.log("BuildUnit is null string? "+ (part.data.BuildUnit === null) ? "true" : "false");
                        });
                },
                "ViewportBoundsChanged": function(e) {
                //let allowScroll = !e.diagram.viewportBounds.containsRect(e.diagram.documentBounds);
                // myDiagram_buildUnit_selectionPane.allowVerticalScroll = allowScroll;
                    console.log("ViewportBoundsChanged");
                },
                SelectionCopied: function(e) {
                    console.log("SelectionCopied()");
                    //e.subject.part.key = createKeyUUID();
    
                    e.subject.each( function(part) 
                    {
                        part.key = createKeyUUID();
                        console.log("key:"+part.key);
                    });
    
                    inspector.inspectObject();
                    inspector2.inspectObject();
                    },
                SelectionDeleted: function(e) {
                    console.log("SelectionDeleted()");
                    e.subject.each( function(part) 
                    {
                        if(part.category === "modeChangeInputPort" && part.data.group) {
                            factory_mode_select_map.set(part.data.group, 0);
                            myDiagram.nodes.each(function(node) {
                                if(node.key === part.data.group) {
                                    myDiagram.model.setDataProperty(myDiagram.model.findNodeDataForKey(node.key), "mode_configuration", "")
                                }
                                else if(node.part.data.group === part.data.group) {
                                    myDiagram.model.setDataProperty(myDiagram.model.findNodeDataForKey(node.key), "mode", "")
                                    node.part.memberParts.each(function(member) {
                                        member.visible = true;    
                                    })
                                    node.visible = true;
                                }
                            })
                        }
                        else {
                            var flag = false;
                            myDiagram.nodes.each(function(node) {
                                if(node.part.data.mode === part.data.mode) {
                                    flag = true;
                                    return false;
                                }
                            })
                            myDiagram.nodes.each(function(node) {
                                if(node.part.data.category === "modeChangeInputPort" && node.part.data.group === part.data.group) {
                                    node.deletable = !flag;
                                    return false;
                                }
                            })
                        }
                    });
                },
                ClipboardPasted: function(e) {
                    console.log("ClipboardPasted()");
                    //e.subject.part.key = createKeyUUID();
    
                    e.subject.each( function(part) 
                    {
                        setDefaultProperty(part);
                        addDefaultPort(part);
                        inspector.inspectObject();
                        inspector2.inspectObject();
                        updateCurrentObject(part);
                    });
    
                },
                
                ObjectSingleClicked: function(e) {
                    console.log("ObjectSingleClicked()");
                    var selected = e.subject.part;
                    externalDroppedObjectName = "NONE";
                    internalSelectedObjectName = selected.name;
                    //setDefaultProperty(selected);
    
                    updateCurrentObject(selected);
                    //relocatePort(selected);              
    
                    inspector.inspectObject();
                    inspector2.inspectObject();
                },
    
                ObjectContextClicked: function(e) {
                    console.log("ObjectContextClicked()");
                    var selected = e.subject.part;
                    externalDroppedObjectName = "NONE";
                    internalSelectedObjectName = selected.name;
                    //setDefaultProperty(selected);
                    updateCurrentObject(selected);
                    //relocatePort(selected);
                    inspector.inspectObject();
                    inspector2.inspectObject();   
                },
                ObjectDoubleClicked: function(e) {
                    console.log("ObjectDoubleClicked()");
                },
                ChangingSelection: function(e) {
    
                    //inheritBuildUnit(e);
                    console.log("ChangingSelection()");
                    // e.diagram.selection.each(function(part){
                    //     updateCurrentObject(part);              
                    // });
     
                },
                AnimationStarting: function(e) {
                    console.log("AnimationStarting()");
                },
                SelectionMoved: function(e) {
                    console.log("SelectionMoved()");
                    // myDiagram_buildUnit.layout.invalidateLayout();
                    myDiagram.nodes.each(function(node) {
                        if(node.data.category === "buildUnit") {
                            node.zOrder = 2;
                        }
                    })
                },
                PartResized: function(e) {
                    console.log("PartResized()");
                },
    
    
                LinkDrawn: function(e) {
                    console.log("LinkDrawn()");
        
                    deactivateAllStreamPort(e.diagram);
                    deactivateAllEventPort(e.diagram);
    
                    //var selected = e.subject.part;
                    //selected.data.segArray = selected.flattenedLengths.toString();
    
                    inspector.inspectObject();
                    inspector2.inspectObject();
                    // myDiagram.selection.each(function(n) {
                    //     diagnodes.add(myDiagram_buildUnit_selectionPane.findNodeForData(n.data));
                    // });
                    // myDiagram_buildUnit_selectionPane.clearSelection();
                    // myDiagram_buildUnit_selectionPane.selectCollection(diagnodes);
                    myChangingSelection = false;
                },
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
          contextMenu:     // define a context menu for each node
            $("ContextMenu",  // that has one button
              $("ContextMenuButton",
                $(go.TextBlock, {margin: 5, width: 150}, "Configure Channel"),
                { 
                  click: configureChannel
                },
                new go.Binding("visible", "", 
                    function(o) {
                        return o.port_type === "STREAM_OUTPUT_PORT";
                    }
                )
              ),
            )
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
            textValidation: function okName(textblock, oldstr, newstr) {
                                return oldstr === newstr || !isChannelExisting(newstr);
                            }
            },
            new go.Binding("text", "Channel").makeTwoWay(),
        ),
        new go.Binding("name", "port_type").makeTwoWay(),
        { doubleClick: function(e, obj) {
            e.diagram.startTransaction("Toggle Input");
            toggleAllStreamPort(e.diagram, obj);
            e.diagram.commitTransaction("Toggle Input");
            }
        }
        ); 
        function configureChannel(e, obj) {
            setChannelConfigured(obj.part.data);
            handleOpenChannelModal();
        }
        function configureMode(e, obj) {
            setFactoryConfigured(obj.part.data);
            handleOpenModeModal();
        }
        function setEventName(e, obj) {
            var event = obj.part.data.Event ? obj.part.data.Event : "";
            while(true){
                event = prompt("Event name is", obj.part.data.Event ? obj.part.data.Event : "Insert Event Name");  
                if(!isEventExisting(event)) break;
                alert("Already Exists");
            }
            if(event)
                myDiagram.model.setDataProperty(obj.part.data, "Event", event);
        }
        function isEventExisting(event) {
            var flag = false;
            myDiagram.nodes.each(function(node) {
                if(node.part.data.category === "eventOutputPort" && node.part.data.Event === event) {
                    flag = true;
                    return false;
                }
            })
            if(flag) {
                return true;
            }
            return false
        }
        function splash_componentStyle() {
            return [
                new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
                new go.Binding("isShadowed", "isSelected").ofObject(),
                {
                    movable: true,
                    selectionAdorned: false,
                    shadowOffset: new go.Point(0, 0),
                    shadowBlur: 15,
                    shadowColor: "blue",
                    resizable: true,
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
                  computesBoundsAfterDrag: false,
                  // when the selection is dropped into a Group, add the selected Parts into that Group;
                  // if it fails, cancel the tool, rolling back any changes
                  mouseDrop: finishDrop_component,
                  handlesDragDropForMembers: true,  // don't need to define handlers on member Nodes and Links.
                  selectionChanged: function(p) {
                    p.zOrder = (p.isSelected ? 6 : 5);
                  },
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
                  
                  computesBoundsAfterDrag: false,
                  mouseDrop: finishDrop_component,
                  handlesDragDropForMembers: true,  // don't need to define handlers on member Nodes and Links.
                }
            ]
          }
          function finishDrop_component(e, grp) {
                console.log("finishDrop_component");

                var collection = new go.List();
                grp.diagram.selection.each(function(part) {
                if(part.category === "buildUnit") {
                    myDiagram.nodes.each(function(part2) {
                        if(part2.data.buildUnit === part.key)
                            collection.add(part2);
                    })
                }
                else {
                    collection.add(part);
                }
                })
    
            var ok = (grp !== null
                ?  
                    grp.addMembers(collection, true) 
                :   
                    e.diagram.commandHandler.addTopLevelParts(collection, true));
            if (!ok) e.diagram.currentTool.doCancel();
            }
        function finishDrop_component_buldUnit(e, grp) {
            console.log("finishDrop_component_buildUnit");
            var ok = (highlighted_factory !== null
                ?  
                    highlighted_factory.addMembers(myDiagram.selection, true) 
                : 
                    e.diagram.commandHandler.addTopLevelParts(myDiagram.selection, true));
            highlighted_factory = null;
            buildUnit_dragging = false;
            if (!ok) e.diagram.currentTool.doCancel();
        }
        function unset_buildUnit(e, obj) {
            var node = e.diagram.findNodeForKey(obj.part.key);
            e.diagram.remove(node);
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
            new go.Binding("name", "port_type").makeTwoWay(),
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
            new go.Binding("name", "port_type").makeTwoWay(),
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
              zOrder : 10,
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
            new go.Binding("name", "port_type").makeTwoWay(),
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
            new go.Binding("name", "port_type").makeTwoWay(),
          );      
          function highlightProcessingComponent(e, grp, show) { 
            if (!grp) return;
            e.handled = true;
            if (show) {
              // cannot depend on the grp.diagram.selection in the case of external drag-and-drops;
              // instead depend on the DraggingTool.draggedParts or .copiedParts
              var tool = grp.diagram.toolManager.draggingTool;
              var map = tool.draggedParts || tool.copiedParts;  // this is a Map
              // now we can check to see if the Group will accept membership of the dragged Parts
              if (grp.canAddMembers(map.toKeySet())) {    
                return;
              }
            }
            grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = null;
            grp.findObject("AREA_STREAM_INPUT_PORT").fill = null;
            grp.findObject("AREA_EVENT_PORT").fill = null;
            grp.findObject("AREA_MODECHANGE_PORT").fill = null;
          };
          
          var isIncoming_toProcessingComponent = false;
          var posX_atProcessingComponent;
          var posY_atProcessingComponent;
          var portType_atProcessingComponent;
          var template_processingComponent =
            $(go.Group, "Spot", splash_atomicComponentStyle(),
              {
                name: "PROCESSING",   
                contextMenu:     // define a context menu for each node
                    $("ContextMenu",  // that has one button
                      $("ContextMenuButton",
                        $(go.TextBlock, {margin: 5, width: 150}, "Set Build Unit"),
                        { 
                          click: setBuildUnit_contextMenu,
                        },
                        new go.Binding("visible", "", 
                            function(o) {
                                var data = myDiagram.model.findNodeDataForKey(o.key);
                                return data.buildUnit === "" || data.buildUnit === undefined
                            }
                        )
                      )
                    ),
                // dragComputation: stayInGroup,
                mouseDragEnter: function(e, grp, prev) {        
                  isIncoming_toProcessingComponent = true;              
                  highlightProcessingComponent(e, grp, true);               
                },
                mouseDragLeave: function(e, grp, next) { 
                  highlightProcessingComponent(e, grp, false); 
                  isIncoming_toProcessingComponent = false;             
                },                          
    
                memberValidation: function(grp, node) {
                  console.log("memberValidation()");
                  var selectedName = node.name;
                  var grp_loc = new go.Point(0, 0);
                  var node_loc = new go.Point(0, 0);
                  
                  var grp_height = grp.actualBounds.height;
                  var grp_width = grp.actualBounds.width;              
                  
                  if (grp !== null && grp.location.isReal()) {
                    grp_loc = grp.location;
                    node_loc = node.location;
                  }
    
                  if(selectedName === "STREAM_UNTYPED_PORT" 
                      || selectedName === "STREAM_INPUT_PORT" 
                      || selectedName === "STREAM_OUTPUT_PORT"
                      || selectedName === "STREAM_DELEGATION_PORT") {
                    if(isIncoming_toProcessingComponent) {            
                         
                      if(grp_loc.x - node_loc.x > 0) {
                        grp.findObject("AREA_STREAM_INPUT_PORT").fill = "green";
                        posX_atProcessingComponent = grp_loc.x - grp_width/2-10;
                        portType_atProcessingComponent = "STREAM_INPUT_PORT";
                      }
                      else {
                        grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = "blue";
                        posX_atProcessingComponent = grp_loc.x + grp_width/2 - 10;
                        portType_atProcessingComponent = "STREAM_OUTPUT_PORT";
                      }
                      
                      return true; 
                    } else {
                      update_portType(node, portType_atProcessingComponent);
                      node.position = new go.Point(posX_atProcessingComponent, node_loc.y);
                      //addLog("add a new stream port!");
                      return true;
                    }
                  } 
                  else if(selectedName === "MODECHANGE_OUTPUT_PORT"
                            || selectedName === "MODECHANGE_DELEGATION_OUTPUT_PORT") {
                    if(isIncoming_toProcessingComponent) {
                      grp.findObject("AREA_MODECHANGE_PORT").fill = "yellow";
                      posY_atProcessingComponent = grp_loc.y - grp_height/2-10;
                      return true; 
                    }
                    else {
                      node.position = new go.Point(node_loc.x, posY_atProcessingComponent);
                      //addLog("add new event port!");
                      return true;
                    }
                  }
                  else if(selectedName === "EVENT_INPUT_PORT" 
                            || selectedName === "EVENT_OUTPUT_PORT"
                            || selectedName === "EVENT_DELEGATION_INPUT_PORT"
                            || selectedName === "EVENT_DELEGATION_OUTPUT_PORT") {
                    if(isIncoming_toProcessingComponent) {
                      grp.findObject("AREA_EVENT_PORT").fill = "yellow";
                      if(selectedName === "EVENT_OUTPUT_PORT") {
                        posY_atProcessingComponent = grp_loc.y - grp_height/2-25;
                      }
                      else {
                        posY_atProcessingComponent = grp_loc.y - grp_height/2-10;
                      }
                      return true; 
                    } else {
                      node.position = new go.Point(node_loc.x, posY_atProcessingComponent);
                      if(selectedName === "EVENT_DELEGATION_INPUT_PORT") update_portType(node, "EVENT_INPUT_PORT");
                      if(selectedName === "EVENT_DELEGATION_OUTPUT_PORT") update_portType(node, "EVENT_OUTPUT_PORT");
                      //addLog("add new event port!");
                      return true;
                    }
                  } 
                  else { 
                    return false; 
                  }
                },
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
            function highlightSourceComponent(e, grp, show) { 
                if (!grp) return;
                e.handled = true;
                if (show) {
                  // cannot depend on the grp.diagram.selection in the case of external drag-and-drops;
                  // instead depend on the DraggingTool.draggedParts or .copiedParts
                  var tool = grp.diagram.toolManager.draggingTool;
                  var map = tool.draggedParts || tool.copiedParts;  // this is a Map
                  // now we can check to see if the Group will accept membership of the dragged Parts
                  if (grp.canAddMembers(map.toKeySet())) {    
                    return;
                  }
                }
                grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = null;
              };
            
            var isIncoming_toSourceComponent = false;
            var posX_atSourceComponent;
            var posY_atSourceComponent;
            var template_sourceComponent = 
              $(go.Group, "Spot", splash_atomicComponentStyle(),
                { 
                  name: "SOURCE",
                  resizable: false,
                
                  mouseDragEnter: function(e, grp, prev) {                                    
                    isIncoming_toSourceComponent = true;              
                    highlightSourceComponent(e, grp, true);                 
                  },
                  mouseDragLeave: function(e, grp, next) { 
                    highlightSourceComponent(e, grp, false); 
                    isIncoming_toSourceComponent = false;     
                  },                          
    
                  memberAdded: function(grp, node) {
                    grp.data.haveOutputPort = true;
                  },
                  memberRemoved: function(grp, node) {
                    grp.data.haveOutputPort = false;
                  },             
                  
                  
                  memberValidation: function(grp, node) {
                    console.log("memberValidation()");
                    
                    var selectedName = node.name;
                    
                    var grp_loc = new go.Point(0, 0);
                    var node_loc = new go.Point(0, 0);
                    
                    var grp_height = grp.actualBounds.height;
                    var grp_width = grp.actualBounds.width;          
                    
                    if (grp !== null && grp.location.isReal()) {
                       grp_loc = grp.location;
                       node_loc = node.location;
                    }
    
                    if(grp.data.haveOutputPort) return false;
    
                    if(selectedName === "STREAM_UNTYPED_PORT" 
                        || selectedName === "STREAM_INPUT_PORT" 
                        || selectedName === "STREAM_OUTPUT_PORT"
                        || selectedName === "STREAM_DELEGATION_PORT") {
                      if(isIncoming_toSourceComponent) {
                        grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = "blue";
                        posX_atSourceComponent = grp_loc.x + grp_width/2 - 10;
                        posY_atSourceComponent = grp_loc.y - grp_height/2;                    
                        return true; 
                      } else {
                        update_portType(node, "STREAM_OUTPUT_PORT");
                        node.position = new go.Point(posX_atSourceComponent, posY_atSourceComponent);
                        return true;
                      }
                    } else { 
                    return false; 
                  }
                },
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
            function highlightSinkComponent(e, grp, show) { 
                if (!grp) return;
                e.handled = true;
                if (show) {
                  // cannot depend on the grp.diagram.selection in the case of external drag-and-drops;
                  // instead depend on the DraggingTool.draggedParts or .copiedParts
                  var tool = grp.diagram.toolManager.draggingTool;
                  var map = tool.draggedParts || tool.copiedParts;  // this is a Map
                  // now we can check to see if the Group will accept membership of the dragged Parts
                  if (grp.canAddMembers(map.toKeySet())) {    
                    return;
                  }
                }
                grp.findObject("AREA_STREAM_INPUT_PORT").fill = null;
              };
            
            var isIncoming_toSinkComponent = false;
            var posX_atSinkComponent;
            var posY_atSinkComponent;
            var template_sinkComponent = 
              $(go.Group, "Spot", splash_atomicComponentStyle(),
                { 
                  name: "SINK",
                  resizable: false,
                
                  mouseDragEnter: function(e, grp, prev) {      
                    console.log("mouseDragEnter()");
                                  
                    isIncoming_toSinkComponent = true;              
                    highlightSinkComponent(e, grp, true); 
                    
                  },
                  mouseDragLeave: function(e, grp, next) { 
                    console.log("mouseDragLeave()");
                    highlightSinkComponent(e, grp, false); 
                    isIncoming_toSinkComponent = false;     
                    console.log("mouseDragLeave() end");
                  },                          
    
                  memberAdded: function(grp, node) {
                    var selectedName = node.name;
                    grp.data.haveInputPort = true;
                  },
                  memberRemoved: function(grp, node) {
                    grp.data.haveInputPort = false;
                  },             
                  
                  
                  memberValidation: function(grp, node) {
                    console.log("memberValidation()");
    
                    
                    var selectedName = node.name;
                    
                    var grp_loc = new go.Point(0, 0);
                    var node_loc = new go.Point(0, 0);
                    
                    var grp_height = grp.actualBounds.height;
                    var grp_width = grp.actualBounds.width;              
                    
                    if (grp !== null && grp.location.isReal()) {
                      grp_loc = grp.location;
                      node_loc = node.location;
                    }
    
                    if(grp.data.haveInputPort) return false;
    
                    if(selectedName === "STREAM_UNTYPED_PORT" 
                        || selectedName === "STREAM_INPUT_PORT" 
                        || selectedName === "STREAM_OUTPUT_PORT"
                        || selectedName === "STREAM_DELEGATION_PORT") {
                      if(isIncoming_toSinkComponent) {
                        grp.findObject("AREA_STREAM_INPUT_PORT").fill = "green";
                        posX_atSinkComponent = grp_loc.x - grp_width/2 - 10;
                        posY_atSinkComponent = grp_loc.y - grp_height/2;           
                        return true; 
                      } else {
                        update_portType(node, "STREAM_INPUT_PORT");
                        node.position = new go.Point(posX_atSinkComponent, posY_atSinkComponent);
                        //addLog("add new stream port!");
    
                        return true;
                      }
                    } else { 
                    return false; 
                  }
                },
              },
                
              $(go.Shape, "Rectangle",
                { 
                  name: "SHAPE",
                  fill: "white", width: 80, height: 40, stroke: "black", strokeWidth: 1.5
                },
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
            function UpdatePropertyWindow_fusionOperator(node) {
                if(node.name == "FUSION") document.getElementById("selected_fusionOperator").value = node.key;
                else if(node.name == "STREAM_INPUT_PORT") document.getElementById("selected_inputPort_fusionOperator").value = node.key;
                //infoFusionOperator();
              }
      
              function highlightFusionOperator(e, grp, show) { 
                if (!grp) return;
                e.handled = true;
                if (show) {
                  // cannot depend on the grp.diagram.selection in the case of external drag-and-drops;
                  // instead depend on the DraggingTool.draggedParts or .copiedParts
                  var tool = grp.diagram.toolManager.draggingTool;
                  var map = tool.draggedParts || tool.copiedParts;  // this is a Map
                  // now we can check to see if the Group will accept membership of the dragged Parts
                  if (grp.canAddMembers(map.toKeySet())) {    
                    return;
                  }
                }
                grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = null;
                grp.findObject("AREA_STREAM_INPUT_PORT").fill = null;
              };
      
             
              var isIncoming_toFusionOperator = false;
              var posX_atFusionOperator;
              var posY_atFusionOperator;
              var portType_atFusionOperator;
            var template_fusionOperator =
            $(go.Group, "Spot", splash_atomicComponentStyle(),
              {
                name: "FUSION",
                contextMenu:     // define a context menu for each node
                    $("ContextMenu",  // that has one button
                      $("ContextMenuButton",
                        $(go.TextBlock, {margin: 5, width: 150}, "Set Build Unit"),
                        { 
                          click: setBuildUnit_contextMenu,
                        },
                        new go.Binding("visible", "", 
                            function(o) {
                                var data = myDiagram.model.findNodeDataForKey(o.key);
                                return data.buildUnit === "" || data.buildUnit === undefined
                            }
                        )
                      ),
                      $("ContextMenuButton",
                        $(go.TextBlock, {margin: 5, width: 150}, "Configure Fusion Rule"),
                        { 
                        //   click: configureFusionRule_contextMenu,
                        },
                      ),
                    ),
                mouseDragEnter: function(e, grp, prev) {      
                  //console.log("mouseDragEnter()");
                  isIncoming_toFusionOperator = true;              
                  highlightFusionOperator(e, grp, true); 
                },
                mouseDragLeave: function(e, grp, next) { 
                  //console.log("mouseDragLeave()");
                  highlightFusionOperator(e, grp, false); 
                  isIncoming_toFusionOperator = false;              
                },                          
                
                memberAdded: function(grp, node) {
                  var selectedName = node.name;
                  if(node.name === "STREAM_OUTPUT_PORT") grp.data.haveOutputPort = true;
                },
                memberRemoved: function(grp, node) {
                  // TODO: modify, node has an after-removed property
                  if(node.name === "STREAM_OUTPUT_PORT") grp.data.haveOutputPort = false;
                }, 
                
                
                memberValidation: function(grp, node) {
                  console.log("memberValidation()");
                  var selectedName = node.name;
                  var grp_loc = new go.Point(0, 0);
                  var node_loc = new go.Point(0, 0);
                  var grp_height = grp.actualBounds.height;
                  var grp_width = grp.actualBounds.width;              
                  
                  if (grp !== null && grp.location.isReal()) {
                    grp_loc = grp.location;
                    node_loc = node.location;
                  }
                 
                  if(selectedName === "STREAM_UNTYPED_PORT" 
                    || selectedName === "STREAM_INPUT_PORT" 
                    || selectedName === "STREAM_OUTPUT_PORT"
                    || selectedName === "STREAM_DELEGATION_PORT") {
                    if(isIncoming_toFusionOperator) {            
                         
                      if(grp_loc.x - node_loc.x > 0) {
                        grp.findObject("AREA_STREAM_INPUT_PORT").fill = "green";
                        posX_atFusionOperator = grp_loc.x - grp_width/2 - 10;
                        portType_atFusionOperator = "STREAM_INPUT_PORT";
                      }
                      else {
                        if(grp.data.haveOutputPort) return false;
                        
                        grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = "blue";
                        posX_atFusionOperator = grp_loc.x + grp_width/2 - 10;
                        posY_atFusionOperator = grp.actualBounds.y + grp.findObject("SHAPE").width/2 - 10;  
                        portType_atFusionOperator = "STREAM_OUTPUT_PORT";
                        
                      }
                      
                      return true; 
                    } else {
                      update_portType(node, portType_atFusionOperator);
                      console.log(grp_loc);
                      console.log(grp_height + ", " + grp_width);
                      console.log(node_loc);
                      
                      if(node.name === "STREAM_OUTPUT_PORT") {                    
                        node.position = new go.Point(posX_atFusionOperator, posY_atFusionOperator);
                      } else {
                        node.position = new go.Point(posX_atFusionOperator, node_loc.y);
                      }
                      return true;
                    }
                  } else { return false; }
                },
    
    
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
            var isIncoming_toFactory = false;
            var posX_atFactory;
            var posY_atFactory;
            var portType_atFactory;
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
                mouseDragEnter: function(e, grp, prev) {      
                  console.log("mouseDragEnter()");
                  isIncoming_toFactory = true;              
                  highlightFactory(e, grp, true); 
                },
                mouseDragLeave: function(e, grp, next) { 
                  console.log("mouseDragLeave()");
                  highlightFactory(e, grp, false); 
                  highlighted_factory = null;
                  isIncoming_toFactory = false;              
                  myDiagram.commandHandler.addTopLevelParts(myDiagram.selection, true);
                },                          
                memberAdded: function(grp, node) {
                    console.log("memberAdded", node.part.data.key);
                    if(node.name === "FACTORY") {
                        grp.zOrder = node.zOrder-1;
                    }
                    if(node.category === "modeChangeInputPort" && isDragging) {
                        grp.findObject("MODE_A").visible = true;
                        var data = {"initial_mode": "Mode A", "mode_list":[{"name": "Mode A", "events": [{"name": "event_1", "next_mode": "Mode A", "output_internal_data_items": false}]}]}
                        myDiagram.model.setDataProperty(myDiagram.model.findNodeDataForKey(grp.key), "mode_configuration", data)
                        myDiagram.nodes.each(function(node2) {
                            if(node2.part.data.group === grp.key) {
                                if(grp.part.data.mode_configuration.mode_list[factory_mode_select_map.get(grp.key)])
                                    myDiagram.model.setDataProperty(myDiagram.model.findNodeDataForKey(node2.key), "mode", grp.part.data.mode_configuration.mode_list[factory_mode_select_map.get(grp.key)].name)
                            }
                        })
                        return;
                    }
                    else if(isDragging && grp.part.data.mode_configuration){
                        myDiagram.model.setDataProperty(node.part.data, "mode", grp.part.data.mode_configuration.mode_list[factory_mode_select_map.get(grp.key)].name)
                    }
                    if(grp.part.data.mode_configuration) {
                        var flag = false;
                        if(node.category !== "modeChangeInputPort" && factory_mode_select_map.get(grp.key) > 0) {
                            flag = true;
                        }
                        myDiagram.nodes.each(function(node2){
                            if(node2.part.data && node2.part.data.category === "modeChangeInputPort" && node2.part.data.group === grp.key) {
                                if(flag) {
                                    node2.deletable = false;
                                }
                            }
                        })
                        // if(grp.part.data.mode_configuration.mode_list[factory_mode_select_map.get(grp.key)])
                            // myDiagram.model.setDataProperty(myDiagram.model.findNodeDataForKey(node.key), "mode", grp.part.data.mode_configuration.mode_list[factory_mode_select_map.get(grp.key)].name)
                    }
                },
    
                memberValidation: function(grp, node) {
                  console.log("memberValidation()");
                  var selectedName = node.name;
                  var grp_loc = new go.Point(0, 0);
                  var node_loc = new go.Point(0, 0);
                  var grp_height = grp.actualBounds.height;
                  var grp_width = grp.actualBounds.width;              
                  
                  if (grp !== null && grp.location.isReal()) {
                    grp_loc = grp.location;
                    node_loc = node.location;
                  }
                  if(selectedName === "STREAM_UNTYPED_PORT" 
                  || selectedName === "STREAM_INPUT_PORT" 
                  || selectedName === "STREAM_OUTPUT_PORT"
                  || selectedName === "STREAM_DELEGATION_PORT") {
                    // if(isIncoming_toFactory) {   
                         
                    //   if(grp_loc.x - node_loc.x > 0) {
                    //     grp.findObject("AREA_STREAM_INPUT_PORT").fill = "green";
                    //     posX_atFactory = grp_loc.x - grp_width/2 - 10;
                    //     portType_atFactory = "STREAM_DELEGATION_PORT";
                    //     return true;
                    //   }
                    //   else {
                    //     grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = "blue";
                    //     posX_atFactory = grp_loc.x + grp_width/2 - 10;
                    //     portType_atFactory = "STREAM_DELEGATION_PORT";
                    //   }                  
                    //   return true; 
                    // } else {
                    //   update_portType(node, portType_atFactory);
                    //   node.position = new go.Point(posX_atFactory, node_loc.y);
                    //   return true;
                    // }
                  } else if(selectedName === "EVENT_INPUT_PORT" 
                            || selectedName === "EVENT_OUTPUT_PORT"
                            || selectedName === "EVENT_DELEGATION_INPUT_PORT"
                            || selectedName === "EVENT_DELEGATION_OUTPUT_PORT") {
                    // if(isIncoming_toFactory) {
                    //     grp.findObject("AREA_EVENT_PORT").fill = "yellow";
                    //     posY_atFactory = grp_loc.y - grp_height/2-10;
                    //   return true; 
                    // } else {
                    //   node.position = new go.Point(node_loc.x, posY_atFactory);
                    //   if(selectedName === "EVENT_INPUT_PORT") update_portType(node, "EVENT_DELEGATION_INPUT_PORT");
                    //   if(selectedName === "EVENT_OUTPUT_PORT") update_portType(node, "EVENT_DELEGATION_OUTPUT_PORT");
                    //   //addLog("add new event port!");
                    //   return true;
                    // }
                  } else if(selectedName === "MODECHANGE_OUTPUT_PORT"
                            || selectedName === "MODECHANGE_DELEGATION_OUTPUT_PORT")
                  {
    
                  }else if(selectedName === "MODECHANGE_INPUT_PORT" 
                            // || selectedName === "MODECHANGE_OUTPUT_PORT"
                            || selectedName === "MODECHANGE_DELEGATION_INPUT_PORT") {
                            // || selectedName === "MODECHANGE_DELEGATION_OUTPUT_PORT") {
                    if(isIncoming_toFactory) {
                        grp.findObject("AREA_MODECHANGE_PORT").fill = "yellow";
                        var flag = false;
                        myDiagram.nodes.each(function(part) {
                            if(part.data.category === node.data.category
                                && part.data.group === grp.key) flag = true;
                            return;
                        })
                        if(flag) {
                            return false;
                        }    
                        posX_atFactory = grp_loc.x - grp_width/2 + 10;
                        posY_atFactory = grp_loc.y - grp_height/2;
                        myDiagram.nodes.each(function(part) {
                            if(part.data.group === grp.key && part.data.category === "modeChangeOutputPort") {
                                part.position = new go.Point(part.location.x, posY_atFactory)
                            }
                        })
                        // if(selectedName === "MODECHANGE_OUTPUT_PORT") {
                        //     if(grp.findObject("MODE_A").visible) {
                        //         posX_atFactory = grp_loc.x + grp_width/2 - 30;
                        //         posY_atFactory = grp_loc.y - grp_height/2 + 10;
                        //     }
                        //     else {
                        //         posX_atFactory = grp_loc.x + grp_width/2 - 30;
                        //         posY_atFactory = grp_loc.y - grp_height/2 - 10;
                        //     }
                        // } 
                        return true; 
                    } else {
                        node.position = new go.Point(posX_atFactory, posY_atFactory);
                        // if(selectedName === "MODECHANGE_INPUT_PORT") update_portType(node, "MODECHANGE_DELEGATION_INPUT_PORT");
                        // if(selectedName === "MODECHANGE_OUTPUT_PORT") update_portType(node, "MODECHANGE_DELEGATION_OUTPUT_PORT");
                        //addLog("add new event port!");
                        return true;
                    }
                  } 
                  else {
                    if(isIncoming_toFactory) grp.findObject("SHAPE").fill = "#FBB5B5";
                    return true; 
                  }
                  return false;
                },
    
                contextMenu:     // define a context menu for each node
                  $("ContextMenu",  
                    $("ContextMenuButton",
                      $(go.TextBlock, {margin: 5, width: 150}, "Save factory as json"),
                      { click: saveFactory }),
                    $("ContextMenuButton",
                      $(go.TextBlock, {margin: 5, width: 150}, "Set Build Unit"),
                        { 
                          click: setBuildUnit_contextMenu 
                        },
                        new go.Binding("visible", "", 
                            function(o) {
                                var list = []
                                myDiagram.nodes.each(function(node) {
                                    if (node.data.group === o.key) {
                                        list.push(node);
                                    }
                                });
                                var flag = false;
                                list.forEach(function(node) {
                                    if(
                                        node.data.category === "sourceComponent" ||
                                        node.data.category === "processingComponent" ||
                                        node.data.category === "sinkCoponent" ||
                                        node.data.category === "fusionOperator"
                                    ) {
                                        if(node.data.buildUnit === "" || node.data.buildUnit === undefined) flag = true;
                                    }
                                    
                                })
                                return flag;
                            }
                        )
                    ),
                    $("ContextMenuButton",
                      $(go.TextBlock, {margin: 5, width: 150}, "Configure Mode"),
                      {
                          click: configureMode
                      },
                      new go.Binding("visible", "", 
                            function(o) {
                                var flag = false;
                                myDiagram.nodes.each(function(node) {
                                    if(node.category === "modeChangeInputPort") {
                                        console.log(node.data.group)
                                        if(node.data.group === o.key) {
                                            flag = true;
                                            return;
                                        }
                                    }
                                })
                                return flag;
                            }
                        )
                    )
                    // more ContextMenuButtons would go here
                )  // end Adornment
              },
              $(go.Shape, "RoundedRectangle",
                { 
                  name: "SHAPE" ,
                  fill: "white", stroke: "black", parameter1: 10, strokeWidth: 3, 
                  width: 450, height: 250,
                  minSize: new go.Size( 450, 200 ),
                }, 
                new go.Binding("width", "WIDTH").makeTwoWay(),
                new go.Binding("height", "HEIGHT").makeTwoWay(),     
    
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
    
              /*
              $(go.TextBlock,
                {
                  stretch: go.GraphObject.Horizontal,
                  alignment: go.Spot.BottomLeft,
                  alignmentFocus: new go.Spot(0,0,0,0),
                  textAlign: "center",
                  margin: 2,
                  overflow: go.TextBlock.OverflowEllipsis,
                  maxLines: 1,
                  
                },
                new go.Binding("text", "MODE").makeTwoWay(),
              ),
              */
              
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
            //   $(go.Shape, "Rectangle",
            //     { 
            //       name: "AREA_EVENT_PORT",
            //       stretch: go.GraphObject.Horizontal,
            //       fill: null, stroke: null, strokeWidth: 0,
            //       height: 30,
            //       opacity: 0.5,
            //       alignment: go.Spot.BottomLeft,
            //       alignmentFocus: new go.Spot(0,0,0,0),              
            //     }  
                
            //   ),
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
                        width: 90, height: 20 
                    },
                    new go.Binding("width", "WIDTH", function(data, node) {
                        return data * 0.2;
                    })
                ),
                $(go.TextBlock, "Mode A",
                    { 
                        name: "TEXT",
                        alignment: go.Spot.Center, 
                        width: 87, height: 17, 
                        background: 'white', 
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
                    new go.Binding("stroke", "", function(data, node) {
                        var value = factory_mode_select_map.get(data.key);
                        if(value === 0 || value === undefined) {
                            return "blue";
                        }
                        return 'black';
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
                        selectMode(1, "MODE_B", obj)
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
                        width: 90, height: 20 
                    },
                    new go.Binding("width", "WIDTH", function(data, node) {
                        return data * 0.2;
                    })
                ),
                $(go.TextBlock, "Mode B",
                    { 
                        name: "TEXT",
                        alignment: go.Spot.Center, 
                        width: 87, height: 17, background: 'white', 
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
                        selectMode(2, "MODE_C", obj)
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
                        width: 90, height: 20 
                    },
                    new go.Binding("width", "WIDTH", function(data, node) {
                        return data * 0.2;
                    })
                ),
                $(go.TextBlock, "Mode C",
                    { 
                        name: "TEXT",
                        alignment: go.Spot.Center, 
                        width: 87, height: 17, background: 'white', 
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
                        selectMode(3, "MODE_D", obj)
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
                        width: 90, height: 20 
                    },
                    new go.Binding("width", "WIDTH", function(data, node) {
                        return data * 0.2;
                    })
                ),
                $(go.TextBlock, "Mode D",
                    { 
                        name: "TEXT",
                        alignment: go.Spot.Center, 
                        width: 87, height: 17, background: 'white', 
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
          myDiagram.nodeTemplateMap.add("buildUnit",
            $(go.Node, "Auto",
              { 
                    layerName: "Background",
                    mouseDrop: finishDrop_component_buldUnit,
                    mouseDragEnter: function(e, obj) {
                        console.log("mouseDragEnter");
                        obj.zOrder = -1;
                        buildUnit_dragging = true;
                    },
                    mouseDragLeave: function(e, obj) {
                        console.log("mouseDragLeave");
                    },
                    locationObjectName: "BODY", 
                    zOrder: 2, 
                    contextMenu:     // define a context menu for each node
                        $("ContextMenu",  // that has one button
                        $("ContextMenuButton",
                            $(go.TextBlock, {margin: 5, width: 150}, "Unset BuildUnit"),
                            { 
                            click: unset_buildUnit
                            })
                        ) 
              },
              $(go.Shape, "RoundedRectangle",
              
                {
                  fill: "rgba(255, 255, 255, 0.0)", strokeWidth: 1.5, parameter1: 20, strokeDashArray: [4, 2], 
                  spot1: go.Spot.TopLeft, spot2: go.Spot.BottomRight, minSize: new go.Size(30, 30)
                }),
              $(go.Panel, "Vertical",
                { margin: 10 },
                $(go.TextBlock,
                  { font: "bold 10pt sans-serif", margin: new go.Margin(0, 0, 5, 0) },
                  new go.Binding("text", "key").makeTwoWay()),
                $(go.Shape,
                  { name: "BODY", opacity: 0 })
              )
            ));
          myDiagram.model.makeUniqueKeyFunction = setKeyUUID;
          myDiagram.model.copyNodeDataFunction = function(data, model) {
                var shallowCopiedObject = JSON.parse(JSON.stringify(data))
                shallowCopiedObject.key = setKeyUUID(model, shallowCopiedObject);
                return shallowCopiedObject;
          };
        
          function calcPortLocation(data, node) {
            console.log('calcPortLocation')
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
                      node_y = grp_y - grp_height/2 + 5;
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
          
        const inspector = new Inspector('splashInspectorDiv', myDiagram,
        {
    
        // uncomment this line to only inspect the named properties below instead of all properties on each object:
        includesOwnProperties: false,
        multipleSelection: true,
        propertyModified: function(prop, new_value, inspector) {
            var node = inspector.inspectedObject; 
            console.log('propertyModefied')
        },
        properties: {
            
            // "DataType": {readOnly: isChannel, show: hasDataType},
            "key": { readOnly: true },
            "Channel": {show: isStreamOutputPort, type: "string", readOnly: true },
            "MessageType": {show: isStreamOutputPort, type: "string", readOnly: true },
            "Event": {show: isEventOutputPort, type: "string", readOnly: true},
            "Freshness": {show: hasFreshness, type: "number"},
            "Rate": {show: hasRate, type: "number", readOnly: true},
            "UUID": {show: false} 
        }
        });
    
    
        const inspector2 = new Inspector('splashInspectorDiv2', myDiagram,
        {
            // uncomment this line to only inspect the named properties below instead of all properties on each object:
            includesOwnProperties: false,
            propertyModified: function(prop, new_value, inspector) {
            var node = inspector.inspectedObject; 
    
            var shape = node.findObject("SHAPE");
            //shape.fill = node.data.color;
            },
            properties: {
            "category": {readOnly: true},            
            "port_type": {readOnly: true,  show: isStreamPort },
            "group": { readOnly: true, show: Inspector.showIfNode },
            "isGroup": { show: false },
    
            "loc": {},
            "WIDTH": { show: false },
            "HEIGHT": { show: false } ,
    
            "to": { readOnly: true, show: Inspector.showIfPresent},
            "from": { readOnly: true, show: Inspector.showIfPresent},
            "segArray" : { show: Inspector.showIfLink },
            }
        });    
        palette = $(go.Palette, "palette", 
            {
                "ChangedSelection": function(e) {
                    myDiagram.clearSelection();
                }
            });
            var paletteTemplate_streamPort = 
            $(go.Node, "Spot",
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: true,
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip,
              },
              { name: "PALETTE_STREAM_PORT", locationSpot: go.Spot.Center },
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5)
                }),              
              $(go.Shape, "Rectangle",
                { fill: "white", width:20, height:20, alignment: new go.Spot(0.25, 0.5) }),
              $(go.Shape, "TriangleRight", 
                { fill: "black", width: 10, height: 10, alignment: new go.Spot(0.25, 0.5) }),
              $(go.TextBlock, "Stream Port", 
                { 
                  name: "TEXT_NAME",
                  textAlign: "center",
                  alignment: new go.Spot(0.7, 0.5) 
                }),            
            );                        
        var sharedToolTip =
            $("ToolTip",
              { "Border.figure": "RoundedRectangle" },
              $(go.TextBlock, { margin: 2 },
                new go.Binding("text", "", function(d) { return d.category; })));
    
        myDiagram_buildUnit_selectionPane = $(go.Diagram, "selectionPane",
        {
            "undoManager.isEnabled": true,            
            initialContentAlignment: go.Spot.Top,
            allowSelect: true,
            allowMove: false,
            allowCopy: false,
            allowDelete: false,
            allowHorizontalScroll: false, 
            scrollsPageOnFocus: true,
            contentAlignment: go.Spot.TopLeft,
            "panningTool.isEnabled": false,
            layout:
                $(go.TreeLayout,
                {
                    alignment: go.TreeLayout.AlignmentStart,
                    angle: 0,
                    compaction: go.TreeLayout.CompactionNone,
                    layerSpacing: 16,
                    layerSpacingParentOverlap: 1,
                    nodeIndent: 2,
                    nodeIndentPastParent: 0.88,
                    nodeSpacing: 0,
                    setsPortSpot: false,
                    setsChildPortSpot: false
                }),
            "ViewportBoundsChanged": function(e) {
                console.log("ViewportBoundsChanged")
                //let allowScroll = !e.diagram.viewportBounds.containsRect(e.diagram.documentBounds);
                // myDiagram_buildUnit_selectionPane.allowVerticalScroll = allowScroll;
    
            },
            "ChangedSelection": function(e) {
                if (myChangingSelection) return;
                myChangingSelection = true;
                var diagnodes = new go.Set();
                myDiagram_buildUnit_selectionPane.selection.each(function(n) {
                    diagnodes.add(myDiagram.findNodeForData(n.data));
                });
                myDiagram.clearSelection();
                myDiagram.selectCollection(diagnodes);
                myChangingSelection = false;
            }
            });
        myDiagram_buildUnit_selectionPane.model.makeUniqueKeyFunction = setKeyUUID;
        
        //myDiagram_buildUnit.isEnabled = false;
        //myDiagram_buildUnit.model = myDiagram.model;
        myDiagram_buildUnit_selectionPane.nodeTemplate =
        $(go.Node,
            // no Adornment: instead change panel background color by binding to Node.isSelected
            { 
            selectionAdorned: false, 
            contextMenu:     // define a context menu for each node
                $("ContextMenu",  // that has one button
                    $("ContextMenuButton",
                    $(go.TextBlock, {margin: 5, width: 150}, "Set Build Unit"),
                    { 
                        click: setBuildUnit_contextMenu_in_selectionPane,
                    },
                    new go.Binding("visible", "", 
                        function(o) {
                            var data = myDiagram.model.findNodeDataForKey(o.key);
                            return data.category !== "buildUnit" && ( data.buildUnit === "" || data.buildUnit === undefined)
                        }
                    )
                    ),
                    $("ContextMenuButton",
                    $(go.TextBlock, {margin: 5, width: 150}, "Unset Build Unit"),
                    { 
                        click: unsetBuildUnit_contextMenu_in_selectionPane,
                    },
                    new go.Binding("visible", "", 
                        function(o) {
                            var data = myDiagram.model.findNodeDataForKey(o.key);
                            return data.category === "buildUnit"
                        }
                    )
                    )
                ),
            },
            $("TreeExpanderButton",
            {
                width: 14,
                "ButtonBorder.fill": "whitesmoke",
                "ButtonBorder.stroke": null,
                "_buttonFillOver": "rgba(0,128,255,0.25)",
                "_buttonStrokeOver": null
            }),
            $(go.Panel, "Horizontal",
            { position: new go.Point(16, 0) },
            new go.Binding("background", "isSelected", function (s) { return (s ? "lightblue" : "#E6E6E6"); }).ofObject(),
            $(go.TextBlock,
                new go.Binding("text", "key"))
            )  // end Horizontal Panel
        );  // end Node
    myDiagram_buildUnit_selectionPane.linkTemplate = $(go.Link);
    myDiagram_buildUnit_selectionPane.model = $(go.TreeModel, { nodeParentKeyProperty: "buildUnit" });
    myDiagram_buildUnit_selectionPane.model.undoManager = myDiagram.model.undoManager
    
    myDiagram.addModelChangedListener(function(e) {
        // if (e.isTransactionFinished) enableAll();
        if (e.model.skipsUndoManager) return;
        if (myChangingModel) return;
        myChangingModel = true;
        // don't need to start/commit a transaction because the UndoManager is shared with myDiagram_buildUnit_selectionPane
        if (e.modelChange === "nodeGroupKey" || e.modelChange === "nodeParentKey") {
            // handle structural change: group memberships
            var treenode = myDiagram_buildUnit_selectionPane.findNodeForData(e.object);
            if (treenode !== null) treenode.updateRelationshipsFromData();
        } 
        else if (e.change === go.ChangedEvent.Property) {
            var treenode = myDiagram_buildUnit_selectionPane.findNodeForData(e.object);
            if (treenode !== null) treenode.updateTargetBindings();
        } 
        else if (e.change === go.ChangedEvent.Insert && e.propertyName === "nodeDataArray") {
            // pretend the new data isn't already in the nodeDataArray for myDiagram_buildUnit_selectionPane
            myDiagram_buildUnit_selectionPane.model.nodeDataArray.splice(e.newParam, 1);
            // now add to the myDiagram_buildUnit_selectionPane model using the normal mechanisms
            if(e.newValue.category === 'buildUnit'||
                e.newValue.category === 'processingComponent' || 
                e.newValue.category === 'sourceComponent' || 
                e.newValue.category === 'sinkComponent' || 
                e.newValue.category === 'fusionOperator'
            ) {
                myDiagram_buildUnit_selectionPane.model.addNodeData(e.newValue);
            }
        } 
        else if (e.change === go.ChangedEvent.Remove && e.propertyName === "nodeDataArray") {
            // remove the corresponding node from myDiagram_buildUnit_selectionPane
            var treenode = myDiagram_buildUnit_selectionPane.findNodeForData(e.oldValue);
            if (treenode !== null) myDiagram_buildUnit_selectionPane.remove(treenode);
        }
        myChangingModel = false;
        myDiagram_buildUnit_selectionPane.requestUpdate();
    });
    myDiagram_buildUnit_selectionPane.addModelChangedListener(function(e) {
        if (e.model.skipsUndoManager) return;
        if (myChangingModel) return;
        myChangingModel = true;
        // don't need to start/commit a transaction because the UndoManager is shared with myDiagram
        if (e.modelChange === "nodeGroupKey" || e.modelChange === "nodeParentKey") {
            // handle structural change: tree parent/children
            var node = myDiagram.findNodeForData(e.object);
            if (node !== null) node.updateRelationshipsFromData();
        } else if (e.change === go.ChangedEvent.Property) {
            // propagate simple data property changes back to the main Diagram
            var node = myDiagram.findNodeForData(e.object);
            if (node !== null) node.updateTargetBindings();
        } else if (e.change === go.ChangedEvent.Insert && e.propertyName === "nodeDataArray") {
            // pretend the new data isn't already in the nodeDataArray for the main Diagram model
            myDiagram.model.nodeDataArray.splice(e.newParam, 1);
            // now add to the myDiagram model using the normal mechanisms
            myDiagram.model.addNodeData(e.newValue);
        } else if (e.change === go.ChangedEvent.Remove && e.propertyName === "nodeDataArray") {
            // remove the corresponding node from the main Diagram
            var node = myDiagram.findNodeForData(e.oldValue);
            if (node !== null) myDiagram.remove(node);
        }
        myChangingModel = false;
        });
        var paletteTemplate_eventInputPort = 
            $(go.Node, "Spot",
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: true,
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip
              },
              { name: "PALETTE_EVENT_INPUT_PORT", locationSpot: go.Spot.Center  },
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5)
                }),              
              $(go.Shape, "Rectangle",
                { fill: "white", width:20, height:20, alignment: new go.Spot(0.25, 0.5) }),
              $(go.Shape, "ISOProcess", 
                { fill: "black", width: 16, height: 13, stroke: "white", angle:90, alignment: new go.Spot(0.25, 0.5) }),
              $(go.TextBlock, "Event\nInputPort", 
                { 
                  name: "TEXT_NAME",
                  textAlign: "center",
                  alignment: new go.Spot(0.7, 0.5) }),            
            );     
    
      var paletteTemplate_eventOutputPort = 
            $(go.Node, "Spot",
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: true,
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip
              },
              { name: "PALETTE_EVENT_OUTPUT_PORT", locationSpot: go.Spot.Center },
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5)
                }),              
              $(go.Shape, "Rectangle",
                { fill: "white", width:20, height:20, alignment: new go.Spot(0.25, 0.5) }),
              $(go.Shape, "ISOProcess", 
                { fill: "black", width: 16, height: 13, angle: 270, stroke: "white", alignment: new go.Spot(0.25, 0.5) }),
              $(go.TextBlock, "Event\nOutputPort", 
                { 
                  name: "TEXT_NAME",
                  textAlign: "center",                    
                  alignment: new go.Spot(0.7, 0.5) }),            
            );  
            
        var paletteTemplate_modeChangeInputPort = 
            $(go.Node, "Spot",
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip,
              },
              { name: "PALETTE_MODE_CHANGE_INPUT_PORT", locationSpot: go.Spot.Center },
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5),
                }),              
              $(go.Shape, "Rectangle",
                { fill: "white", width:20, height:20, alignment: new go.Spot(0.25, 0.5) }),
              $(go.Shape, "Circle", 
                { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.25, 0.5-0.091+0.023+0.138) }),
              $(go.Shape, "Circle", 
                { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.25-0.024, 0.5+0.046+0.023-0.138) }),
              $(go.Shape, "Circle", 
                { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.25+0.024, 0.5+0.046+0.023-0.138) }),
              $(go.TextBlock, "ModeChange\nInputPort", 
                { 
                  name: "TEXT_NAME",
                  textAlign: "center",                    
                  //isStrikethrough: true, // disabled palette
                  alignment: new go.Spot(0.7, 0.5) }),            
            );                   
    
        var paletteTemplate_modeChangeOutputPort = 
            $(go.Node, "Spot",
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: true,
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip,
              },
              { name: "PALETTE_MODE_CHANGE_OUTPUT_PORT", locationSpot: go.Spot.Center },
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5),
                }),              
              $(go.Shape, "Rectangle",
                { fill: "white", width:20, height:20, alignment: new go.Spot(0.25, 0.5) }),
              $(go.Shape, "Circle", 
                { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.25, 0.5-0.091+0.023) }),
              $(go.Shape, "Circle", 
                { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.25-0.024, 0.5+0.046+0.023) }),
              $(go.Shape, "Circle", 
                { fill: "black", width: 4, height: 4, stroke: null, alignment: new go.Spot(0.25+0.024, 0.5+0.046+0.023) }),
              $(go.TextBlock, "ModeChange\nOutputPort", 
                { 
                  name: "TEXT_NAME",
                  textAlign: "center",
                  //isStrikethrough: true, // disabled palette
                  alignment: new go.Spot(0.7, 0.5) }),            
            ); 
    
        var paletteTemplate_processingComponent =
            $(go.Group, "Spot",
              { name: "PALETTE_PROCESSING_COMPONENT", locationSpot: go.Spot.Center },
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: true,
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip
              },                
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5)
                }),              
              $(go.Shape, "Rectangle",
                { fill: "white", width:40, height:40, alignment: new go.Spot(0.25, 0.5) }),
              $(go.TextBlock, "Processing\nComponent", 
                { textAlign: "center",
                  alignment: new go.Spot(0.7, 0.5) }),              
            );         
    
        var paletteTemplate_sourceComponent = 
            $(go.Node, "Spot",
              { name: "PALETTE_SOURCE_COMPONENT", locationSpot: go.Spot.Center },
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: true,
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip
              },                
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5)
                }),       
              $(go.Shape, "Rectangle",
                { fill: "white", width:64, height:32, alignment: new go.Spot(0.25, 0.5) }),                  
              $(go.Shape, "Rectangle",
                { fill: "white", width:16, height:16, alignment: new go.Spot(0.428, 0.5) }),
              $(go.Shape, "TriangleRight", 
                { fill: "black", width:8, height:8, alignment: new go.Spot(0.428, 0.5) }),
              $(go.TextBlock, "Source\nComponent", 
                { textAlign: "center",
                  alignment: new go.Spot(0.7, 0.5) }),      
            );         
      
        var paletteTemplate_sinkComponent =
            $(go.Node, "Spot",
              { name: "SINK_COMPONENT", locationSpot: go.Spot.Center },
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: true,
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip
              },                
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5)
                }),       
              $(go.Shape, "Rectangle",
                { fill: "white", width:64, height:32, alignment: new go.Spot(0.284, 0.5) }),                  
              $(go.Shape, "Rectangle",
                { fill: "white", width:16, height:16, alignment: new go.Spot(0.106, 0.5) }),
              $(go.Shape, "TriangleRight", 
                { fill: "black", width: 8, height: 8, alignment: new go.Spot(0.106, 0.5) }),
              $(go.TextBlock, "Sink\nComponent", 
                { textAlign: "center",
                  alignment: new go.Spot(0.7, 0.5) }),            
            ); 
      
        var paletteTemplate_fusionOperator =
            $(go.Group, "Spot",
              { name: "PALETTE_FUSION_COMPONENT", locationSpot: go.Spot.Center },
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: true,
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip
              },                
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5)
                }),              
              $(go.Shape, "Trapezoid",
                { fill: "white", width:40, height:25, angle: 90, alignment: new go.Spot(0.25, 0.5) }),
              $(go.TextBlock, "Fusion\nComponent", 
                { textAlign: "center",
                  alignment: new go.Spot(0.7, 0.5) }),              
            );
      
        var paletteTemplate_factory =
            $(go.Group, "Spot",
              { name: "PALETTE_FACTORY", locationSpot: go.Spot.Center },
              new go.Binding("isShadowed", "isSelected").ofObject(),
              {
                selectionAdorned: false,
                shadowOffset: new go.Point(0, 0),
                shadowBlur: 15,
                shadowColor: "blue",
                resizable: true,
                resizeObjectName: "SHAPE",
                toolTip: sharedToolTip
              },
              $(go.Shape, "RoundedRectangle",
                { fill: $(go.Brush, "Linear", { 0.0: "white", 1.0: "gray" }),
                  width: 180, height: 55, stroke: "black", strokeWidth: 1,
                  parameter1: 5,
                  alignment: new go.Spot(0.5, 0.5)
                }),              
              $(go.Shape, "RoundedRectangle",
                { fill: "white", width:80, height:40, parameter1: 10, alignment: new go.Spot(0.3, 0.5) }),
              $(go.TextBlock, "Factory", 
                { textAlign: "center",
                  alignment: new go.Spot(0.7, 0.5) }),              
            );  
    
        // share the template map with the Palette
        palette.nodeTemplateMap.add("streamPort", paletteTemplate_streamPort);  
        palette.nodeTemplateMap.add("eventInputPort", paletteTemplate_eventInputPort);  
        palette.nodeTemplateMap.add("eventOutputPort", paletteTemplate_eventOutputPort);  
        palette.nodeTemplateMap.add("modeChangeInputPort", paletteTemplate_modeChangeInputPort); 
        palette.nodeTemplateMap.add("modeChangeOutputPort", paletteTemplate_modeChangeOutputPort); 
        palette.groupTemplateMap.add("processingComponent", paletteTemplate_processingComponent);  
        palette.groupTemplateMap.add("sourceComponent", paletteTemplate_sourceComponent);   
        palette.groupTemplateMap.add("sinkComponent", paletteTemplate_sinkComponent);   
        palette.groupTemplateMap.add("fusionOperator", paletteTemplate_fusionOperator); 
        palette.groupTemplateMap.add("factory", paletteTemplate_factory);
    
        palette.layout = $(go.GridLayout, { alignment: go.GridLayout.Location, spacing: new go.Size(5,8)});
    
        palette.model.makeUniqueKeyFunction = setKeyUUID;
        palette.maxSelectionCount = 1;
    
        palette.model.nodeDataArray = [
            { category: "streamPort" },
            { category: "eventInputPort" },
            { category: "eventOutputPort" },
            { category: "modeChangeInputPort" },
            { category: "modeChangeOutputPort" },
            { category: "processingComponent", "isGroup": true },  
            { category: "sourceComponent", "isGroup": true},
            { category: "sinkComponent", "isGroup": true },
            { category: "fusionOperator", "isGroup": true },
            { category: "factory", "isGroup": true },
        ];
        // the Overview
        myOverview =
          $(go.Overview, "overviewDiv",
            { observed: myDiagram, maxScale: 0.1 });
            // change color of viewport border in Overview
        myOverview.box.elt(0).stroke = "dodgerblue";
    
        return myDiagram;
      }
    if(isReady) {
        return (
            <div className={classes.root}>
                <div id="programName" style={{display:'none'}}>RTOS Splash Schematic Editor</div>
                <div id="currentFile" style={{display:'none'}}>(NEW_FILENAME)</div>
                <Backdrop className={classes.backdrop} open={loading}>
                    <CircularProgress color="inherit" />
                </Backdrop>
                <AppBar position="static" className={classes.appBar}>
                    <Toolbar>
                    <div className={classes.logoWrapper}>
                    <a href="/">
                        <img 
                        alt="logo"
                        className={classes.logo}
                        src="/images/splash_logo.png"/>
                    </a>
                    </div>
                    
                    <Button
                        className={classes.button}
                        onClick={request_cancel}
                        color="inherit"
                    >
                        Cancel
                    </Button>
                    <Button
                        className={classes.button}
                        onClick={request_save}
                        color="inherit"
                    >
                        Save
                    </Button>
                    
                    </Toolbar>
                    
                    
                </AppBar>
                <div className={classes.topDiv}>
                    <div className={classes.diagram}>
                        <ReactDiagram
                        initDiagram={initDiagram}
                        divClassName="diagram"
                        nodeDataArray={nodeDataArray}
                        linkDataArray={linkDataArray}
                        onModelChange={handleModelChange}
                        />
                    </div>
                    <div 
                        id="palette"
                        className={classes.palette}

                    />
                    <Modal open={channelModalOpen} onClose={handleCloseChannelModal}>
                        <ChannelConfigurationModal channel={channelConfigured} onConfirm={handleConfirmChannelModal}/>
                    </Modal>
                    <Modal open={modeModalOpen} onClose={handleCloseModeModal}>
                        <ModeConfigurationModal factory={factoryConfigured} onConfirm={handleConfirmModeModal}/>
                    </Modal>
                    <Modal open={fusionModalOpen} onClose={handleCloseFusionModal}>

                    </Modal>
                </div>
                <div className={classes.bottomDiv}>
                    <div className={classes.propertyWrapper}>
                        <div className={classes.title}>
                            Property
                        </div>
                        <div className={classes.propertyDiv}>
                            <div id="splashInspectorDiv"/>
                            <div id="splashInspectorDiv2"/>
                        </div>
                    </div>
                    
                    <div className={classes.overviewWrapper}>
                        <div className={classes.title}>
                            Overview
                        </div>
                        <div id="overviewDiv" className={classes.overviewDiv}/>
                    </div>
                    <div className={classes.selectionPaneWrapper}>
                        <div className={classes.title}>
                            Build Unit
                        </div>
                        <div id="selectionPane" className={classes.selectionPaneDiv}/>
                    </div>
                </div>
                
            </div>
        )
    }
    else {
        return null
    }
};

export default EditProject;
