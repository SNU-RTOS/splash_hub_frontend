import {ReactDiagram} from 'gojs-react';
import * as go from 'gojs';
import '../libs/gojs/GoJS/Figures';
import '../libs/gojs/GoJS/Templates';
import {Inspector} from '../libs/gojs/GoJS/DataInspector';
import '../libs/gojs/GoJS/DataInspector.css'

import React, {useEffect, useState} from 'react';
import {AppBar, Backdrop, Button, CircularProgress, IconButton, makeStyles, Modal, Toolbar} from '@material-ui/core';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';

import ChannelConfigurationModal from '../components/EditProject/ChannelConfigurationModal';
import ModeConfigurationModal from '../components/EditProject/ModeConfigurationModal';
import FusionConfigurationModal from '../components/EditProject/FusionConfigurationModal';
import { request } from '../utils/axios';

let myDiagram, palette, myDiagram_buildUnit_selectionPane, myOverview;
let externalDroppedObjectName = "NONE";
let internalSelectedObjectName = "NONE";
let isDragging = false;
let highlighted_factory = null;
let buildUnit_dragging = false;
let configuring_fusionRule = false;
let selected_fusion_operator = null;
let origin_data;
let nodes_selected_in_fusionrule = new go.Set();
let curFactory = "";
let globalCurMode = 0;
let globalNodeDataArray = [];
let globalLinkDataArray = [];
const factory_mode_select_map = new Map();
let set_mode;
let set_event;
let isIncoming_toFactory = false;
let posX_atFactory;
let posY_atFactory;
let portType_atFactory;
let isIncoming_toProcessingComponent = false;
let posX_atProcessingComponent;
let posY_atProcessingComponent;
let portType_atProcessingComponent;
let isIncoming_toSourceComponent = false;
let posX_atSourceComponent;
let posY_atSourceComponent;
let isIncoming_toSinkComponent = false;
let posX_atSinkComponent;
let posY_atSinkComponent;
let current_factoryKey;
let isIncoming_toFusionOperator = false;
let posX_atFusionOperator;
let posY_atFusionOperator;
let portType_atFusionOperator;

const useStyles = makeStyles((theme) => ({
    root: {
        width: 'calc(100vw - 1px)',
        height: 'calc(100vh - 20px)',
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
        width: '34%',
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
    },
    appBarLeft: {
        display: 'flex',
        flexDirection: 'row',
        width: '33%',
        height: '100%',
    },
    appBarRight: {
        display: 'flex',
        flexDirection: 'row',
        width: '33%',
        height: '100%',
        justifyContent: 'flex-end'
    },
    horizontalDiv: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center'
    },
    modeTabs: {
        position: 'absolute',
        top: '60px',
        width: 'calc(100% - 210px)',
        backgroundColor: 'white'
    },
    modeConfigButton: {
        position: 'absolute',
        top: '60px',
        right: '210px',
    }
}));

const EditProject2 = (props) => {
    const classes = useStyles();
    const [originModelData, setOriginModelData] = useState(null);
    const [prevNodeDataArray, setPrevNodeDataArray] = useState([]);
    const [nodeDataArray, setNodeDataArray] = useState([]);
    const [prevLinkDataArray, setPrevLinkDataArray] = useState([]);
    const [linkDataArray, setLinkDataArray] = useState([]);
    const [visibleNodeDataArray, setVisibleNodeDataArray] = useState([]);
    const [visibleLinkDataArray, setVisibleLinkDataArray] = useState([]);
    const [isReadySplash, setIsReadySplash] = useState(false);
    const [channelModalOpen, setChannelModalOpen] = useState(false);
    const [modeModalOpen, setModeModalOpen] = useState(false);
    const [fusionModalOpen, setFusionModalOpen] = useState(false);
    const [channelConfigured, setChannelConfigured] = useState(null);
    const [factoryConfigured, setFactoryConfigured] = useState(null);
    const [fusionConfigured, setFusionConfigured] = useState(null);
    const [selectedInputPort, setSelectedInputPort] = useState(null);
    const [inputPortsForFusionOperator, setInputPortsForFusionOperator] = useState([]);
    const [loading, setLoading] = useState(false);
    const [curSelectedFactory, setCurSelectedFactory] = useState(null);
    const [curMode, setCurMode] = useState(null);
    useEffect(() => {
        if(isReadySplash)
            request_load(props.location.state.project_id)
    }, [isReadySplash])
    useEffect(() => {
        if(curFactory) {
            const cur_factory_node = globalNodeDataArray.find((node) => node.key == curFactory)
            if(cur_factory_node.mode_configuration) {
                setCurMode(0);
                globalCurMode = 0;
                handleSelectMode(null, 0);
            }
            else {
                handleSelectMode(null, null);
            }
            // myDiagram.animationManager.isEnabled = true;
            // myDiagram.animationManager.duration = 1000;
            // setTimeout(() => {
            //     myDiagram.animationManager.isEnabled = false;
            // }, 1000)
        }
    }, [curSelectedFactory])

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
    const handleConfirmFusionModal = (mandatoryPortList, optionalPortList, threshold, correlation) => {
        let _threshold = 0
        let _optional_ports = []; 
        let _mandatory_ports = [];
        if(threshold) {
            _threshold = threshold
        }
        optionalPortList.map(item => {
            _optional_ports.push(item.key)
        })
        mandatoryPortList.map(item => {
            _mandatory_ports.push(item.key)
        })
        let new_data = {
            mandatory_ports: _mandatory_ports,
            optional_ports: _optional_ports,
            threshold: _threshold,
            correlation: correlation,
        }
        myDiagram.model.setDataProperty(myDiagram.model.findNodeDataForKey(fusionConfigured.key), "fusionRule", new_data)
        setFusionModalOpen(false);
        setFusionConfigured(null);
    }
    const handleSelectInputPort = (port) => {
        setSelectedInputPort(port)
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
    const handleSelectMode = (event, mode) => {
        setCurMode(mode);
        globalCurMode = mode;
        const cur_factory_node = globalNodeDataArray.find((node) => node.key == curFactory)
        let components = globalNodeDataArray.filter((node) => {
            return node.category.indexOf("Port") === -1 && node.group === curFactory && (mode === null || node.mode === cur_factory_node.mode_configuration.mode_list[mode].name)
        })
        let ports = globalNodeDataArray.filter((node) => {
            
            return (node.category.indexOf("Port") > -1 &&
            (components.find((component) => component.key == node.group)))})
        const delegation_ports = globalNodeDataArray.filter((node) => {
            return (node.group == curFactory 
                && node.category.indexOf("Port") > -1);
        })
        let cur_nodes = globalNodeDataArray.filter((node) => {
            return node.group == curFactory ||
            node.category === "streamPort" && globalNodeDataArray.find((node2)=>node2.key === node.group);
        })
        let left_end_node = null;
        let right_end_node = null;
        let left_end_node_x = null;
        let left_end_node_y = null;
        let right_end_node_x = null;
        let right_end_node_y = null;

        cur_nodes.map((node) => {
            if(delegation_ports.find((port)=>port.key === node.key) !== undefined) return;
            const parsed_x = go.Point.parse(node.loc).x;
            const parsed_y = go.Point.parse(node.loc).y;
            if(left_end_node_x == null) {
                left_end_node_x = parsed_x;
                left_end_node_y = parsed_y;
                left_end_node = node;
            }
            else {
                if(left_end_node_x > parsed_x) {
                    left_end_node_x = parsed_x;
                    left_end_node_y = parsed_y;
                    left_end_node = node;
                }
                else if(left_end_node_x == parsed_x) {
                    if(left_end_node_y > parsed_y) {
                        left_end_node_x = parsed_x;
                        left_end_node_y = parsed_y;
                        left_end_node = node;
                    }
                }
            }
            if(right_end_node_x == null) {
                right_end_node_x = parsed_x;
                right_end_node_y = parsed_y;
                right_end_node = node;
            }
            else {
                if(right_end_node_x < parsed_x) {
                    right_end_node_x = parsed_x;
                    right_end_node_y = parsed_y;
                    right_end_node = node;
                }
                else if(right_end_node_x == parsed_x) {
                    if(right_end_node_y > parsed_y) {
                        right_end_node_x = parsed_x;
                        right_end_node_y = parsed_y;
                        right_end_node = node;
                    }
                }
            }
        })
        const delegation_ports_convert = [];
        let loc_y_left = left_end_node ? go.Point.parse(left_end_node.loc).y : 0;
        let loc_y_right = right_end_node ? go.Point.parse(right_end_node.loc).y : 0; 
        delegation_ports.sort((a, b) => go.Point.parse(a.loc).y > go.Point.parse(b.loc).y)
        delegation_ports.map((port) => {
            if(port.port_type == "STREAM_DELEGATION_INPUT_PORT") {
                let cur_link = globalLinkDataArray.find((link) => link.to === port.key);
                if(cur_link == undefined) return
                let cur_from = JSON.parse(JSON.stringify(globalNodeDataArray.find((node) => cur_link.from == node.key)));
                cur_from.group = curFactory;
                cur_from.loc = go.Point.stringify(new go.Point(left_end_node ? go.Point.parse(left_end_node.loc).x - 300 : -300, loc_y_left));
                delegation_ports_convert.push(cur_from);
                loc_y_left = loc_y_left + 100;
            } else if(port.port_type == "STREAM_DELEGATION_OUTPUT_PORT") {
                let cur_link = globalLinkDataArray.find((link) => link.from === port.key);
                if(cur_link == undefined) return
                let cur_to = JSON.parse(JSON.stringify(globalNodeDataArray.find((node) => cur_link.to === node.key)));
                cur_to.group = curFactory;
                cur_to.loc =  go.Point.stringify(new go.Point(right_end_node ? go.Point.parse(right_end_node.loc).x + 300 : 300, loc_y_right));
                delegation_ports_convert.push(cur_to);
                loc_y_right = loc_y_right + 100;
            }
        })
        let node_data_array = [
                ...components,
                ...ports,
                ...delegation_ports_convert,
            ]
        
        const link_data_array = linkDataArray.filter((link) => {
            return ports.find((port) => port.key == link.to || port.key == link.from)
        })
        myDiagram.model.nodeDataArray = node_data_array;
        myDiagram.model.linkDataArray = link_data_array;
        setVisibleNodeDataArray(node_data_array);
        setVisibleLinkDataArray(link_data_array);
        myDiagram.commandHandler.zoomToFit();
    }
    const refreshDiagram = () => {
        const cur_nodes = globalNodeDataArray.filter((node) => {
            return node.group == curFactory ||
            node.category === "streamPort" && globalNodeDataArray.find((node2)=>node2.key === node.group);
        })
        
        const processings = globalNodeDataArray.filter((node) => {
            return node.category == "processingComponent" && node.group == curFactory
        })
        const fusions = globalNodeDataArray.filter((node) => {
            return node.category == "fusionOperator" && node.group == curFactory
        })
        const factories = globalNodeDataArray.filter((node) => {
            return node.category == "factory" && node.group == curFactory
        })
        const ports = globalNodeDataArray.filter((node) => {
            return node.category.indexOf("Port") > -1
            && (processings.find((processing) => processing.key == node.group) 
            || fusions.find((fusion) => fusion.key == node.group)
            || factories.find((factory) => factory.key == node.group))
        })
        const delegation_ports = globalNodeDataArray.filter((node) => {
            return (node.group == curFactory
                && (node.port_type == "STREAM_DELEGATION_INPUT_PORT" 
                    || node.port_type == "STREAM_DELEGATION_OUTPUT_PORT"))
            
        })
        let left_end_node = null;
        let right_end_node = null;
        let left_end_node_x = null;
        let left_end_node_y = null;
        let right_end_node_x = null;
        let right_end_node_y = null;
        cur_nodes.map((node) => {
            if(delegation_ports.find((port)=>port.key === node.key) !== undefined) return;
            const parsed_x = go.Point.parse(node.loc).x;
            const parsed_y = go.Point.parse(node.loc).y;
            if(left_end_node_x == null) {
                left_end_node_x = parsed_x;
                left_end_node_y = parsed_y;
                left_end_node = node;
            }
            else {
                if(left_end_node_x > parsed_x) {
                    left_end_node_x = parsed_x;
                    left_end_node_y = parsed_y;
                    left_end_node = node;
                }
                else if(left_end_node_x == parsed_x) {
                    if(left_end_node_y > parsed_y) {
                        left_end_node_x = parsed_x;
                        left_end_node_y = parsed_y;
                        left_end_node = node;
                    }
                }
            }
            if(right_end_node_x == null) {
                right_end_node_x = parsed_x;
                right_end_node_y = parsed_y;
                right_end_node = node;
            }
            else {
                if(right_end_node_x < parsed_x) {
                    right_end_node_x = parsed_x;
                    right_end_node_y = parsed_y;
                    right_end_node = node;
                }
                else if(right_end_node_x == parsed_x) {
                    if(right_end_node_y > parsed_y) {
                        right_end_node_x = parsed_x;
                        right_end_node_y = parsed_y;
                        right_end_node = node;
                    }
                }
            }
        })
        const delegation_ports_convert = [];
        let loc_y_left = left_end_node ? go.Point.parse(left_end_node.loc).y : 0;
        let loc_y_right = right_end_node ? go.Point.parse(right_end_node.loc).y : 0; 
        const res = left_end_node ? right_end_node ? console.log(left_end_node.loc, right_end_node.loc) : null : null
        delegation_ports.sort((a, b) => go.Point.parse(a.loc).y > go.Point.parse(b.loc).y)
        delegation_ports.map((port) => {
            if(port.port_type == "STREAM_DELEGATION_INPUT_PORT") {
                let cur_link = globalLinkDataArray.find((link) => link.to === port.key);
                if(cur_link == undefined) return
                let cur_from = JSON.parse(JSON.stringify(globalNodeDataArray.find((node) => cur_link.from == node.key)));
                cur_from.group = curFactory;
                cur_from.loc = go.Point.stringify(new go.Point(left_end_node ? go.Point.parse(left_end_node.loc).x - 300 : -300, loc_y_left));
                delegation_ports_convert.push(cur_from);
                loc_y_left = loc_y_left + 100;
            } else if(port.port_type == "STREAM_DELEGATION_OUTPUT_PORT") {
                let cur_link = globalLinkDataArray.find((link) => link.from === port.key);
                if(cur_link == undefined) return
                let cur_to = JSON.parse(JSON.stringify(globalNodeDataArray.find((node) => cur_link.to === node.key)));
                cur_to.group = curFactory;
                cur_to.loc =  go.Point.stringify(new go.Point(right_end_node ? go.Point.parse(right_end_node.loc).x + 300 : 300, loc_y_right));
                delegation_ports_convert.push(cur_to);
                loc_y_right = loc_y_right + 100;
            }
        })
        const link_data_array = globalLinkDataArray.filter((link) => {
            return ports.find((port) => port.key == link.to || port.key == link.from)
        })
        const node_data_array = [
            ...processings,
            ...fusions,
            ...ports,
            ...factories,
            ...delegation_ports_convert,
        ]
        myDiagram.model.nodeDataArray = node_data_array;
        myDiagram.model.linkDataArray = link_data_array;
        setVisibleNodeDataArray(node_data_array);
        setVisibleLinkDataArray(link_data_array);
        myDiagram.commandHandler.zoomToFit();
    }
    const configureChannel = (e, obj) => {
        setChannelConfigured(obj.part.data);
        handleOpenChannelModal();
    }
    const configureMode = (e, obj) => {
        setFactoryConfigured(obj.part.data);
        handleOpenModeModal();
    }
    const configureModeForData = (data) => {
        setFactoryConfigured(data);
        handleOpenModeModal();
    }
    const configureFusionRule = (e, obj) => {
        setFusionConfigured(obj.part.data);
        handleOpenFusionModal();
    }
    const isChannelExisting = (channel) => {
        let flag = false;
        myDiagram.nodes.each(function(node) {
            if(node.name === "STREAM_OUTPUT_PORT" && node.part.data.Channel === channel) {
                flag = true;
                return false;
            }
        })
        return flag;
    }
    const request_save = async () => {
        let error_flag = false;
        let error_flag2 = false;
        myDiagram.nodes.map((node) => {
            if(node.part.data.category === "streamPort") {
                if(node.part.data.port_type === "STREAM_OUTPUT_PORT") {
                    if(!node.part.data.Channel || !node.part.data.MessageType) {
                        error_flag = true;
                    }    
                }
            }
            else if(node.part.data.category === "fusionOperator") {
                if(node.part.data.fusionRule === null || node.part.data.fusionRule === undefined) {
                    error_flag2 = true;
                }
            }
        })
        if(error_flag) {
            alert("There's a channel without a name or a message type");
            return;
        }
        else if(error_flag2) {
            alert("There's a fusion operator without a fusion rule");
            return;
        }
    
        let result = window.confirm("Are you sure to want to save?");
        try {
            if(result) {
                setLoading(true);
                const project_id = props.location.state.project_id;
                // const modelAsText = myDiagram.model.toJson();
                const data = {
                    class: 'GraphLinksModel',
                    linkKeyProperty: 'key',
                    nodeDataArray: nodeDataArray,
                    linkDataArray: linkDataArray
                }
                const modelAsText = JSON.stringify(data);
                
                const response = await request('put', '/project/schema/'+project_id+'/', {
                    data: modelAsText
                })
                if(response.status === 201) {
                    props.history.push('/project/'+ project_id)
                }
            }
        } catch(err) {
            console.log(err)
            alert('Unknown error')
        } finally {
            setLoading(false)
        }
    }
    const request_cancel = () => {
        let result = window.confirm("Are you sure to want to cancel?");
        if(result) {
            props.history.goBack();
        }
    }
    const request_load = async (id) => {
        // setOriginModelData(JSON.parse(JSON.stringify(test_data)))

        const response = await request('get', '/project/schema/'+id+'/')
        console.log(response.status)
        if(response.status === 200) {
            const schemaData = response.data.schema
            console.log(schemaData)

            const parsedString = JSON.parse(schemaData)
            setOriginModelData(parsedString)
            const sources = parsedString.nodeDataArray.filter((node) => {
                return node.category == "sourceComponent"
            })
            const sinks = parsedString.nodeDataArray.filter((node) => {
                return node.category == "sinkComponent"
            })
            const ports = parsedString.nodeDataArray.filter((node) => {
                return node.category == "streamPort" && (sources.find((source) => source.key == node.group) || sinks.find((sink) => sink.key == node.group))
            })
            const root_factories = parsedString.nodeDataArray.filter((node) => {
                return (node.category == "factory" && !node.group)
            })
            const mode_ports = parsedString.nodeDataArray.filter((node) => {
                return (node.category == "modeChangeInputPort" && (root_factories.find((factory) => factory.key == node.group)))
            })
            const node_data_array = [
                ...sources,
                ...sinks,
                ...ports,
                ...root_factories,
                ...mode_ports,
            ]
            const link_data_array = parsedString.linkDataArray.filter((link) => {
                return ports.find((port) => port.key == link.to || port.key == link.from)
            })
            globalNodeDataArray = parsedString.nodeDataArray;
            globalLinkDataArray = parsedString.linkDataArray;
            setNodeDataArray(JSON.parse(JSON.stringify(parsedString.nodeDataArray)));
            setLinkDataArray(JSON.parse(JSON.stringify(parsedString.linkDataArray)));
            setVisibleNodeDataArray(node_data_array);
            setVisibleLinkDataArray(link_data_array);
            // myDiagram.animationManager.isEnabled = true;
            // myDiagram.animationManager.duration = 1000;
            // myDiagram.model.nodeDataArray = node_data_array;
            // myDiagram.model.linkDataArray = link_data_array;
            myDiagram.commandHandler.zoomToFit();
        }
    }
    const navigate_prev = () => {
        const node = nodeDataArray.find((item) => item.key == curFactory)
        if(node.group) { // has a parent
            setCurSelectedFactory(node.group);
            curFactory = node.group;
        } else { // root factory
            const sources = globalNodeDataArray.filter((node) => {
                return node.category == "sourceComponent"
            })
            const sinks = globalNodeDataArray.filter((node) => {
                return node.category == "sinkComponent"
            })
            const ports = globalNodeDataArray.filter((node) => {
                return  node.category == "streamPort" && node.category == "streamPort" && (sources.find((source) => source.key == node.group) || sinks.find((sink) => sink.key == node.group))
            })
            const root_factories = globalNodeDataArray.filter((node) => {
                return (node.category == "factory" && !node.group)
            })
            const delegation_ports = globalNodeDataArray.filter((node) => {
                return (node.group == curFactory 
                    && node.category.indexOf("Port") > -1)
                        
                
            })
            console.log(delegation_ports)
            const node_data_array = [
                ...sources,
                ...sinks,
                ...ports,
                ...root_factories,
                ...delegation_ports,
            ]
            const link_data_array = linkDataArray.filter((link) => {
                return ports.find((port) => port.key == link.to || port.key == link.from)
            })
            myDiagram.model.nodeDataArray = node_data_array;
            myDiagram.model.linkDataArray = link_data_array;
            setVisibleNodeDataArray(node_data_array);
            setVisibleLinkDataArray(link_data_array);
            // myDiagram.animationManager.isEnabled = true;
            // myDiagram.animationManager.duration = 1000;
            myDiagram.commandHandler.zoomToFit();
            // setTimeout(() => {
            //     myDiagram.animationManager.isEnabled = false;
            // }, 1000)
            setCurMode(0)
            globalCurMode = 0;
            setCurSelectedFactory("")
            curFactory = ""
        }
    }
    const generate_code = async (changes) => {
        if(changes.modifiedNodeData) { 
            let has_new = changes.insertedNodeKeys !== undefined
            changes.modifiedNodeData.map(async (item) => {
                setLoading(true)

                let is_new = false
                if(has_new){
                    is_new = changes.insertedNodeKeys.findIndex((inserted_key) => inserted_key === item.key ) > -1
                }
                switch(item.category) {
                    case 'factory':
                        if(is_new) {
                            console.log('ADD FACTORY')
                            const response = await request('put', '/project/code/generate/'+1+'/')
                        }
                        break
                    case 'processingComponent' || 'sourceComponent' || 'sinkComponent' || 'fusionOperator':
                        if(is_new) {
                            console.log('ADD COMPONENT')
                        }
                        break
                    case 'streamPort' || 'eventInputPort' || 'eventOutputPort' || 'modeChangeInputPort' || 'modeChangeOutputPort':
                        if(is_new) {
                            console.log('ADD PORT')
                        }
                        break
                    case 'buildUnit':
                        if(is_new) {
                            console.log('SET BUILD UNIT')
                        }
                        break
 
                }
                setLoading(false)
            })
        } else if(changes.removedNodeKeys) {
            changes.removedNodeKeys.map((item) => {
                console.log('REMOVE')
            })
        }

    }
    const handleModelChange = (changes) => {
        setVisibleNodeDataArray(myDiagram.model.nodeDataArray)
        setVisibleLinkDataArray(myDiagram.model.linkDataArray)
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
                            palette.clearSelection();
                            // myDiagram.commandHandler.zoomToFit()
                            //console.log("BuildUnit is null string? "+ (part.data.BuildUnit === null) ? "true" : "false");
                        });
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
                            let flag = false;
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
                    let selected = e.subject.part;
                    externalDroppedObjectName = "NONE";
                    internalSelectedObjectName = selected.name;
                    //setDefaultProperty(selected);
                    console.log(selected.data.loc);
                    updateCurrentObject(selected);
                    //relocatePort(selected);              
    
                    inspector.inspectObject();
                    inspector2.inspectObject();
                },
    
                ObjectContextClicked: function(e) {
                    console.log("ObjectContextClicked()");
                    let selected = e.subject.part;
                    externalDroppedObjectName = "NONE";
                    internalSelectedObjectName = selected.name;
                    if(selected.data.category === 'streamPort' && selected.data.port_type === 'STREAM_INPUT_PORT') 
                        setSelectedInputPort(selected)
                    else {
                        setSelectedInputPort(null);
                    }
                    //setDefaultProperty(selected);
                    updateCurrentObject(selected);
                    //relocatePort(selected);
                    inspector.inspectObject();
                    inspector2.inspectObject();   
                },
                ObjectDoubleClicked: function(e) {
                    console.log("ObjectDoubleClicked()");
                    if(e.subject.part.data.category == "factory") {
                        setCurSelectedFactory(e.subject.part.data.key)
                        curFactory = e.subject.part.data.key;
                    }
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
    
                    inspector.inspectObject();
                    inspector2.inspectObject();
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
                routing: go.Link.AvoidsNodes,
                // routing: go.Link.Orthogonal,
                // curve: go.Link.JumpOver,
                corner: 0,
                relinkableFrom: false, relinkableTo: false,
                reshapable: true,
                selectionAdorned: false, // Links are not adorned when selected so that their color remains visible.
                shadowOffset: new go.Point(0, 0), shadowBlur: 5, shadowColor: "blue",
                zOrder: 1000,
                },
                new go.Binding("isShadowed", "isSelected").ofObject(),
                
                //new go.Binding("isShadowed", "segArray", go.Binding.toString()).makeTwoWay(),
                $(go.Shape,
                { name: "SHAPE", strokeWidth: 1, stroke: "black" }),
            );
        
        myDiagram.model.makeUniqueKeyFunction = setKeyUUID;
        myDiagram.model.copyNodeDataFunction = function(data, model) {
                let shallowCopiedObject = JSON.parse(JSON.stringify(data))
                shallowCopiedObject.key = setKeyUUID(model, shallowCopiedObject);
                return shallowCopiedObject;
        };
          
        const template_streamPort = 
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
        const template_eventInputPort = 
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
        
        
        const template_eventOutputPort = 
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
          const template_modeChangeInputPort = 
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
            { doubleClick: function(e, obj) {
                e.diagram.startTransaction("Toggle Input");
                toggleAllModeChangePort(e.diagram, obj);
                e.diagram.commitTransaction("Toggle Input");
              }
            }
          ); 
        
        const template_modeChangeOutputPort = 
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
            { doubleClick: function(e, obj) {
                e.diagram.startTransaction("Toggle Output");
                toggleAllModeChangePort(e.diagram, obj);
                e.diagram.commitTransaction("Toggle Output");
              }
            }
          );      
        const template_processingComponent =
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
                                let data = myDiagram.model.findNodeDataForKey(o.key);
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
                    let selectedName = node.name;
                    let grp_loc = new go.Point(0, 0);
                    let node_loc = new go.Point(0, 0);
                    
                    let grp_height = grp.actualBounds.height;
                    let grp_width = grp.actualBounds.width;              
                    
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
        const template_sourceComponent = 
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
                    
                    let selectedName = node.name;
                    
                    let grp_loc = new go.Point(0, 0);
                    let node_loc = new go.Point(0, 0);
                    
                    let grp_height = grp.actualBounds.height;
                    let grp_width = grp.actualBounds.width;          
                    
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
                fill: "white", width: 140, height: 60, stroke: "black", strokeWidth: 1.5,
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
        const template_sinkComponent = 
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
                  let selectedName = node.name;
                  grp.data.haveInputPort = true;
                },
                memberRemoved: function(grp, node) {
                  grp.data.haveInputPort = false;
                },             
                
                
                memberValidation: function(grp, node) {
                  console.log("memberValidation()");
  
                  
                  let selectedName = node.name;
                  
                  let grp_loc = new go.Point(0, 0);
                  let node_loc = new go.Point(0, 0);
                  
                  let grp_height = grp.actualBounds.height;
                  let grp_width = grp.actualBounds.width;              
                  
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
                fill: "white", width: 120, height: 60, stroke: "black", strokeWidth: 1.5
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
        const template_fusionOperator =
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
                              let data = myDiagram.model.findNodeDataForKey(o.key);
                              return data.buildUnit === "" || data.buildUnit === undefined
                          }
                      )
                    ),
                    $("ContextMenuButton",
                      $(go.TextBlock, {margin: 5, width: 150}, "Configure Fusion Rule"),
                      { 
                         click: configureFusionRule,
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
                let selectedName = node.name;
                if(node.name === "STREAM_OUTPUT_PORT") {
                  grp.data.haveOutputPort = true;
                  node.movable = false;
                } 
              },
              memberRemoved: function(grp, node) {
                // TODO: modify, node has an after-removed property
                if(node.name === "STREAM_OUTPUT_PORT") grp.data.haveOutputPort = false;
              }, 
              
              
              memberValidation: function(grp, node) {
                console.log("memberValidation()");
                let selectedName = node.name;
                let grp_loc = new go.Point(0, 0);
                let node_loc = new go.Point(0, 0);
                let grp_height = grp.actualBounds.height;
                let grp_width = grp.actualBounds.width;              
                
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
                height: 40, width: 115,
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
        const template_factory =
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
                  if(node.category === "modeChangeInputPort" && isDragging) {
                      if(globalNodeDataArray.find((node2) => node2.key === grp.key).mode_configuration) return
                      let data = {"initial_mode": "Mode_A", "mode_list":[{"name": "Mode_A", "events": [{"name": "event_1", "next_mode": "Mode_A", "output_internal_data_items": false}]}]}
                      myDiagram.model.setDataProperty(myDiagram.model.findNodeDataForKey(grp.key), "mode_configuration", data)
                      grp.memberParts.each(function(member) {
                          if(member.part.data.category === "streamPort") {
                              member.part.location = new go.Point(member.part.location.x, member.part.location.y + 10); 
                          }
                      })
                      globalNodeDataArray.map((node2) => {
                          if(node2.group == grp.key && node2.category.indexOf("Port") === -1) {
                              if(grp.part.data.mode_configuration.mode_list[0]) {
                                node2.mode = grp.part.data.mode_configuration.mode_list[0].name
                              }
                          }
                      })
                      return;
                  }
              },
  
              memberValidation: function(grp, node) {
                console.log("memberValidation()");
                let selectedName = node.name;
                let grp_loc = new go.Point(0, 0);
                let node_loc = new go.Point(0, 0);
                let grp_height = grp.actualBounds.height;
                let grp_width = grp.actualBounds.width;              
                
                if (grp !== null && grp.location.isReal()) {
                  grp_loc = grp.location;
                  node_loc = node.location;
                }
                if(selectedName === "MODECHANGE_INPUT_PORT" 
                          // || selectedName === "MODECHANGE_OUTPUT_PORT"
                          || selectedName === "MODECHANGE_DELEGATION_INPUT_PORT") {
                          // || selectedName === "MODECHANGE_DELEGATION_OUTPUT_PORT") {
                  if(isIncoming_toFactory) {
                      grp.findObject("AREA_MODECHANGE_PORT").fill = "yellow";
                      let flag = false;
                      myDiagram.nodes.each(function(part) {
                          if(part.data.category === node.data.category
                              && part.data.group === grp.key) flag = true;
                          return;
                      })
                      if(flag) {
                          return false;
                      }    
                      console.log(grp_loc)
                      posX_atFactory = grp_loc.x + 10
                      posY_atFactory = grp_loc.y + 5
                      myDiagram.nodes.each(function(part) {
                          if(part.data.group === grp.key && part.data.category === "modeChangeOutputPort") {
                              part.position = new go.Point(part.location.x, posY_atFactory)
                          }
                      })
                      return true; 
                  } else {
                      node.position = new go.Point(posX_atFactory, posY_atFactory);
                      return true;
                  }
                } 
                else if(selectedName === "MODECHANGE_OUTPUT_PORT") {
                    if(grp.findObject("MODE_A").visible) {
                        posX_atFactory = grp_loc.x + grp_width/2 - 30;
                        posY_atFactory = grp_loc.y - grp_height/2 + 10;
                    }
                    else {
                        posX_atFactory = grp_loc.x + grp_width/2 - 30;
                        posY_atFactory = grp_loc.y - grp_height/2 - 10;
                    }
                } 
                // else if(selectedName === "EVENT_INPUT_PORT" 
                //             || selectedName === "EVENT_OUTPUT_PORT"
                //             || selectedName === "EVENT_DELEGATION_INPUT_PORT"
                //             || selectedName === "EVENT_DELEGATION_OUTPUT_PORT") {
                //     if(isIncoming_toFactory) {
                //         grp.findObject("AREA_EVENT_PORT").fill = "yellow";
                //         posY_atFactory = grp_loc.y - grp_height/2-10;
                //         return true; 
                //     } else {
                //         node.position = new go.Point(node_loc.x, posY_atFactory);
                //         if(selectedName === "EVENT_INPUT_PORT") update_portType(node, "EVENT_DELEGATION_INPUT_PORT");
                //         if(selectedName === "EVENT_OUTPUT_PORT") update_portType(node, "EVENT_DELEGATION_OUTPUT_PORT");
                //         //addLog("add new event port!");
                //         return true;
                //     }
                // }
                else if(selectedName === "STREAM_UNTYPED_PORT" 
                || selectedName === "STREAM_INPUT_PORT" 
                || selectedName === "STREAM_OUTPUT_PORT"
                || selectedName === "STREAM_DELEGATION_PORT") {
                  if(isIncoming_toFactory) {   
                    console.log(grp_loc.x, node_loc.x)
                    if(node_loc.x - grp_loc.x < grp_width / 2) {
                      grp.findObject("AREA_STREAM_INPUT_PORT").fill = "green";
                      posX_atFactory = grp_loc.x - 10;
                      portType_atFactory = "STREAM_DELEGATION_INPUT_PORT";
                      return true;
                    }
                    else {
                      grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = "blue";
                      posX_atFactory = grp_loc.x + grp_width - 10;
                      portType_atFactory = "STREAM_DELEGATION_OUTPUT_PORT";
                    }                  
                    return true; 
                  } else {
                    update_portType(node, portType_atFactory);
                    node.position = new go.Point(posX_atFactory, node_loc.y);
                    return true;
                  }
                }
                else {
                  return false; 
                }
              },
  
              contextMenu:     // define a context menu for each node
                $("ContextMenu",  
                  $("ContextMenuButton",
                    $(go.TextBlock, {margin: 5, width: 150}, "Set Build Unit"),
                      { 
                        click: setBuildUnit_contextMenu 
                      },
                      new go.Binding("visible", "", 
                          function(o) {
                              let list = []
                              myDiagram.nodes.each(function(node) {
                                  if (node.data.group === o.key) {
                                      list.push(node);
                                  }
                              });
                              let flag = false;
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
                //   $("ContextMenuButton",
                //     $(go.TextBlock, {margin: 5, width: 150}, "Configure Mode"),
                //     {
                //         click: configureMode
                //     },
                //     new go.Binding("visible", "", 
                //           function(o) {
                //               let flag = false;
                //               myDiagram.nodes.each(function(node) {
                //                   if(node.category === "modeChangeInputPort") {
                //                       console.log(node.data.group)
                //                       if(node.data.group === o.key) {
                //                           flag = true;
                //                           return;
                //                       }
                //                   }
                //               })
                //               return flag;
                //           }
                //       )
                //   )
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
                  alignment: new go.Spot(0.07, 0.03, 0, 0),
                  alignmentFocus: go.Spot.BottomLeft,
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
                  let new_y = Math.max(0.0507 * Math.exp(-0.002* data), 0.0052);
                  return new go.Spot(0.07, new_y, 0, 0);
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
              $(go.TextBlock, "Mode_A",
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
                      return data.mode_list[0].name;
                  }),
              )
            ),
            $(go.Panel, "Spot",
              {
                  name: "MODE_B",
                  alignment: new go.Spot(0.27, 0.03, 0, 0),
                  alignmentFocus: go.Spot.BottomLeft,
              },
              new go.Binding("alignment", "HEIGHT", function(data, node) {
                  let new_y = Math.max(0.0507 * Math.exp(-0.002* data), 0.0052);
                  return new go.Spot(0.27, new_y, 0, 0);
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
              )
            ),
            $(go.Panel, "Spot", 
              {
                  name: "MODE_C",
                  alignment: new go.Spot(0.47, 0.03, 0, 0),
                  alignmentFocus: go.Spot.BottomLeft,
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
                  let new_y = Math.max(0.0507 * Math.exp(-0.002* data), 0.0052);
                  return new go.Spot(0.47, new_y, 0, 0);
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
              )
            ),
            $(go.Panel, "Spot", 
              {
                  name: "MODE_D",
                  alignment: new go.Spot(0.67, 0.03, 0, 0),
                  alignmentFocus: go.Spot.BottomLeft,
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
                  let new_y = Math.max(0.0507 * Math.exp(-0.002* data), 0.0052);
                  return new go.Spot(0.67, new_y, 0, 0);
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
        const sharedToolTip =
            $("ToolTip",
              { "Border.figure": "RoundedRectangle" },
              $(go.TextBlock, { margin: 2 },
                new go.Binding("text", "", function(d) { return d.category; })));
        const inspector = new Inspector('splashInspectorDiv', myDiagram,
            {
        
                // uncomment this line to only inspect the named properties below instead of all properties on each object:
                includesOwnProperties: false,
                multipleSelection: true,
                propertyModified: function(prop, new_value, inspector) {
                    let node = inspector.inspectedObject; 
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
                let node = inspector.inspectedObject; 
        
                let shape = node.findObject("SHAPE");
                //shape.fill = node.data.color;
                },
                properties: {
                "category": {readOnly: true},            
                "port_type": {readOnly: true,  show: isStreamPort },
                "group": { readOnly: true, show: false },
                "isGroup": { show: false },
        
                "loc": { show: false },
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
                },
            });
            let paletteTemplate_streamPort = 
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
                    //let allowScroll = !e.diagram.viewportBounds.containsRect(e.diagram.documentBounds);
                    // myDiagram_buildUnit_selectionPane.allowVerticalScroll = allowScroll;
        
                },
            });
        const paletteTemplate_eventInputPort = 
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
    
        const paletteTemplate_eventOutputPort = 
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
            
        const paletteTemplate_modeChangeInputPort = 
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
    
        const paletteTemplate_modeChangeOutputPort = 
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
    
        const paletteTemplate_processingComponent =
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
    
        const paletteTemplate_sourceComponent = 
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
                  width: 180, height: 50, stroke: "black", strokeWidth: 1,
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
      
        const paletteTemplate_sinkComponent =
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
      
        const paletteTemplate_fusionOperator =
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
      
        const paletteTemplate_factory =
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
                                let data = myDiagram.model.findNodeDataForKey(o.key);
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
                                let data = myDiagram.model.findNodeDataForKey(o.key);
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
        myDiagram_buildUnit_selectionPane.model.undoManager = myDiagram.model.undoManager;
        let myChangingModel = false;
        myDiagram.addModelChangedListener(function(e) {
            // if (e.isTransactionFinished) enableAll();
            if (e.model.skipsUndoManager) return;
            if (myChangingModel) return;
            myChangingModel = true;
            // don't need to start/commit a transaction because the UndoManager is shared with myDiagram_buildUnit_selectionPane
            if (e.modelChange === "nodeGroupKey" || e.modelChange === "nodeParentKey") {
                // handle structural change: group memberships
                let treenode = myDiagram_buildUnit_selectionPane.findNodeForData(e.object);
                if (treenode !== null) treenode.updateRelationshipsFromData();
            } 
            else if (e.change === go.ChangedEvent.Property) {
                let treenode = myDiagram_buildUnit_selectionPane.findNodeForData(e.object);
                if (treenode !== null) treenode.updateTargetBindings();
                try {
                    let newNode = globalNodeDataArray.find((node) => node.key === e.object.key);
                    newNode[e.propertyName] = e.newValue;
                } catch(err) {
                    
                }

            } 
            else if (e.change === go.ChangedEvent.Insert && e.propertyName === "nodeDataArray") {
                // pretend the new data isn't already in the nodeDataArray for myDiagram_buildUnit_selectionPane
                myDiagram_buildUnit_selectionPane.model.nodeDataArray.splice(e.newParam, 1);
                // now add to the myDiagram_buildUnit_selectionPane model using the normal mechanisms
                const newArray = globalNodeDataArray.concat(e.newValue)
                setNodeDataArray(newArray)
                globalNodeDataArray = newArray
                if(e.newValue.category === 'buildUnit'||
                    e.newValue.category === 'processingComponent' || 
                    e.newValue.category === 'sourceComponent' || 
                    e.newValue.category === 'sinkComponent' || 
                    e.newValue.category === 'fusionOperator'
                ) {
                    myDiagram_buildUnit_selectionPane.model.addNodeData(e.newValue);
                }
            }
            else if (e.change === go.ChangedEvent.Insert && e.propertyName === "linkDataArray") {
                const newArray = globalLinkDataArray.concat(e.newValue)
                setLinkDataArray(newArray)
                globalLinkDataArray = newArray
            } 
            else if (e.change === go.ChangedEvent.Remove && e.propertyName === "nodeDataArray") {
                // remove the corresponding node from myDiagram_buildUnit_selectionPane
                let treenode = myDiagram_buildUnit_selectionPane.findNodeForData(e.oldValue);
                if (treenode !== null) myDiagram_buildUnit_selectionPane.remove(treenode);
                const newArray = globalNodeDataArray.filter(node => node.key !== e.oldValue.key);
                globalNodeDataArray = newArray;
            }
            else if (e.change === go.ChangedEvent.Remove && e.propertyName === "linkDataArray") {
                const newArray = globalLinkDataArray.filter(link => !(link.from === e.oldValue.from && link.to === e.oldValue.to));
                globalNodeDataArray = newArray;
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
                let node = myDiagram.findNodeForData(e.object);
                if (node !== null) node.updateRelationshipsFromData();
            } else if (e.change === go.ChangedEvent.Property) {
                // propagate simple data property changes back to the main Diagram
                let node = myDiagram.findNodeForData(e.object);
                if (node !== null) node.updateTargetBindings();
            } else if (e.change === go.ChangedEvent.Insert && e.propertyName === "nodeDataArray") {
                // pretend the new data isn't already in the nodeDataArray for the main Diagram model
                myDiagram.model.nodeDataArray.splice(e.newParam, 1);
                // now add to the myDiagram model using the normal mechanisms
                myDiagram.model.addNodeData(e.newValue);
            } else if (e.change === go.ChangedEvent.Remove && e.propertyName === "nodeDataArray") {
                // remove the corresponding node from the main Diagram
                let node = myDiagram.findNodeForData(e.oldValue);
                if (node !== null) myDiagram.remove(node);
            }
            myChangingModel = false;
        });
        setIsReadySplash(true);
        setCurSelectedFactory("");
        curFactory = "";
        return myDiagram;
    }
    const setDefaultProperty = (part) => {
        console.log("setDefaultProperty()");
        let new_name = ""
        let name_count = 1;
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
        if(part.data.category === "streamPort" || part.data.category === "eventInputPort" || part.data.category === "eventOutputPort" || part.data.category === "modeChangeInputPort" || part.data.category === "modeChangeOutputPort") {
            return;
        }
        part.data.group = curFactory;
        part.data.mode = "";
        if(curFactory) {
            const parent_node = globalNodeDataArray.find((node) => node.key == curFactory);
            // if(myDiagram.model.nodeDataArray.length == 1) { 
            //     const parent_loc = go.Point.parse(parent_node.loc);
            //     const current_loc = go.Point.parse(part.data.loc);
            //     const new_loc = new go.Point(parent_loc.x + current_loc.x, parent_loc.y + current_loc.y);
            //     part.data.loc = go.Point.stringify(new_loc);
            // }
            if(parent_node.mode_configuration) {
                part.data.mode = parent_node.mode_configuration.mode_list[globalCurMode].name
            }
        }
    }
    return (
        <div className={classes.root}>
            <div id="programName" style={{display:'none'}}>RTOS Splash Schematic Editor</div>
            <div id="currentFile" style={{display:'none'}}>(NEW_FILENAME)</div>
            <Backdrop className={classes.backdrop} open={loading}>
                <CircularProgress color="inherit" />
            </Backdrop>
            <AppBar position="static" className={classes.appBar}>
                <Toolbar>
                        <div className={classes.appBarLeft}>
                            {curSelectedFactory ? 
                            <div className={classes.horizontalDiv}>
                                <IconButton
                                    className={classes.button}
                                    color="inherit"
                                    onClick={navigate_prev}
                                >
                                    <ArrowBackIosIcon/>
                                </IconButton>
                                <div>
                                    {curSelectedFactory}
                                </div>
                            </div>: null}
                        </div>
                    <div className={classes.logoWrapper}>
                    <a href="/">
                        <img 
                        alt="logo"
                        className={classes.logo}
                        src="/images/splash_logo.png"/>
                    </a>
                    </div>
                    <div className={classes.appBarRight}>
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
                    </div>
                </Toolbar>
                
            </AppBar>
            {nodeDataArray.length > 0 ? nodeDataArray.find((node) => node.key == curSelectedFactory) ? nodeDataArray.find((node) => node.key == curSelectedFactory).mode_configuration ? 
                <AppBar>
                
                <Tabs
                    className={classes.modeTabs}
                    value={curMode}
                    onChange={handleSelectMode}
                    indicatorColor="primary"
                    textColor="primary"
                    centered
                >
                    {nodeDataArray.find((node) => node.key == curSelectedFactory).mode_configuration.mode_list.map((mode) => {
                        return <Tab label={mode.name}/>
                    })}
                </Tabs>
                <IconButton className={classes.modeConfigButton} onClick={() => configureModeForData(globalNodeDataArray.find((node) => node.key === curFactory))}>
                    <MoreHorizIcon/>
                </IconButton>
                </AppBar>
                
                :
                null : null : null
            }
            <div className={classes.topDiv}>
                <div className={classes.diagram}>
                    <ReactDiagram
                    initDiagram={initDiagram}
                    divClassName="diagram"
                    nodeDataArray={visibleNodeDataArray}
                    linkDataArray={visibleLinkDataArray}
                    onModelChange={handleModelChange}
                    skipsDiagramUpdate={false}
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
                    <FusionConfigurationModal fusionOperator={fusionConfigured} onConfirm={handleConfirmFusionModal} selectInputPort={handleSelectInputPort} inputPorts={inputPortsForFusionOperator}/>
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
    );
};

export default EditProject2;


function CustomLayout() {
    go.Layout.call(this);
}
go.Diagram.inherit(CustomLayout, go.Layout);

CustomLayout.prototype.doLayout = function(coll) {
    coll = this.collectParts(coll);

    let supers = new go.Set(/*go.Node*/);
    coll.each(function(p) {
        if (p instanceof go.Node && p.category === "buildUnit") supers.add(p);
    });

    function membersOf(sup, diag) {
        let set = new go.Set(/*go.Part*/);
        let arr = sup.data._members;
        for (let i = 0; i < arr.length; i++) {
            let d = arr[i];
            set.add(diag.findNodeForData(d));
        }
        return set;
    }

    function isReady(sup, supers, diag) {
        let arr = sup.data._members;
        if(arr === undefined) return false;
        for (let i = 0; i < arr.length; i++) {
            let d = arr[i];
            if (d.category === "buildUnit") continue;
            let n = diag.findNodeForData(d);
            if (supers.has(n)) return false;
        }
        return true;
    }
    // implementations of doLayout that do not make use of a LayoutNetwork
    // need to perform their own transactions
    this.diagram.startTransaction("Custom Layout");
    while (supers.count > 0) {
        let ready = null;
        let it = supers.iterator;
        while (it.next()) {
            if (isReady(it.value, supers, this.diagram)) {
                ready = it.value;
                break;
            }
        }
        
        supers.remove(ready);
        if(ready === null) return;
        let b = this.diagram.computePartsBounds(membersOf(ready, this.diagram));
        ready.location = new go.Point(b.position.x, b.position.y - 25);
        let body = ready.findObject("BODY");
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
    let diagram = this.diagram;
    this.diagram.layoutDiagram(true);
};

CustomDraggingTool.prototype.computeEffectiveCollection = function(parts) {
    console.log("computeEffectiveCollection")
    let coll = new go.Set(/*go.Part*/).addAll(parts);
    let tool = this;
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
    let model = this.diagram.model;
    let mems = sup.data._members;
    if (mems) {
        for (let i = 0; i < mems.length; i++) {
            let mdata = mems[i];
            this.walkSubTree(this.diagram.findNodeForData(mdata), coll);
        }
    }
};
// end CustomDraggingTool class
go.Shape.defineFigureGenerator("NoBottomRectangle", function(shape, w, h) {
    // this figure takes one parameter, the size of the corner
    let geo = new go.Geometry();
    // a single figure consisting of straight lines and quarter-circle arcs
    geo.add(new go.PathFigure(0, h*0.87, false)
     .add(new go.PathSegment(go.PathSegment.Line, 0, 0))
     .add(new go.PathSegment(go.PathSegment.Line, w, 0))
     .add(new go.PathSegment(go.PathSegment.Line, w, h*0.87)));
    return geo;
});

function highlightProcessingComponent(e, grp, show) {
    console.log("highlightProcessingComponent", show) 
    if (!grp) return;
    e.handled = true;
    if (show) {
        // cannot depend on the grp.diagram.selection in the case of external drag-and-drops;
        // instead depend on the DraggingTool.draggedParts or .copiedParts
        let tool = grp.diagram.toolManager.draggingTool;
        let map = tool.draggedParts || tool.copiedParts;  // this is a Map
        // now we can check to see if the Group will accept membership of the dragged Parts
        if (grp.canAddMembers(map.toKeySet())) {    
            return;
        }
    }
    grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = null;
    grp.findObject("AREA_STREAM_INPUT_PORT").fill = null;
    grp.findObject("AREA_EVENT_PORT").fill = null;
    grp.findObject("AREA_MODECHANGE_PORT").fill = null;
}
function highlightSourceComponent(e, grp, show) { 
    if (!grp) return;
    e.handled = true;
    if (show) {
        // cannot depend on the grp.diagram.selection in the case of external drag-and-drops;
        // instead depend on the DraggingTool.draggedParts or .copiedParts
        let tool = grp.diagram.toolManager.draggingTool;
        let map = tool.draggedParts || tool.copiedParts;  // this is a Map
        // now we can check to see if the Group will accept membership of the dragged Parts
        if (grp.canAddMembers(map.toKeySet())) {    
            return;
        }
    }
    grp.findObject("AREA_STREAM_OUTPUT_PORT").fill = null;
  };
function highlightSinkComponent(e, grp, show) { 
    if (!grp) return;
    e.handled = true;
    if (show) {
        // cannot depend on the grp.diagram.selection in the case of external drag-and-drops;
        // instead depend on the DraggingTool.draggedParts or .copiedParts
        let tool = grp.diagram.toolManager.draggingTool;
        let map = tool.draggedParts || tool.copiedParts;  // this is a Map
        // now we can check to see if the Group will accept membership of the dragged Parts
        if (grp.canAddMembers(map.toKeySet())) {    
            return;
        }
    }
    grp.findObject("AREA_STREAM_INPUT_PORT").fill = null;
};
function highlightFusionOperator(e, grp, show) { 
    if (!grp) return;
    e.handled = true;
    if (show) {
        // cannot depend on the grp.diagram.selection in the case of external drag-and-drops;
        // instead depend onqqq the DraggingTool.draggedParts or .copiedParts
        let tool = grp.diagram.toolManager.draggingTool;
        let map = tool.draggedParts || tool.copiedParts;  // this is a Map
        // now we can check to see if the Group will accept membership of the dragged Parts
        if (grp.canAddMembers(map.toKeySet())) {    
            return;
        }   
    }
}
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

function update_portType(node, portType) {
    node.name = portType;
} 
function calcPortLocation(data, node) {
    console.log('calcPortLocation')
    if(node.isSelected) return go.Point.parse(data);

    let node_loc = go.Point.parse(data); // go.Point form
    let node_x = node_loc.x;
    let node_y = node_loc.y;
    let grp = node.containingGroup; 

    let grp_loc = grp.location;
    let grp_x = grp_loc.x;
    let grp_y = grp_loc.y;
    let grp_width = grp.actualBounds.width;
    let grp_height = grp.actualBounds.height;
    //let grp_height = grp.actualBounds.height;
    //let node_y_rel = (grp_y-node_y)/(grp_height/2);

    if(node.name === "STREAM_OUTPUT_PORT"
      || node.name === "STREAM_INPUT_PORT")
    {
      if(grp) {
        if(grp_x - node_x > 0) {
          node_x = grp_x - grp_width/2 - 10;
        } else  {
          node_x = grp_x + grp_width/2 - 10;
        } 
      } else {
        // on the background
      }
    }
    else if(node.name === "STREAM_DELEGATION_INPUT_PORT") {
        if(grp) {
            node_x = grp_x - 10;
        }
    }
    else if(node.name === "STREAM_DELEGATION_OUTPUT_PORT") {
        if(grp) {
            node_x = grp_x + grp_width - 10;
        }
    }
    else if(node.name === "EVENT_INPUT_PORT"
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
              node_x = grp_x + 10;
              node_y = grp_y + 5;
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
function finishDrop_component(e, grp) {
    console.log("finishDrop_component");

    let collection = new go.List();
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

    let ok = (grp !== null
        ?  
            grp.addMembers(collection, true) 
        :   
            e.diagram.commandHandler.addTopLevelParts(collection, true));
    if (!ok) e.diagram.currentTool.doCancel();
}
function finishDrop_component_buldUnit(e, grp) {
    console.log("finishDrop_component_buildUnit");
    let ok = (highlighted_factory !== null
        ?  
            highlighted_factory.addMembers(myDiagram.selection, true) 
        : 
            e.diagram.commandHandler.addTopLevelParts(myDiagram.selection, true));
    highlighted_factory = null;
    buildUnit_dragging = false;
    if (!ok) e.diagram.currentTool.doCancel();
}
function unset_buildUnit(e, obj) {
    let node = e.diagram.findNodeForKey(obj.part.key);
    e.diagram.remove(node);
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
            // locationSpot: go.Spot.Center,

            zOrder: 1,
            layerName: "Background",
            
            computesBoundsAfterDrag: false,
            mouseDrop: finishDrop_component,
            handlesDragDropForMembers: true,  // don't need to define handlers on member Nodes and Links.
        }
    ]
}
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
function factoryRelatedNode(value) {
    let condition;
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
        let tool = grp.diagram.toolManager.draggingTool;
        let map = tool.draggedParts || tool.copiedParts;  // this is a Map
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


function createKeyUUID() {
    return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
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
    let currentObjectName = getCurrentObjectName();
    return (currentObjectName === "PROCESSING" ? true : false);
}

function isSourceComponent() {
    let currentObjectName = getCurrentObjectName();
    return (currentObjectName === "SOURCE" ? true : false);
}

function isSinkComponent() {
    let currentObjectName = getCurrentObjectName();
    return (currentObjectName === "SINK" ? true : false);
}
  
function isStreamInputPort() {
    let currentObjectName = getCurrentObjectName();
    return (currentObjectName === "STREAM_INPUT_PORT" ? true : false);
}

function isStreamOutputPort() {
    let currentObjectName = getCurrentObjectName();
    return (currentObjectName === "STREAM_OUTPUT_PORT" ? true : false);
}
function isEventOutputPort() {
    let currentObjectName = getCurrentObjectName();
    return (currentObjectName === "EVENT_OUTPUT_PORT" ? true : false);
}
function isStreamDelegationPort() {
    let currentObjectName = getCurrentObjectName();
    return (currentObjectName === "STREAM_DELEGATION_PORT" ? true : false);
}
  
function isFusionOperator() {
    let currentObjectName = getCurrentObjectName();
    return (currentObjectName === "FUSION" ? true : false);
}
  
function isFactory() {
    let currentObjectName = getCurrentObjectName();
    return (currentObjectName === "FACTORY" ? true : false);
}

function isStreamPort() {
    let currentObjectName = getCurrentObjectName();
    return(currentObjectName === "STREAM_UNTYPED_PORT" || (isStreamInputPort() || isStreamOutputPort() || isStreamDelegationPort()));
}
function isNotStreamPort() {
    let currentObjectName = getCurrentObjectName();
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
function setKeyUUID(model, data) {
    console.log("NEW setKeyUUID");
    let new_name = ""
    let name_count = 1;
    // let new_key = createKeyUUID();
    if(data.category === "processingComponent") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "processing_component_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    else if(data.category === "sourceComponent") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "source_component_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    else if(data.category === "sinkComponent") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "sink_component_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    else if(data.category === "fusionOperator") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "fusion_operator_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    else if(data.category === "factory") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "factory_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    else if(data.category === "buildUnit") {
        new_name = data.text;
    }
    else if(data.category === "streamPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "stream_port_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    else if(data.category === "eventInputPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "event_input_port_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    else if(data.category === "eventOutputPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "event_output_port_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    else if(data.category === "modeChangeInputPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "modechange_input_port_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    else if(data.category === "modeChangeOutputPort") {
        name_count = findNumOfTheCategory(data.category);
        do {
            new_name = "modechange_output_port_" + name_count;
            name_count = name_count + 1;
        }while(globalNodeDataArray.find((node) => node.key == new_name));
    }
    let uuid = '';
    do {
        uuid = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });    
    }while(checkIfUUIDExists(uuid));
    myDiagram.model.setDataProperty(data, "UUID", uuid);
    return new_name;
}
function checkIfUUIDExists(uuid) {
    let exist_flag = false;
    myDiagram.nodes.each(function(node) {
        if(uuid == node.part.data.uuid) {
            exist_flag = true;
            return;
        }
    })
    return exist_flag;
}
function deactivateAllStreamPort(current_diagram) {
    toggleAllStreamPort_sync(current_diagram, false);
}
function deactivateAllEventPort(current_diagram) {
    toggleAllEventPort_sync(current_diagram, false);
}        
function toggleAllEventPort_sync(current_diagram, nextState) {
    current_diagram.nodes.each(function(node) {
      if (node.name === "EVENT_INPUT_PORT" 
          || node.name === "EVENT_DELEGATION_INPUT_PORT"
          || node.name === "EVENT_OUTPUT_PORT"
          || node.name === "EVENT_DELEGATION_OUTPUT_PORT") {
        let shp = node.findObject("EVENT_PORT");             
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
function toggleAllStreamPort(current_diagram, obj) {
    console.log("toggleAllStreamPort()");
    let cur_shp = obj.findObject("STREAM_PORT"); 

    let nextState;

    if(obj.name === "STREAM_INPUT_PORT") {
      nextState = !cur_shp.toLinkable;
    } else if(obj.name === "STREAM_OUTPUT_PORT") {
      nextState = !cur_shp.fromLinkable;
    } else if(obj.name === "STREAM_DELEGATION_INPUT_PORT") {
      nextState = !cur_shp.toLinkable;
    } else if(obj.name === "STREAM_DELEGATION_OUTPUT_PORT") {
      nextState = !cur_shp.fromLinkable;
    } 
    console.log("name?:"+obj.name);
    console.log("nextState?:"+nextState);
    toggleAllStreamPort_sync(current_diagram, nextState);
}
function toggleAllStreamPort_sync(current_diagram, nextState) {
    current_diagram.nodes.each(function(node) {
      if (node.name === "STREAM_INPUT_PORT" 
          || node.name === "STREAM_OUTPUT_PORT"
          || node.name === "STREAM_DELEGATION_INPUT_PORT"
          || node.name === "STREAM_DELEGATION_OUTPUT_PORT") {
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
        } else if(node.name === "STREAM_DELEGATION_INPUT_PORT") {
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
        } else if(node.name === "STREAM_DELEGATION_OUTPUT_PORT") {
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
function finishDrop(e, grp) {      
    console.log("finishDrop")
    let list = new go.List();
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
    
    let ok = (grp !== null
    ? grp.addMembers(grp.diagram.selection, true)
    : e.diagram.commandHandler.addTopLevelParts(e.diagram.selection, true));
    if (!ok) e.diagram.currentTool.doCancel();        
}
function addDefaultPort(part) {
    console.log("addDefaultPort()");
    let defaultPort;
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
function toggleAllModeChangePort(e,obj) {
    let cur_shp = obj.findObject("MODECHANGE_PORT");
    let nextState;

    if(obj.name === "MODECHANGE_INPUT_PORT") {
    nextState = !cur_shp.toLinkable;
    } else if(obj.name === "MODECHANGE_OUTPUT_PORT") {
    nextState = !cur_shp.fromLinkable;
    } else if(obj.name === "MODECHANGE_DELEGATION_INPUT_PORT") {
    nextState = !cur_shp.toLinkable;
    } else if(obj.name === "MODECHANGE_DELEGATION_OUTPUT_PORT") {
    nextState = !cur_shp.fromLinkable;
    }
    toggleAllModeChangePort_sync(myDiagram, nextState);
}

function toggleAllModeChangePort_sync(current_diagram, nextState) {
    current_diagram.nodes.each(function(node) {
    if (node.name === "MODECHANGE_INPUT_PORT" 
        || node.name === "MODECHANGE_DELEGATION_INPUT_PORT"
        || node.name === "MODECHANGE_OUTPUT_PORT"
        || node.name === "MODECHANGE_DELEGATION_OUTPUT_PORT") {
        let shp = node.findObject("MODECHANGE_PORT");             
        if(node.name === "MODECHANGE_INPUT_PORT") {
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
        } else if (node.name === "MODECHANGE_DELEGATION_INPUT_PORT") {
            shp.toSpot = go.Spot.Top;
            shp.fromSpot = go.Spot.Bottom;
            if(nextState === true) { 
                shp.toLinkable = true;
                shp.stroke = "#FF00FF";
                shp.strokeWidth = 2;
            } else {             
                shp.toLinkable = false;
                shp.stroke = "black";
                shp.strokeWidth = 1;
            } 
        } else if(node.name === "MODECHANGE_OUTPUT_PORT") {
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
        } else if (node.name === "MODECHANGE_DELEGATION_OUTPUT_PORT"){
            shp.toSpot = go.Spot.Bottom;
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
        } else {}
    }
    });
}


function findNumOfTheCategory(category) {
    let count = 0;
    myDiagram.nodes.each(node => {
        if(node.part.data.category === category) {
            count = count + 1;
        }
    })
    return count;
}
function setBuildUnit_contextMenu(e, obj) {
    let buildUnit_name;
    while(true){
        buildUnit_name = prompt("Build Unit name is","Insert Build Unit Name");  
        if(buildUnit_name === null) return;
        if(!myDiagram.model.findNodeDataForKey(buildUnit_name)) break;
        alert("Already Exists");
    }
    let buildUnit_data = {
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
            let it = part.memberParts;
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
    let arr = myDiagram.model.nodeDataArray;
    for (let i = 0; i < arr.length; i++) {
        let data = arr[i];
        let buildUnit = data.buildUnit;
        if (buildUnit) {
            let sdata = myDiagram.model.findNodeDataForKey(buildUnit);
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
    let buildUnit_name;
    while(true){
        buildUnit_name = prompt("Build Unit name is","Insert Build Unit Name");  
        if(!myDiagram.model.findNodeDataForKey(buildUnit_name)) break;
        alert("Already Exists");
    }
    let buildUnit_data = {
                category: "buildUnit",  
                text: buildUnit_name,
            };
    myDiagram.model.addNodeData(buildUnit_data);  
    e.diagram.selection.each(function(part) {
        if(part.data.buildUnit)
                return;
        let data = myDiagram.model.findNodeDataForKey(part.key);
        myDiagram_buildUnit_selectionPane.model.setParentKeyForNodeData(data, buildUnit_name);
    });
    let arr = myDiagram.model.nodeDataArray;
    for (let i = 0; i < arr.length; i++) {
        let data = arr[i];
        let buildUnit = data.buildUnit;
        if (buildUnit) {
            let sdata = myDiagram.model.findNodeDataForKey(buildUnit);
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
    let node = e.diagram.findNodeForKey(obj.part.key);
    e.diagram.remove(node);
}
function updateCurrentObject(part) {
    relocatePort(part);
}
function relocatePort(part) {
    console.log("relocatePort()");

    let it_memberParts;
    let memeber_port;
    if(part.name == "SOURCE") {
      
        it_memberParts = part.memberParts;
        memeber_port = it_memberParts.first()

        memeber_port.location = new go.Point(part.location.x+30, part.location.y-part.findObject("SHAPE").height/2);
        

    } else if(part.name == "SINK") {
        it_memberParts = part.memberParts;
        memeber_port = it_memberParts.first()

        memeber_port.location = new go.Point(part.location.x-50, part.location.y-part.findObject("SHAPE").height/2);

    } else if(part.name == "FUSION") {
        it_memberParts = part.memberParts;

        it_memberParts.each(function(node){
            if(node.name === "STREAM_OUTPUT_PORT") memeber_port = node;
        });
        // memeber_port.location = new go.Point(part.location.x+30, part.location.y-part.findObject("SHAPE").width/2+15);
    } 
}

const test_data = {
    "class": "GraphLinksModel", 
    "linkDataArray": [
        {
            "from": "stream_port_1", 
            "key": -1, 
            "to": "stream_port_9"
        }, 
        {
            "from": "stream_port_0", 
            "key": -2, 
            "to": "stream_port_5"
        }, 
        {
            "from": "stream_port_6", 
            "key": -3, 
            "mode": "Run", 
            "to": "stream_port_7"
        }, 
        {
            "from": "stream_port_0", 
            "key": -4, 
            "to": "stream_port_8"
        }, 
        {
            "from": "stream_port_2", 
            "key": -5, 
            "mode": "Run", 
            "to": "stream_port_10"
        }, 
        {
            "from": "stream_port_21", 
            "key": -6, 
            "mode": "Run", 
            "to": "stream_port_20"
        }, 
        {
            "from": "stream_port_18", 
            "key": -7, 
            "mode": "Run", 
            "to": "stream_port_19"
        }, 
        {
            "from": "stream_port_3", 
            "key": -8, 
            "mode": "Run", 
            "to": "stream_port_17"
        }, 
        {
            "from": "stream_port_11", 
            "key": -9, 
            "mode": "Run", 
            "to": "stream_port_14"
        }, 
        {
            "from": "stream_port_12", 
            "key": -10, 
            "mode": "Run", 
            "to": "stream_port_15"
        }, 
        {
            "from": "stream_port_13", 
            "key": -11, 
            "mode": "Run", 
            "to": "stream_port_16"
        }, 
        {
            "from": "stream_port_4", 
            "key": -12, 
            "mode": "Run", 
            "to": "stream_port_22"
        }, 
        {
            "from": "stream_port_23", 
            "key": -13, 
            "mode": "Run", 
            "to": "stream_port_24"
        }, 
        {
            "from": "stream_port_25", 
            "key": -14, 
            "to": "stream_port_28"
        }, 
        {
            "from": "stream_port_26", 
            "key": -15, 
            "to": "stream_port_29"
        }, 
        {
            "from": "stream_port_27", 
            "key": -16, 
            "mode": "Run", 
            "to": "stream_port_30"
        }, 
        {
            "from": "stream_port_31", 
            "key": -17, 
            "mode": "Run", 
            "to": "stream_port_32"
        }, 
        {
            "from": "stream_port_35", 
            "key": -18, 
            "mode": "Run", 
            "to": "stream_port_36"
        }, 
        {
            "from": "stream_port_33", 
            "key": -19, 
            "mode": "Run", 
            "to": "stream_port_34"
        }, 
        {
            "from": "stream_port_38", 
            "key": -20, 
            "mode": "Run", 
            "to": "stream_port_37"
        }
    ], 
    "linkKeyProperty": "key", 
    "nodeDataArray": [
        {
            "HEIGHT": 556, 
            "UUID": "537076e1-dbe5-2927-c592-f0bce3936e07", 
            "WIDTH": 1774, 
            "buildUnit": "", 
            "category": "factory", 
            "isGroup": true, 
            "key": "perception_factory", 
            "loc": "-60 -275", 
            "mode_configuration": {
                "initial_mode": "Run", 
                "mode_list": [
                    {
                        "events": [
                            {
                                "name": "event_1", 
                                "next_mode": "Run", 
                                "output_internal_data_items": false
                            }
                        ], 
                        "name": "Run"
                    }, 
                    {
                        "events": [
                            {
                                "name": "event_1", 
                                "next_mode": "Wait", 
                                "output_internal_data_items": false
                            }
                        ], 
                        "name": "Wait"
                    }
                ]
            }
        }, 
        {
            "UUID": "539e7d68-cca2-93b7-30ed-adbee037651c", 
            "buildUnit": "", 
            "category": "sourceComponent", 
            "haveOutputPort": false, 
            "isGroup": true, 
            "key": "camera_rgb", 
            "loc": "-210 -110"
        }, 
        {
            "Channel": "image_rgb", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "784ce91f-4ad7-c387-d66a-f764eac0a719", 
            "category": "streamPort", 
            "group": "camera_rgb", 
            "key": "stream_port_0", 
            "loc": "-148.25 -140", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "b29015a1-b787-1b70-f5ff-ccd0d0836cc6", 
            "buildUnit": "", 
            "category": "sourceComponent", 
            "haveOutputPort": false, 
            "isGroup": true, 
            "key": "camera_depth", 
            "loc": "-210 90"
        }, 
        {
            "Channel": "image_depth", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "300ec323-a2a8-4565-a6dc-6b086580f5da", 
            "category": "streamPort", 
            "group": "camera_depth", 
            "key": "stream_port_1", 
            "loc": "-148.25 60", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "HEIGHT": 100, 
            "UUID": "4b2e8c77-36e6-8f8a-9640-5411b5b6200d", 
            "WIDTH": 104, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "perception_factory", 
            "isGroup": true, 
            "key": "semantic_segmentation", 
            "loc": "30 -100", 
            "mode": "Run"
        }, 
        {
            "HEIGHT": 355, 
            "UUID": "568a29c4-e881-91ed-2cc1-68c81fad344b", 
            "WIDTH": 118, 
            "buildUnit": "", 
            "category": "fusionOperator", 
            "fusionRule": {
                "correlation": "1000", 
                "mandatory_ports": [
                    "stream_port_7", 
                    "stream_port_8", 
                    "stream_port_9"
                ], 
                "optional_ports": [], 
                "threshold": "0"
            }, 
            "group": "perception_factory", 
            "haveOutputPort": true, 
            "isGroup": true, 
            "key": "fusion_operator_0", 
            "loc": "240 0", 
            "mode": "Run"
        }, 
        {
            "Channel": "fusion_0", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "d585d0bb-e78d-2ddf-6ae2-cd13b09e071c", 
            "category": "streamPort", 
            "group": "fusion_operator_0", 
            "key": "stream_port_2", 
            "loc": "290.75 -37.86674804687499", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "20a47390-cf46-668c-536e-2180f727e71e", 
            "buildUnit": "", 
            "category": "modeChangeInputPort", 
            "group": "perception_factory", 
            "key": "modechange_input_port_0", 
            "loc": "-47 -269.3781821193426"
        }, 
        {
            "HEIGHT": 231, 
            "UUID": "2cfb04b2-c5ab-1ea5-f747-3383f600526b", 
            "WIDTH": 231, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "perception_factory", 
            "isGroup": true, 
            "key": "bitwise_and_crop", 
            "loc": "480 0", 
            "mode": "Run"
        }, 
        {
            "HEIGHT": 181, 
            "UUID": "aa655984-d207-f728-fe5a-0fcffeeb71a7", 
            "WIDTH": 70, 
            "buildUnit": "", 
            "category": "fusionOperator", 
            "fusionRule": {
                "correlation": "100", 
                "mandatory_ports": [
                    "stream_port_14", 
                    "stream_port_15"
                ], 
                "optional_ports": [], 
                "threshold": "0"
            }, 
            "group": "perception_factory", 
            "haveOutputPort": true, 
            "isGroup": true, 
            "key": "fusion_operator_1", 
            "loc": "800 -50", 
            "mode": "Run"
        }, 
        {
            "Channel": "fusion_1", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "91b06a56-2dfe-eaa9-8285-7751e66b6624", 
            "category": "streamPort", 
            "group": "fusion_operator_1", 
            "key": "stream_port_3", 
            "loc": "826.75 -87.86674804687505", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "HEIGHT": 117, 
            "UUID": "6ceace68-54be-1a44-5452-1e22d95d7a02", 
            "WIDTH": 121, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "perception_factory", 
            "isGroup": true, 
            "key": "pointcloud_feature_extraction", 
            "loc": "820 140", 
            "mode": "Run"
        }, 
        {
            "HEIGHT": 129, 
            "UUID": "d9db005f-6198-e1a9-4fb9-4d96aae96ac1", 
            "WIDTH": 135, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "perception_factory", 
            "isGroup": true, 
            "key": "rgb_feature_extraction", 
            "loc": "970 -60", 
            "mode": "Run"
        }, 
        {
            "HEIGHT": 360, 
            "UUID": "62f9f9ea-3700-f379-d947-50ca5a16a841", 
            "WIDTH": 115, 
            "buildUnit": "", 
            "category": "fusionOperator", 
            "fusionRule": {
                "correlation": "100", 
                "mandatory_ports": [
                    "stream_port_19", 
                    "stream_port_20"
                ], 
                "optional_ports": [], 
                "threshold": "0"
            }, 
            "group": "perception_factory", 
            "haveOutputPort": true, 
            "isGroup": true, 
            "key": "fusion_operator_2", 
            "loc": "1200 10", 
            "mode": "Run"
        }, 
        {
            "Channel": "fusion_2", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "0ba225f8-43c3-2d63-90d4-8d80fdac9267", 
            "category": "streamPort", 
            "group": "fusion_operator_2", 
            "key": "stream_port_4", 
            "loc": "1249.25 -27.86674804687499", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "HEIGHT": 100, 
            "UUID": "1529b6f4-92b3-3c0c-2cd7-f9c22a9558f8", 
            "WIDTH": 100, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "perception_factory", 
            "isGroup": true, 
            "key": "pose_estimation", 
            "loc": "1410 0", 
            "mode": "Run"
        }, 
        {
            "HEIGHT": 100, 
            "UUID": "99516633-b21f-be40-8fe3-6231e1212cce", 
            "WIDTH": 100, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "perception_factory", 
            "isGroup": true, 
            "key": "pose_refinement", 
            "loc": "1610 0", 
            "mode": "Run"
        }, 
        {
            "UUID": "f4b92aa5-f8b7-626e-8657-7cb0acc2b033", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "semantic_segmentation", 
            "key": "stream_port_5", 
            "loc": "-33.75 -140", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "Channel": "image_mask", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "c710496f-7b47-1ea2-c097-d6e5c55025b3", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "semantic_segmentation", 
            "key": "stream_port_6", 
            "loc": "73.75 -140", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "eee46a27-de2b-3ec9-4f82-00d249054df7", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "fusion_operator_0", 
            "key": "stream_port_7", 
            "loc": "169.25 -140", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "UUID": "f5a0ee92-3a30-8fc9-23c9-ca21bdbd53bb", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "fusion_operator_0", 
            "key": "stream_port_8", 
            "loc": "169.25 -40", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "UUID": "1583b630-b522-278a-b26d-7acd3451156c", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "fusion_operator_0", 
            "key": "stream_port_9", 
            "loc": "169.25 60", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "UUID": "37c2369c-09d1-dc0f-fb0d-d8197bf16348", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "bitwise_and_crop", 
            "key": "stream_port_10", 
            "loc": "352.75 -40", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "Channel": "image_mask_cropped", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "63a1055f-bedd-7ab0-f3e6-3f3cd9877042", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "bitwise_and_crop", 
            "key": "stream_port_11", 
            "loc": "587.25 -110", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "Channel": "image_rgb_cropped", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "2839f383-670a-5f88-3d39-d07cb968b40f", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "bitwise_and_crop", 
            "key": "stream_port_12", 
            "loc": "587.25 -40", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "Channel": "image_depth_cropped", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "17751012-a46c-c59b-e0d1-d149e30e009d", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "bitwise_and_crop", 
            "key": "stream_port_13", 
            "loc": "587.25 30", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "1333ab2b-d498-82e3-f1df-d55f05b6f6ea", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "fusion_operator_1", 
            "key": "stream_port_14", 
            "loc": "753.25 -110", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "UUID": "1a553c4e-f98b-5232-14ad-4ce80b6d90d7", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "fusion_operator_1", 
            "key": "stream_port_15", 
            "loc": "753.25 -40", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "UUID": "fb190a61-e235-d84c-7752-e89899189cfb", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "pointcloud_feature_extraction", 
            "key": "stream_port_16", 
            "loc": "752.75 100", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "UUID": "828ae485-8a93-9d8f-d9c3-3199e48aac75", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "rgb_feature_extraction", 
            "key": "stream_port_17", 
            "loc": "890.75 -90", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "Channel": "feature_rgb", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "b1089db4-1405-f16a-dc94-2357a50b6685", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "rgb_feature_extraction", 
            "key": "stream_port_18", 
            "loc": "1029.25 -90", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "c7de302f-26cf-7b1d-e804-5616d0944034", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "fusion_operator_2", 
            "key": "stream_port_19", 
            "loc": "1130.75 -90", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "UUID": "6cd814df-1359-9026-d0ac-ec16fad077f7", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "fusion_operator_2", 
            "key": "stream_port_20", 
            "loc": "1130.75 50", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "Channel": "feature_pointcloud", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "b17e8753-b28b-ff67-93e9-35b6b43811b7", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "pointcloud_feature_extraction", 
            "key": "stream_port_21", 
            "loc": "867.25 100", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "e8f986f5-7024-38bd-f58c-2327c32e90d0", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "pose_estimation", 
            "key": "stream_port_22", 
            "loc": "1348.25 -30", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "Channel": "pose", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "86605ba6-409e-ba73-348e-f57fb16421ca", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "pose_estimation", 
            "key": "stream_port_23", 
            "loc": "1451.75 -30", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "431dd520-8367-c52c-e85c-812b4996f7ba", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "pose_refinement", 
            "key": "stream_port_24", 
            "loc": "1548.25 -30", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "Channel": "pose_refined", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "18da9408-4fbe-65d0-f9f0-1fbb45a50be7", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "pose_refinement", 
            "key": "stream_port_25", 
            "loc": "1651.75 -30", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "1236d76b-0028-5697-9704-fb08cb6aa36f", 
            "buildUnit": "", 
            "category": "sourceComponent", 
            "haveOutputPort": false, 
            "isGroup": true, 
            "key": "robot_state_reader", 
            "loc": "1590 440"
        }, 
        {
            "Channel": "state_robot", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "82ad6d7a-5179-98ae-8d7a-bae0df5452ee", 
            "category": "streamPort", 
            "group": "robot_state_reader", 
            "key": "stream_port_26", 
            "loc": "1651.75 410", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "HEIGHT": 557, 
            "UUID": "00ac3d70-142c-a2b4-aed7-c673d74980bf", 
            "WIDTH": 1363, 
            "buildUnit": "", 
            "category": "factory", 
            "isGroup": true, 
            "key": "planning_factory", 
            "loc": "1853 -275", 
            "mode_configuration": {
                "initial_mode": "Run", 
                "mode_list": [
                    {
                        "events": [
                            {
                                "name": "event_1", 
                                "next_mode": "Run", 
                                "output_internal_data_items": false
                            }
                        ], 
                        "name": "Run"
                    }, 
                    {
                        "events": [
                            {
                                "name": "event_1", 
                                "next_mode": "Wait", 
                                "output_internal_data_items": false
                            }
                        ], 
                        "name": "Wait"
                    }
                ]
            }
        }, 
        {
            "HEIGHT": 349, 
            "UUID": "f84b0977-6d87-23c5-2cfc-73e2843b5994", 
            "WIDTH": 115.99999999999999, 
            "buildUnit": "", 
            "category": "fusionOperator", 
            "fusionRule": {
                "correlation": "100", 
                "mandatory_ports": [
                    "stream_port_28", 
                    "stream_port_29"
                ], 
                "optional_ports": [], 
                "threshold": "0"
            }, 
            "group": "planning_factory", 
            "haveOutputPort": true, 
            "isGroup": true, 
            "key": "fusion_operator_3", 
            "loc": "1990 -20", 
            "mode": "Run"
        }, 
        {
            "Channel": "fusion_3", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "86349e03-32ed-6b78-d2eb-e4af71603263", 
            "category": "streamPort", 
            "group": "fusion_operator_3", 
            "key": "stream_port_27", 
            "loc": "2039.75 -57.86674804687499", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "b4ea9e8e-fdeb-6462-b9ec-33b798fe7e9e", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "fusion_operator_3", 
            "key": "stream_port_28", 
            "loc": "1920.25 -140", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "UUID": "56fc45d7-dc4a-f901-8aa8-8f3804121675", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "fusion_operator_3", 
            "key": "stream_port_29", 
            "loc": "1920.25 20", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "HEIGHT": 196, 
            "UUID": "d2a3ef5d-eb48-8502-804f-2fbc6f68ca20", 
            "WIDTH": 202, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "planning_factory", 
            "isGroup": true, 
            "key": "decision_making", 
            "loc": "2250 -30", 
            "mode": "Run"
        }, 
        {
            "UUID": "db98fa73-43aa-68f5-4e62-baf3c01cd39e", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "decision_making", 
            "key": "stream_port_30", 
            "loc": "2137.25 -60", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "HEIGHT": 135, 
            "UUID": "881b8193-a51c-3ee8-8376-ade18bb1ede5", 
            "WIDTH": 142, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "planning_factory", 
            "isGroup": true, 
            "key": "waypoints_generation", 
            "loc": "2560 -70", 
            "mode": "Run"
        }, 
        {
            "Channel": "pose_goal", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "894350c9-cb99-49f9-edb9-c5e5a53e98d1", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "decision_making", 
            "key": "stream_port_31", 
            "loc": "2342.75 -110", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "545300de-a9a5-acc8-a924-ffa10c623aca", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "waypoints_generation", 
            "key": "stream_port_32", 
            "loc": "2477.25 -110", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "HEIGHT": 134, 
            "UUID": "1540d964-9ea1-3a48-848e-0a991754780a", 
            "WIDTH": 138, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "planning_factory", 
            "isGroup": true, 
            "key": "Interpolation", 
            "loc": "2790 -70", 
            "mode": "Run"
        }, 
        {
            "Channel": "waypoints", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "543e800e-3412-dee1-582f-466d0096c6bb", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "waypoints_generation", 
            "key": "stream_port_33", 
            "loc": "2622.75 -110", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "c2e69e1f-3ebc-bde3-134c-30ac7f8330a1", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "Interpolation", 
            "key": "stream_port_34", 
            "loc": "2709.25 -110", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "Channel": "waypoints_interpolated", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "f8373168-3136-6147-1d30-76f9ba435644", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "Interpolation", 
            "key": "stream_port_35", 
            "loc": "2850.75 -110", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "HEIGHT": 134, 
            "UUID": "e0c4916d-7337-1191-60eb-63a0ae420559", 
            "WIDTH": 140, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "planning_factory", 
            "isGroup": true, 
            "key": "joint_commander", 
            "loc": "3080 -70", 
            "mode": "Run"
        }, 
        {
            "HEIGHT": 133, 
            "UUID": "0880fc20-53a8-03cd-e7c4-43f363ed2eb9", 
            "WIDTH": 137, 
            "buildUnit": "", 
            "category": "processingComponent", 
            "group": "planning_factory", 
            "isGroup": true, 
            "key": "gripper_commander", 
            "loc": "3080 150", 
            "mode": "Run"
        }, 
        {
            "UUID": "c6c64601-8284-1395-5542-d5675e2cf959", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "joint_commander", 
            "key": "stream_port_36", 
            "loc": "2998.25 -110", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "UUID": "91c491bd-f0cc-5617-daae-9a3104fdd241", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "gripper_commander", 
            "key": "stream_port_37", 
            "loc": "2999.75 110", 
            "port_type": "STREAM_INPUT_PORT"
        }, 
        {
            "Channel": "grip_command", 
            "MessageType": "Bool", 
            "Rate": 0, 
            "UUID": "8233a2bd-3599-a9de-943c-e7eaf0ef015f", 
            "buildUnit": "", 
            "category": "streamPort", 
            "group": "decision_making", 
            "key": "stream_port_38", 
            "loc": "2342.75 -10", 
            "port_type": "STREAM_OUTPUT_PORT"
        }, 
        {
            "UUID": "4a82f028-788d-70ac-5b76-1b15267b56c3", 
            "buildUnit": "", 
            "category": "modeChangeInputPort", 
            "group": "planning_factory", 
            "key": "modechange_input_port_1", 
            "loc": "1866 -269.3781821193426"
        }
    ], 
    "sourceInfo": {
        "name": "pose_estimation_2", 
        "path": "/home/rtos_server/dev_ws"
    }
}