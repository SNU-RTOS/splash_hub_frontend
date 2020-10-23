
import React, {useEffect, useState} from 'react';
import Link from '@material-ui/core/Link';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Title from '../Common/Title';

function createData(id, name, date) {
  return { id, name, date};
}

// const rows = [
//   createData(0, 'LKAS', '16 September, 2020'),
//   createData(1, 'ACC', '22 September, 2020'),
//   createData(2, 'Drone autopilot', '23 September, 2020'),
//   createData(3, 'LKAS2', '25 September, 2020'),
//   createData(4, 'Hyundai robotics', '28 September, 2020'),
// ];

const useStyles = makeStyles((theme) => ({
  seeMore: {
    marginTop: theme.spacing(3),
  },
}));
const MONTH = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const ItemList = (props) => {
  const classes = useStyles();
  const [rows, setRows] = useState([]);
  useEffect(()=> {
    if(props.data) {
        const array = []
        props.data.map(data => {
            const isodate = new Date(data.edited_on)
            const date = isodate.getDate() + ' ' + MONTH[isodate.getMonth()] + ', ' + isodate.getFullYear()
            array.push(createData(data.id, data.name, date))
        })
        setRows(array)
    }
  }, [props.data])
  return (
    <React.Fragment>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="right">Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                  <Link href={`/project/${row.id}`}>
                  {row.name}
                  </Link>
              </TableCell>
              <TableCell align="right">{row.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* <div className={classes.seeMore}>
        <Link color="primary" href="#" onClick={preventDefault}>
          See more repositories
        </Link>
      </div> */}
    </React.Fragment>
  );
}

export default ItemList;