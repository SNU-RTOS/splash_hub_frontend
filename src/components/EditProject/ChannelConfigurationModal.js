import {Button, FormControl, InputLabel, makeStyles, MenuItem, Select, TextField} from '@material-ui/core';
import React, {useEffect, useState} from 'react';

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
        fontSize: '20px',
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
    const [type, setType] = useState('Bool');
    const [rate, setRate] = useState(0);
    useEffect(() => {
        if(props.channel) {
            if(props.channel.Channel) {
                setChannel(props.channel.Channel);
            }
            if(props.channel.MessageType) {
                setType(props.channel.MessageType);
            }
            if(props.channel.Rate) {
                setRate(props.channel.Rate);
            }
        }
    }, props)
    const handleSelect = (e) => {
        setType(e.target.value)
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
                <InputLabel id="select-helper-label">Data type</InputLabel>
                <Select value={type} defaultValue={"Bool"} className={classes.select} onChange={handleSelect} label="Data type" labelId="select-helper-label">
                    <MenuItem value="Bool">Bool</MenuItem>
                    <MenuItem value="Byte">Byte</MenuItem>
                    <MenuItem value="ByteMultiArray">ByteMultiArray</MenuItem>
                    <MenuItem value="Char">Char</MenuItem>
                    <MenuItem value="ColorRGBA">ColorRGBA</MenuItem>
                    <MenuItem value="Duration">Duration</MenuItem>
                    <MenuItem value="Empty">Empty</MenuItem>
                    <MenuItem value="Float32">Float32</MenuItem>
                    <MenuItem value="Float32MultiArray">Float32MultiArray</MenuItem>
                    <MenuItem value="Float64">Float64</MenuItem>
                    <MenuItem value="Float64MultiArray">Float64MultiArray</MenuItem>
                    <MenuItem value="Header">Header</MenuItem>
                    <MenuItem value="Int16">Int16</MenuItem>
                    <MenuItem value="Int16MultiArray">Int16MultiArray</MenuItem>
                    <MenuItem value="Int32">Int32</MenuItem>
                    <MenuItem value="Int32MultiArray">Int32MultiArray</MenuItem>
                    <MenuItem value="Int64">Int64</MenuItem>
                    <MenuItem value="Int64MultiArray">Int64MultiArray</MenuItem>
                    <MenuItem value="Int8">Int8</MenuItem>
                    <MenuItem value="Int8MultiArray">Int8MultiArray</MenuItem>
                    <MenuItem value="MultiArrayDimension">MultiArrayDimension</MenuItem>
                    <MenuItem value="MultiArrayLayout">MultiArrayLayout</MenuItem>
                    <MenuItem value="String">String</MenuItem>
                    <MenuItem value="Time">Time</MenuItem>
                    <MenuItem value="UInt16">UInt16</MenuItem>
                    <MenuItem value="UInt16MultiArray">UInt16MultiArray</MenuItem>
                    <MenuItem value="UInt32">UInt32</MenuItem>
                    <MenuItem value="UInt32MultiArray">UInt32MultiArray</MenuItem>
                    <MenuItem value="UInt64">UInt64</MenuItem>
                    <MenuItem value="UInt64MultiArray">UInt64MultiArray</MenuItem>
                    <MenuItem value="UInt8">UInt8</MenuItem>
                    <MenuItem value="UInt8MultiArray">UInt8MultiArray</MenuItem>
                </Select>
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
            <Button variant="contained" color="primary" className={classes.button} onClick={() => props.onConfirm(channel, type, rate)} disabled={channel.length === 0 || !type}>
                Confirm
            </Button>
        </div>
    );
};

export default ChannelConfigurationModal;