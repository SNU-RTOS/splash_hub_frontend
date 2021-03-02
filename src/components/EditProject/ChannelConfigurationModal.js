import {Button, FormControl, InputLabel, makeStyles, MenuItem, Select, TextField, Modal} from '@material-ui/core';
import React, {useEffect, useState} from 'react';
import CustomMessageModal from './CustomMessageModal';
import message_pkgs from './message_pkgs';
import { request } from '../../utils/axios';
import EditIcon from '@material-ui/icons/Edit';
import { isCompositeComponent } from 'react-dom/test-utils';

const useStyles = makeStyles((theme) => ({
    root: {
        position: 'absolute',
        top: '100px',
        left: 'calc(50% - 200px)',
        width: '300px',
        height: '300px',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        justifyContent: 'space-between',
        fontSize: '15px',
    },
    textField: {
    },
    select: {
    },
    button: {
        textTransform: 'none',
    }
}))
const pattern_channel = /[\{\}\[\]\/?.,;:|\)*~`!^\-+<>@\#$%&\\\=\(\'\"\s]/;
const pattern_num = /^[0-9]*$/;

const ChannelConfigurationModal = (props) => {
    const classes = useStyles()
    
    const [channel, setChannel] = useState('');
    const [pkg, setPkg] = useState('std_msgs')
    const [type, setType] = useState('Bool');
    const [rate, setRate] = useState(0);
    const [isNew, setIsNew] = useState(false)
    const [customMessageIdSelected, setCustomMessageIdSelected] = useState(null)
    const [customMessages, setCustomMessages] = useState([]);
    const [customMessageData, setCustomMessageData] = useState([])
    const [customMessageTitle, setCustomMessageTitle] = useState('')
    const [customMessageModalOpen, setCustomMessageModalOpen] = useState(false);
    useEffect(() => {
        if(props.channel) {
            if(props.channel.Channel) {
                setChannel(props.channel.Channel);
            }
            if(props.channel.MessagePkg) {
                setPkg(props.channel.MessagePkg)
            }
            if(props.channel.MessageType) {
                setType(props.channel.MessageType);
            }
            if(props.channel.Rate) {
                setRate(props.channel.Rate);
            }
        }
    }, props)
    useEffect(() => {
        if(pkg === 'custom_msgs') {
            requestCustomMessages()
        }
    }, [pkg])
    const requestCustomMessages = async () => {
        try {
            const response = await request('get', '/project/custom_message/list/')
            if(response.status === 200) {
                setCustomMessages(response.data)
            }
        } catch(err) { 
            console.log(err)
        }
    }
    const requestLoadCustomMessage = async (id) => {
        try {
            const response = await request('get', '/project/custom_message/' + id + '/')
            if(response.status === 200) {
                setCustomMessageData(response.data.fields)
            }
        } catch(err) { 
            console.log(err)
        }
    }
    const requestSaveCustomMessage = async () => {
        try {
            let response;
            if(customMessageIdSelected > 0) {
                response = await request('put', '/project/custom_message/' + customMessageIdSelected + '/', {name: customMessageTitle, fields:JSON.stringify(customMessageData)})
            }else {
                response = await request("post", '/project/custom_message/new/', {name: customMessageTitle, fields:JSON.stringify(customMessageData)})
            }
            if(response.status === 201) { 
                setType(customMessageTitle)
                requestCustomMessages()
            }
        } catch(err) { 
            console.log(err)
        }
    }
    const handleSelectPkg = (e) => {
        setPkg(e.target.value)
        setType(message_pkgs.find((item) => item.name === e.target.value).messages[0])
    }
    const handleSelectMsg = (e) => {
        if(pkg === "custom_msgs" && e.target.value === "Add New Custom Message") {
            setIsNew(true)
            setCustomMessageModalOpen(true)
            setCustomMessageData([])
            setCustomMessageIdSelected(-1)
            setCustomMessageTitle('')
            return
        }
        else if(pkg === "custom_msgs") {
            setIsNew(false)
            const id = customMessages.find(item => item.name === e.target.value).id
            const title = customMessages.find(item => item.name === e.target.value).name
            setCustomMessageIdSelected(id)
            requestLoadCustomMessage(id)
            setCustomMessageTitle(title)
        }
        setType(e.target.value)
        
    }
    const handleCloseCustomMessageModal = () => {
        setCustomMessageModalOpen(false)
        setIsNew(false)
    }
    const handleConfirmCustomMessageModal = (data) => {
        requestSaveCustomMessage()
        setCustomMessageModalOpen(false)
        setIsNew(false)
    }
    const handleDeleteCustomMessageModal = () => {
        setCustomMessageModalOpen(false)
        setCustomMessageData([])
        setType('')
        setIsNew(false)
    }
    return (
        <div className={classes.root}>
            Channel Configuration
            <TextField 
            required
            label="Channel name"
            variant="outlined"
            className={classes.textField}
            value={channel}
            onChange={(e) => {
                if(!pattern_channel.test(e.target.value)) {
                    setChannel(e.target.value)
                } 
                else {
                    e.target.value = channel;
                }
            }}
            fullWidth
            />
            <FormControl required className={classes.formControl} fullWidth variant="outlined">
                <InputLabel id="select-helper-label-package">Message Package</InputLabel>
                <Select value={pkg} defaultValue={message_pkgs[0]} className={classes.select} onChange={handleSelectPkg} label="Message Package" labelId="select-helper-label-package">
                    {message_pkgs.map((item, id) => <MenuItem key={id} value={item.name}>{item.name}</MenuItem>)}
                </Select>
            </FormControl>
            <FormControl required className={classes.formControl} fullWidth variant="outlined">
                <InputLabel id="select-helper-label-messeage">Message</InputLabel>
                {pkg ? <Select value={type} defaultValue={message_pkgs.find((item) => item.name === pkg).messages[0]} className={classes.select} onChange={handleSelectMsg} label="Message" labelId="select-helper-label-message">
                    {message_pkgs.find((item) => item.name === pkg).messages
                        .map((item, id) => 
                        <MenuItem key={id} value={item}>
                            {item}
                        </MenuItem>)
                    }
                    {pkg === 'custom_msgs' ? 
                    customMessages.map((item) => 
                        <MenuItem key={item.id} value={item.name}>
                            {item.name}
                            {type === item.name ? <EditIcon style={{position: 'absolute', right: 30}} onClick={(e) => {setCustomMessageModalOpen(true)}}/> : null}
                        </MenuItem>) 
                        : null}
                </Select> : null}
            </FormControl>
            <TextField  
            label="Rate"
            variant="outlined"
            className={classes.textField}
            fullWidth
            value={rate}
            onChange={(e) => {
                if(pattern_num.test(e.target.value)) {
                    setRate(e.target.value)
                }
                else {
                    e.target.value = rate;
                }
            }}
            />
            <Button variant="contained" color="primary" className={classes.button} onClick={() => props.onConfirm(channel, pkg, type, rate)} disabled={channel.length === 0 || !type}>
                Confirm
            </Button>
            <Modal open={customMessageModalOpen} onClose={handleCloseCustomMessageModal}>
                <CustomMessageModal id={customMessageIdSelected} title={customMessageTitle} setTitle={setCustomMessageTitle} data={customMessageData} setData={setCustomMessageData} onConfirm={handleConfirmCustomMessageModal} onDelete={handleDeleteCustomMessageModal} customMessages={customMessages}/>
            </Modal>
        </div>
    );
};

export default ChannelConfigurationModal;