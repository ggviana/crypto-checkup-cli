#!/usr/bin/env node

const axios = require('axios')
const program = require('commander')
const Table = require('cli-table')
const BigNumber = require('bignumber.js')
const chalk = require('chalk')

const toData = _ => _.data || _

program
  .option('-f, --fiat <fiat>', 'Fiat currency to display values', fiat => fiat.toUpperCase(), 'USD')
  .option('-l, --limit <limit>', 'Shows top n coins', 10)
  .parse(process.argv)

const formatCurrency = value => new Intl
  .NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  })
  .format(value)
  .replace('$', '')

const toPercent = value => `${value}%`
const formatChange = value => (value > 0 ? chalk.green : chalk.red)(toPercent(value))
const formatPrice = (value, change) => (change > 0 ? chalk.green : chalk.red)(formatCurrency(value))

axios.get(`https://api.coinmarketcap.com/v2/ticker/?limit=${program.limit}&convert=${program.fiat}`)
  .then(toData)
  .then(toData)
  .then(coins => Object.values(coins))
  .then(coins => coins.sort((a, b) => parseInt(a.rank) - parseInt(b.rank)))
  .then(coins => {
    const total = coins.reduce((total, coin) => total.plus(coin.quotes[program.fiat].market_cap), new BigNumber(0))

    return coins.map(coin => {
      const {
        price,
        market_cap,
        percent_change_1h,
        percent_change_24h,
        percent_change_7d
      } = coin.quotes[program.fiat]

      coin.dominance = new BigNumber(market_cap).dividedBy(total).multipliedBy(100).toFixed(2)
      coin.price = price
      coin.marketCap = market_cap
      coin.change1h = percent_change_1h
      coin.change24h = percent_change_24h
      coin.change7d = percent_change_7d
      return coin
    })
  })
  .then(coins => coins.map(coin => [
    coin.rank,
    coin.symbol,
    coin.name,
    formatPrice(coin.price, coin.change24h),
    toPercent(coin.dominance),
    formatCurrency(coin.marketCap),
    formatChange(coin.change7d),
    formatChange(coin.change24h),
    formatChange(coin.change1h),
  ]))
  .then(coins => {
    const table = new Table({
      head: ['#', 'Code', 'Name', 'Price', 'Dominance', 'Market Cap', 'Change(7d)', 'Change(24h)', 'Change(1h)'],
      colAligns: ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right'],
      style: {
        head: ['blue']
      }
    })

    table.push.apply(table, coins)

    console.log(table.toString())
  })
  .catch(error => {
    console.error('Error when fetching coins')
    console.error(error)
  })
