import React, {
    useState,
    useEffect,
} from 'react';
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    StatusBar,
    NativeModules,
    NativeEventEmitter,
    Platform,
    PermissionsAndroid,
    FlatList,
    TouchableOpacity
} from 'react-native';
import Toast from 'react-native-simple-toast';
import moment from 'moment';

import Styles from './componentesDispositivosBLE'
import { Buffer } from "buffer"
import BleManager from 'react-native-ble-manager';
import Subtitle from '../subtitle';
import Divice from '../Divice/divice';
import Empty from '../Empty/empty';
import UserModel from "../models/index"
import {
    getdata,
    addDivice,
    adddata
} from '../services/db-service';

let _ = require('underscore')
let global = false;
let deviceObje = new Object();
let interval;
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
const peripherals = new Map();
{/*
    -agregar una verificacion en el boton scan bluetooth y ver 
    si esta activo el bluetooh
    -arreglar diseño de la lista de dispositivos
    -cuando se seleccione el item del dispositivo y no se 
    conecte poner rojo y mostrar mensaje de reintentar
    -arreglar el scroll de la lista
*/}


function DispositivosBLE(props) {
    const [dive, setMaindive] = useState(new UserModel())
    const [isScanning, setIsScanning] = useState(false);
    const [peripherals, setPeripherals] = useState(new Map());
    const [peripheralInfo2, setPeripheralInfo] = useState(new Map());
    const [list, setList] = useState([]);
    const [realTime, setRealTime] = useState(false);
    const [arrayAcele, setArrayAcele] = useState([]);
    const render = ({ item, index }) => {
        return <Divice
            {...item}
            iconLeft={require('../iconos/ic_laptop.png')}
            iconRight={require('../iconos/ic_settings.png')}
            onPress={() => testPeripheral(item)}
        />
    }

    const createtable = () => {
        getdata()
    }
    const adddivice = async () => {
        if (dive.getMacaddres().length != 0) {
            addDivice(dive)
        }
    }

    useEffect(() => {

        createtable();
        console.log(deviceObje)

        BleManager.start({ showAlert: false });

        bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
        bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
        bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);
        bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic);

        if (Platform.OS === 'android' && Platform.Version >= 23) {
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
                if (result) {
                    console.log("Permission is OK");
                } else {
                    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
                        if (result) {
                            console.log("User accept");
                        } else {
                            console.log("User refuse");
                        }
                    });
                }
            });
        }

        return (() => {
            console.log('unmount');
            bleManagerEmitter.removeListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
            bleManagerEmitter.removeListener('BleManagerStopScan', handleStopScan);
            bleManagerEmitter.removeListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);
            bleManagerEmitter.removeListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic);
        })
    }, []);

    useEffect(async () => { 
        for (let prop in deviceObje) {
            deviceObje[prop] = []
        }
        console.log(deviceObje);
        if (realTime) {
            interval = setInterval(() => {
                insertInfo()
                for (let prop in deviceObje) { 
                    deviceObje[prop] = []
                }
            }, 30000);
        } else {
            clearInterval(interval);
            setArrayAcele([]);
            //setList([])
        }
        return () => clearInterval(interval);
    }, [realTime]);

    const insertInfo = async () => {
        adddata(deviceObje)
    }

    const startScan = async () => {
        setList([])
        if (!isScanning) {
            await BleManager.scan([], 3, true).then((results) => {
                console.log('Scanning...');
                setIsScanning(true);
            }).catch(err => {
                console.error(err);
            });
        }
    }

    const handleDiscoverPeripheral = (peripheral) => { 
        if (!peripheral.name) {
            peripheral.name = 'NO NAME';
        }
        setPeripherals(peripherals.set(peripheral.id, peripheral));
        setList(Array.from(peripherals.values()));
    }

    const handleStopScan = () => {
        console.log("dispositivos", peripherals)
        console.log('Scan is stopped');
        setIsScanning(false);
        setArrayAcele([])
    }

    const handleDisconnectedPeripheral = (data) => {
        console.log('1')
        let peripheral = peripherals.get(data.peripheral);
        if (peripheral) {
            peripheral.connected = false;
            peripherals.set(peripheral.id, peripheral);
            setList(Array.from(peripherals.values()));
        }
        setMaindive("")
        setMaindive(new UserModel())
        setRealTime(false)
        console.log('Disconnected from ' + data.peripheral);
    }
    const disconect = () => {
        console.log('desconectar')
        for (const [key, Data1] of Object.entries(deviceObje)) {
            let peripheral = peripherals.get(key);
            if (peripheral) {
                peripheral.connected = false;
                console.log(peripheral.id);
                BleManager.disconnect(key);
                peripherals.set(peripheral.id, peripheral);
                setList(Array.from(peripherals.values()));
            }
            setMaindive("")
            setMaindive(new UserModel())
            setRealTime(false)
            console.log('Disconnected from ' + key);
        }
    }


    const retrieveConnected = async () => { 
        await BleManager.getConnectedPeripherals([]).then((results) => {
            if (results.length == 0) {
                console.log('No connected peripherals')
            }
            results.forEach((result) => {
                result.connected = true;
                peripherals.set(result.id, result);
                setRealTime(true)
                global = true//cambiar
                setList(Array.from(peripherals.values()));
            })
        }).catch((error) => {
            console.log('Connection error', error);
        });
    }

    var caidaLibre = 0
    var impacto = 0
    var reposo = 0
    var datosCaida = []
    var cont = 0
    var datosPorSegundo = 19
    var date2 = ""
    var date3 = ""
    var banTiempo = false
    var banderaReposo = false 
    var banTiempoReposo = false
    var caida = "no se detecto"

    // function fase1 (vm){
    //     var bandera = 0
    //     var stop = 0

    //     if(vm < 0.6){
    //         console.log("Se detecto la caida libre con el valor: ", vm)
    //         bandera = 1
    //         stop = 1
    //     }

    //     return bandera

    // }
    const handleUpdateValueForCharacteristic = async ({ value, peripheral, characteristic, service }) => {
        if (global) {
            const buffer = Buffer.from(value);
            var date = moment()
                .format('YYYY-MM-DD_hh:mm:ss_a');
            
            const dataacelero = buffer.toString() + "," + date + "," + peripheral+caida;
            // console.log(buffer.toString())
            var ejes = buffer.toString().split(",")
            // console.log(ejes[0])
            // var X = parseFloat(ejes[0])
            // console.log(X)

            var X = ((Math.abs(parseFloat(ejes[0]))) / 9.807)
            // console.log(X)
            var Y = ((Math.abs(parseFloat(ejes[1]))) / 9.807)
            // console.log(Y)
            var Z = ((Math.abs(parseFloat(ejes[2]))) / 9.807)
            // console.log(Z)
            // console.log(Math.pow(2,2))

            var vm = Math.sqrt((Math.pow(X,2)) + (Math.pow(Y,2)) + (Math.pow(Z,2)))
            console.log(vm)
            
            
            console.log("tiempo transcurrido: ", date)
           
            

            
            // caidaLibre = fase1 (vm)
            if(vm < 0.5){
                console.log("Caida libre")
                console.log("Se detecto la caida libre con el valor: ", vm)
                caidaLibre = 1;
                cont = 1
            //    datosCaida.push(vm)
               date2 = moment().add(2, 'second').format('YYYY-MM-DD_hh:mm:ss_a');
            }
            console.log("Fecha 2: ",date2)

            if((date < date2) && (caidaLibre == 1)){
                datosCaida.push(vm)
                // console.log("las fechas son menores ", date, " y ", date2)
                if(vm > 1.5){
                    impacto = 1
                }

                cont = cont +1
            }

            if((date == date2) && (caidaLibre==1) && (impacto == 1)){
                console.log("Las fechas son iguales: ", date, " y ", date2)
                banTiempo = true
                date3 = moment().add(2, 'second').format('YYYY-MM-DD_hh:mm:ss_a');
            }

            if((impacto != 1) && (banTiempo == true) && (caidaLibre == 1)){
                datosCaida = []
                caidaLibre = 0
                date2 = ""
                banTiempo = false
            }

            if((date < date3) && (impacto == 1) && (caidaLibre == 1)){
                datosCaida.push(vm)
                if((caidaLibre == 1) && (impacto == 1)){
                    if((vm < 0.8) || (vm > 1.5)){
                        banderaReposo = true
                    }
                }
            }

            if((date == date3)){
                banTiempoReposo = true
            }

            if((impacto == 1) && (banTiempo == true) && (caidaLibre == 1) && (banderaReposo == true) && (banTiempoReposo == true)){
                datosCaida = []
                caidaLibre = 0
                impacto = 0
                banderaReposo = false
                banTiempoReposo = false
                banTiempo = false
            }

            if((caidaLibre == 1) && (impacto == 1) && (banderaReposo == false) && (banTiempoReposo == true)){
                console.log ("Se detecto la caida")
                caida = "Se detecto la caida"
            }

            console.log("Contador: ", cont)
            
            // if((caidaLibre == 1) && (banTiempo == true)){
            //     console.log("Fase de impacto")
            //     // console.log(datosCaida)
            //     for(var j = 0; j<(datosCaida.length); j++){
            //         console.log(datosCaida[j])
            //         if((datosCaida[j]) > 1.5){
            //             impacto = 1
            //         }
            //     }
            //     if(impacto != 1){
            //         datosCaida = []
            //         caidaLibre = 0
            //         banTiempo = false
            //     }
            // }
            
            // if ((caidaLibre == 1) && (cont >= (datosPorSegundo*1.5))){
            //     console.log(datosCaida)
            //     if(vm > 1.5){
            //         console.log("Se detecto el impacto con el valor: ", vm)
            //         impacto = 1
            //     }else{
            //         caidaLibre = 0
            //         cont = 0
            //         datosCaida = []
            //         console.log("Se borro: ", datosCaida)
            //     }
            // }

            // if ((caidaLibre == 1) && (impacto == 1)){
            //     if ((vm > 0.5) && (vm < 1.5)){
            //         console.log("Se detecto el reposo")
            //         reposo = 1
            //     }else{
            //         // falata recopilar los datos de 2 segundos de reposo
            //     }
            // }
            // console.log("contador: ", cont)
            // console.log(caidaLibre)
            // console.log(impacto)
            // console.log(reposo)
            // for (var i=0; i<= 2; i++){
                
            // }

            deviceObje[peripheral].push(dataacelero)
        }

    }

    const testPeripheral = async (peripheral) => {
        if (peripheral) {
            if (peripheral.connected) {
                let d = peripherals.get(peripheral.id);
                if (d) {
                    d.connected = "undefined";
                    setPeripherals(peripherals.set(peripheral.id, d))
                    setList(Array.from(peripherals.values()));
                }
                await BleManager.disconnect(peripheral.id);
            } else {
                await BleManager.connect(peripheral.id).then(() => {
                    let d = peripherals.get(peripheral.id);
                    if (d) {
                        d.connected = true;
                        setPeripherals(peripherals.set(peripheral.id, d))
                        setList(Array.from(peripherals.values()));
                    }
                    setTimeout(() => {
                        BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
                            setPeripheralInfo(peripheralInfo2.set(peripheral.id, peripheralInfo))
                            var service = peripheralInfo.characteristics[3].service;
                            var bakeCharacteristic = peripheralInfo.characteristics[3].characteristic;
                            
                            if (!_.has(deviceObje, peripheral.id)) {
                                deviceObje[peripheral.id] = []
                            }
                            setTimeout(() => {
                                BleManager.startNotification(peripheral.id, service, bakeCharacteristic).then(
                                    () => {
                                        dive.setIdDispositivo(peripheral.id)
                                        dive.setMacaddres(peripheral.id)
                                        dive.setserviceuuids(service)
                                        dive.setcaracteristica(bakeCharacteristic)
                                        adddivice() 
                                    }).catch((error) => {
                                        console.log('Notification error', error);
                                    });
                            }, 1000);
                        });
                    }, 1500);
                }).catch((error) => {
                    console.log('Connection error', error);
                });
            }
        }
    }


    return (
        <>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView

                contentInsetAdjustmentBehavior="automatic">

                <ScrollView
                    style={Styles.scrollView}>
                    {global.HermesInternal == null ? null : (
                        <View style={Styles.engine}>
                            <Text style={Styles.footer}>Engine: Hermes</Text>
                        </View>
                    )}
                    <View style={Styles.body}>
                        <View style={{ margin: 10 }}>
                            <TouchableOpacity
                                onPress={() => startScan()}
                                style={Styles.appButtonContainer}
                            >
                                <Text
                                    style={Styles.appButtonText}
                                >
                                    {'Scan Bluetooth (' + (isScanning ? 'on' : 'off') + ')'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ margin: 10 }}>

                            {!realTime && (
                                <TouchableOpacity
                                    onPress={() => retrieveConnected()}
                                    style={Styles.appButtonContainer}
                                >
                                    <Text
                                        style={
                                            Styles.appButtonText}
                                    >
                                        Recuperar periféricos conectados
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {realTime && (
                                <TouchableOpacity
                                    onPress={() => disconect()}
                                    style={Styles.appButtonContainer}
                                >
                                    <Text
                                        style={
                                            Styles.appButtonText}
                                    >
                                        Terminar Experimento
                                    </Text>
                                </TouchableOpacity>
                            )}

                        </View>

                        <Subtitle title="Lista de Dispositivos" />
                        {(list.length == 0) &&
                            <Empty text='No hay dispositivos' />
                        }

                    </View>
                </ScrollView>

                {(list.length > 0) && (
                    <FlatList
                        data={list}
                        renderItem={
                            render
                        }

                    />
                )}
            </SafeAreaView>
        </>
    )
}

export default DispositivosBLE;