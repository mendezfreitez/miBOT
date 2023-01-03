// const Storage = require('node-storage')
// const Binance = require('node-binance-api');
//#region
// EMA volatil de 20 y EMA atenuada de 60, con periodos de 5min
//#endregion
const Binance = require('binance-api-node').default
const indicators = require('technicalindicators')
const colors = {
  verde: '\x1b[92m%s\x1b[0m',
  verdeOpaco: '\x1b[32m%s\x1b[0m',
  rojo: '\x1b[91m%s\x1b[0m',
  rojoOpaco: '\x1b[31m%s\x1b[0m',
  gris: '\x1b[97m%s\x1b[0m',
  amarillo: '\x1b[93m%s\x1b[0m',
  amarilloOpaco: '\x1b[33m%s\x1b[0m',
  cyan: '\x1b[96m%s\x1b[0m',
  cyanOpaco: '\x1b[36m%s\x1b[0m',
}

const cliente = Binance({
  apiKey: process.env.APIKEY,
  apiSecret: process.env.SECRET,
  getTime: 10
  // useServerTime: true,
  // family: 4,
  // verbose: true,
});

// const MARKET1 = process.argv[2]
// const MARKET2 = process.argv[3]
// const MARKET = MARKET1 + MARKET2
// const BUY_ORDER_AMOUNT = process.argv[4]

// const store = new storage(`./data/${MARKET}.json`)

async function obtenerEMA(array, period) {
  const data = indicators.EMA.calculate({ values: array, period: period })
  return (data[data.length - 1]).toFixed(2)
}

const printDatos = async (obj) => {
  const { pActual, pActualVolatil, pActualAtenuada, p5tVolatil, p5tAtenuada, p10tVolatil, p10tAtenuada } = obj
  console.clear()
  console.log(colors.gris, `Precio actual   => ${pActual}`)
  console.log(colors.amarillo, `\nEma  VOLATIL    => ${pActualVolatil}`)
  console.log(colors.cyan, `Ema ATENUADA    => ${pActualAtenuada}`)
  console.log(colors.amarillo, `\nVOLATIL      5t => ${p5tVolatil}`)
  console.log(colors.cyan, `ATENUADA     5t => ${p5tAtenuada}`)
  console.log(colors.amarillo, `\nVOLATIL     10t => ${p10tVolatil}`)
  console.log(colors.cyan, `ATENUADA    10t => ${p10tAtenuada}`)
}

const devolverColorAngulo = (angulo) => {
  if (angulo >= 45) {
    return colors.verde
  }
  else if (angulo < 45 && angulo >= 0) {
    return colors.verdeOpaco
  }
  else if (angulo < 0 && angulo >= -45) {
    return colors.rojoOpaco
  }
  else {
    return colors.rojo
  }
}

const evaluarSituacion = (dif, dif5t, dif10t) => {
  const abs = Math.abs(dif)
  const abs5t = Math.abs(dif5t)
  const abs10t = Math.abs(dif10t)

  if (((abs10t > abs5t) && (abs5t > abs)) && (abs < 10)) {
    // evaluar
    return `Las EMAs se vienen acercando, dif de ${abs.toFixed(2)} posiblemente exista un cruce`
    //por aca se pueden evaluar otras cuestiones, como volumen y las pendientes de la recta de las EMAs
  }
  if ((abs10t > abs5t) && (abs5t > abs)) {
    return 'Las EMAs se vienen acercando'
  }
  if ((abs10t < abs5t) && (abs5t < abs)) {
    return 'Las emas se estan alejando, si no se ha ingresado, se recomienda no ingresar ahora'
  }
  
  if ((abs10t < abs5t) && (abs5t > abs)) {
    return 'Esto puede significar el inicio de un cambio de tendencia\nPero OJO, esto es algo netamente tentativo de momento.\nNo te fies mucho de esta observacion, probablemente la vas a cambiar'
  }
  return '>>> EL CASO ACTUAL NO SE ENCUENTRA CONTEMPLADO <<<'
}

const obtenerPendiente = (h, t) => ((Math.atan(h / t) * 180) / Math.PI).toFixed(2)

async function broadcast() {
  while (true) {
    try {
      const precios = await cliente.candles({
        symbol: 'BTCUSDT',
        interval: '5m',
        limit: 600,
        //   startTime?: number,
        //   endTime?: number,
      })
      const arr = precios.map(vela => parseFloat(vela.close))
      const precioProm = arr.reduce((acc, itm) => acc + itm) / arr.length
      const arrAhora = arr.slice(99, 600)
      const arr5t = arr.slice(0, 595)
      const arr10t = arr.slice(0, 590)

      const pActual = arr[arr.length - 1]

      const pActualVolatil = await obtenerEMA(arrAhora, 10)
      const pActualAtenuada = await obtenerEMA(arrAhora, 60)

      const p5tVolatil = await obtenerEMA(arr5t, 10)
      const p5tAtenuada = await obtenerEMA(arr5t, 60)

      const p10tVolatil = await obtenerEMA(arr10t, 10)
      const p10tAtenuada = await obtenerEMA(arr10t, 60)

      const obj = {
        pActual,
        pActualVolatil,
        pActualAtenuada,
        p5tVolatil,
        p5tAtenuada,
        p10tVolatil,
        p10tAtenuada
      }

      printDatos(obj)
      // h0 = (pActualVolatil - p5tVolatil)
      mVolatil = obtenerPendiente(pActualVolatil - p5tVolatil, 6)
      mAtenuada = obtenerPendiente(pActualAtenuada - p5tAtenuada, 6)

      const dif = pActualVolatil - pActualAtenuada
      const dif5t = p5tVolatil - p5tAtenuada
      const dif10t = p10tVolatil - p10tAtenuada



      if (dif > 0 && dif5t < 0) console.log(colors.verde, '\nCruce positivo')
      else if (dif5t > 0 && dif < 0) console.log(colors.rojo, '\nCruce negativo')
      else console.log(colors.gris, '\nNo hay cruce')

      console.log(`\nPrecio prom     => ${precioProm.toFixed(2)}`)
      // console.log(`h0       => ${h0}`)
      console.log(devolverColorAngulo(mVolatil), `mVolatil        => ${mVolatil}º`)
      console.log(devolverColorAngulo(mAtenuada), `mAtenuada       => ${mAtenuada}º\n`)

      console.log(evaluarSituacion(dif, dif5t, dif10t))
    }
    catch (error) {
      console.clear()
      console.log(colors.rojo, '>>>>> Error de conexion con Binance <<<<<')
      console.log(error)
      return
    }


  }
}

async function inicio() {
  //   if (process.argv[5] !== 'resume') {
  //     const price = await client.prices(MARKET)
  //     store.put('start_price', parseFloat(price[MARKET]))
  //     store.put('orders', [])
  //     store.put('profits', 0)

  //     const balances = await _balances()
  //     putBalances(balances)

  //     store.put(`initial_${MARKET1.toLowerCase()}_balance`, store.get(`${MARKET1.toLowerCase()}_balance`))
  //     store.put(`initial_${MARKET2.toLowerCase()}_balance`, store.get(`${MARKET2.toLowerCase()}_balance`))

  broadcast()
  //   }
}

inicio()