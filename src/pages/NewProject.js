import {Button, Grid, Link, makeStyles, TextField} from '@material-ui/core';
import React, {useEffect, useRef, useState} from 'react';
import {useHistory} from 'react-router-dom';
import Header from '../components/Common/Header';
import Title from '../components/Common/Title';
import {request} from '../utils/axios';

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        flexDirection :'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paper: {
        width: '477px',
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: '80px',
        paddingRight: '80px',
        paddingTop: '35px',
        paddingBottom: '35px',
        border: 'solid 3px #ededed'
    },
    headerSpace: {
        width: '100%',
        height: '150px',
    },
    form: {
        paddingTop: '50px',
    },
    textField: {
    },
    button: {
        width: '109px',
        height: '52px',
        marginLeft: '16px',
        fontSize: '13px',
    },
    buttonSubmit: {
        
    },
    descField: {
        marginTop: '20px',
        padding: theme.spacing(1),
    }
}))
const DUPLICATION_CHECK_INIT = 0
const DUPLICATION_CHECK_RETRY = 1
const DUPLICATION_CHECK_DONE = 2
const pattern_name = /[0-9]|[a-z]|[A-Z]|[가-힣]|[_-]/g;
const pattern_special = /[\{\}\[\]\/?.,;:|\)*~`!^\+<>@\#$%&\\\=\(\'\"\s]/;
const getByte = (str) => {
    return str
        .split('') 
        .map(s => s.charCodeAt(0))
        .reduce((prev, c) => (prev + ((c === 10) ? 2 : ((c >> 7) ? 2 : 1))), 0); // 계산식에 관한 설명은 위 블로그에 있습니다.
}
const NewProject = () => {
    const classes = useStyles();
    const history = useHistory();
    const [isSticky, setSticky] = useState(false);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [duplName, setDuplName] = useState(DUPLICATION_CHECK_INIT);
    const ref = useRef(null);
    const handleScroll = () => {
        if (ref.current) {
        setSticky(ref.current.getBoundingClientRect().top <= -50);
        }
    };
    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', () => handleScroll);
        };
    }, [])
    const submit = async () => {
        try {
            const res = await request('post', '/project/create/', {
                name: name,
                description: desc
            })
            if(res.status === 201) {
                history.push('/edit_schema', {project_id: res.data.project_id, is_new: true})
            } else if(res.status === 226) {
                setDuplName(DUPLICATION_CHECK_RETRY)
            } 
            else{
                alert('Unknown error')
            }
            
        } catch(err) {
            alert('Unknown error')
        }
    }
    return (
        <div className={classes.root}>
            <Header sticky={isSticky}/>
            <div className={classes.headerSpace}/>
            <div className={classes.paper}>
                <Title>
                    Create a New Project
                </Title>
                <div className={classes.form}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                    
                    <TextField
                        className={classes.textField}
                        autoComplete="name"
                        name="desc"
                        variant="outlined"
                        required
                        fullWidth
                        id="name"
                        label="Project Name"
                        autoFocus
                        InputLabelProps={{
                            shrink: true,
                          }}
                        error={duplName == DUPLICATION_CHECK_RETRY}
                        placeholder="Project Name"
                        onChange = {(e) => {
                            if(getByte(e.target.value) <= 30 && !pattern_special.test(e.target.value)) {
                                e.target.value =  e.target.value
                                setName(e.target.value)
                                setDuplName(DUPLICATION_CHECK_INIT)
                            }
                            else {
                                e.target.value = name
                            }
                        }}
                    />

                    </Grid>
                    <TextField
                        className={classes.descField}
                        autoComplete="name"
                        name="name"
                        variant="outlined"
                        required
                        fullWidth
                        id="name"
                        label="Project Description"
                        autoFocus
                        multiline={true}
                        InputLabelProps={{
                            shrink: true,
                          }}
                        placeholder="Write Project Description"
                        rows={10}
                        onChange = {(e) => {
                            if(getByte(e.target.value) <= 500) {
                                e.target.value =  e.target.value;
                                setDesc(e.target.value);
                            }
                            else {
                                e.target.value = desc
                            }
                        }}
                    />
                    <Grid item xs={12}>
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            className={classes.buttonSubmit}
                            disabled={name === '' || desc === '' || duplName === DUPLICATION_CHECK_DONE}
                            onClick={submit}
                        >
                            Draw a Schematic
                        </Button>  
                    </Grid>
                </Grid>
                </div>
            </div>
        </div>
    );
};

export default NewProject;