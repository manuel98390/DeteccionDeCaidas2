import React, { useEffect, useState } from 'react'
import { Image, View, StyleSheet, Button, Alert } from 'react-native';
import { DataTable, IconButton } from 'react-native-paper';
import {
  getExperimento,
  getdataExperiment
} from '../services/db-service';
import RNFetchBlob from 'react-native-fetch-blob';
var experimentos;
var dataExper;

// let iconLeft={require('C:\Users\dare2\Documents\react native\prototipoBLE\app\iconos')}
// let iconRight={require('../iconos/ic_settings.png')}
export default App = () => {
  const [errors, setExErrors] = useState(false)
  const [Experimen, setExperimen] = useState([]); 

  const dataconsult = async () => {
    getExperimento(value1 => {
      setExperimen(value1)
    })
  }

  useEffect(() => {
    dataconsult()
  }, []);

  useEffect(() => {
    console.log("data pasada", experimentos)
    console.log("data pasada", dataExper)
  }, [errors]);

  const csvdata = async (data,experimento) => { 
    // construct csvString
    debugger
    const arraF = []
    
    for (const [key, objetos] of Object.entries(data)) {
      let dataacele=JSON.parse(objetos.Data); 
      for (var prop in dataacele) {  
        var pieces = dataacele[prop].split(",");
        pieces.push(experimento)
        arraF.push(pieces)
      }
    }
    const headerString = 'X-acele,Y-acele, Z-acele, Fecha, Dispositivo, Experimento\n';
    const rowString = arraF.map(d => `${d[0]},${d[1]},${d[2]},${d[3]},${d[4]},${d[5]}\n`).join('');
    const csvString = `${headerString}${rowString}`;

    const pathToWrite = "/storage/emulated/0/Android/data/com.ejemplo/files/"+experimento+".csv";
    console.log('pathToWrite', pathToWrite); 
    RNFetchBlob.fs
        .writeFile(pathToWrite, csvString, 'utf8')
        .then(() => {
            console.log(`wrote file ${pathToWrite}`); 
        })
        .catch(error => console.error(error));
}

  const saveData = (id,experimento) => {
    getdataExperiment(data => {
      csvdata(data,experimento)
    }, id)
  }

  return (
    <View>
      <DataTable>
        <DataTable.Header style={styles.databeHeader}>
          <DataTable.Title>Experimento</DataTable.Title>
          <DataTable.Title>Eliminar</DataTable.Title>
          <DataTable.Title>Guardar</DataTable.Title>
        </DataTable.Header>
        {
          Experimen.map((l, i) => (
            <DataTable.Row style={styles.databeBox} key={l.Expe_id} >
              <DataTable.Cell>{l.Expe_name}</DataTable.Cell>
              <DataTable.Cell style={styles.Cellimage}>
                <IconButton
                  icon={require('../iconos/delete.png')}
                  size={20}
                />
              </DataTable.Cell>
              <DataTable.Cell>
                <IconButton
                  icon={require('../iconos/save.png')}
                  size={20}
                  onPress={() => saveData(l.Expe_id,l.Expe_name)}
                />
              </DataTable.Cell>
            </DataTable.Row>
          ))
        }
      </DataTable>

    </View>
  );
}


const styles = StyleSheet.create({
  databeBox: {
    margin: 7,
    textAlign: 'center',
  },
  iconLeft: {
    width: 17,
    height: 17,
  },
  Cellimage: {
    marginLeft: 32,
    alignItems: 'center',
  }
});