crunchbaseKey = "YOUR-CRUNCHBASE-API-KEY"

async = require "async"

Array::unique = ->
  output = {}
  output[@[key]] = @[key] for key in [0...@length]
  value for key, value of output

class Company
  constructor: (args) ->
    {@name, @moneyRaised, @category, @tags} = args || []
    @fundingRounds = args.fundingRounds || []

  hasFunding: ->
    @fundingRounds? and @fundingRounds.length > 0

  investors: ->
    result = []
    for round in @fundingRounds
      result.push(investor.name) for investor in round.investors when investor.name not in result
    result

class Investor
  constructor: (args) ->
    @name = args.name || ""
    @companies = []
    @sectors = {}

  companiesNames: ->
    (c.name for c in @companies)

class Helper
  @printStartupsAnalysis: (companies) ->
    for c in companies
      if c.hasFunding()
        console.log "#{c.name} received #{c.moneyRaised} in #{c.fundingRounds.length} rounds:"
        for round, i in c.fundingRounds
          roundInvestors = (inv.name for inv in round.investors)
          console.log "Round #{i + 1}: #{round.money} #{round.currency} from #{roundInvestors}"
      else
        console.log "#{c.name} don't have funding"
      console.log Array(10).join "-"

  @printTopInvestorsAnalysis: (investors) ->
    investors.sort (one, two) -> two.companies.length - one.companies.length
    for i in [0..4]
      investor = investors[i]
      console.log "##{i+1} #{investor.name} - #{investor.companies.length} companies:"
      console.log "#{investor.companiesNames()}"
      sectors = ("#{key}: #{value}" for key, value of investor.sectors)
      console.log "Companies per sector: #{sectors}"
      console.log Array(10).join "-"

  @saveNormalisedData: (data, dest) ->
    fs = require "fs"
    fs.writeFileSync "./#{dest}", JSON.stringify(data, null, 2)
    console.log "Data saved in ./#{dest}"

class Engine
  @getCompany: (companyName, callback) ->
    crunchbase = require "crunchbase"
    crunchbase.init crunchbaseKey

    console.log "Getting data for #{companyName}"
    crunchbase.getEntity "company", companyName, (err, res) ->
      if res.name?
        company = new Company(
          name: res.name
          moneyRaised: res.total_money_raised
          category: res.category_code
          tags: res.tag_list.split(", ") if res.tag_list?
        )
        company.fundingRounds = Engine.parseFundingRounds(res.funding_rounds)
        # console.log JSON.stringify company, null, 2
        console.log "  - Investment: #{company.hasFunding()}"
        console.log "  - Investors: #{company.investors()}"
        callback(null, company)
      else
        console.log "  - Error retrieving data for #{companyName}"
        callback(null, undefined)

  @parseFundingRounds: (frs) ->
    rounds = []
    for fr, i in frs
      round =
        month: fr.funded_month
        year: fr.funded_year
        money: fr.raised_amount
        currency: fr.raised_currency_code
        investors: []
      rounds[i] = round
      for inv in fr.investments
        investor = {}
        if inv.company?
          investor.name = inv.company.name
          investor.type = "company"
        else if inv.financial_org?
          investor.name = inv.financial_org.name
          investor.type = "financial_org"
        else
          investor.name = inv.person.first_name + " " + inv.person.last_name
          investor.type = "person"
        rounds[i].investors.push(investor)
    rounds

  @loadCompanies: (src) ->
    result = []
    async.each src, (item, callback) ->
      result.push(new Company(item)) if item?
      callback()
    , (err) ->
      console.log "#{result.length} processed"
      console.log Array(10).join "-"
    result

  @loadInvestors: (companies) ->
    result = []
    investorNames = Engine.getUniqueInvestorNames(companies)
    for investorName in investorNames
      investor = new Investor(name: investorName)
      for company in companies
        if investorName in company.investors() and company not in investor.companies
          investor.companies.push(company)
          if investor.sectors[company.category]
            investor.sectors[company.category] += 1
          else
            investor.sectors[company.category] = 1
      result.push(investor)
    result

  @getUniqueInvestorNames: (companies) ->
    investorNames = (c.investors() for c in companies)
    filteredInvestorNames = [].concat.apply([], investorNames).unique()

start = ->
  argv = getArgs()
  if "fetch" in argv._ and argv.src? and argv.dest?
    companiesList = require "./#{argv.src}"
    async.mapSeries companiesList, Engine.getCompany, (err, result) ->
      Helper.saveNormalisedData(result, argv.dest)
  else if "analyse" in argv._ and argv.src?
    companiesSrc = require "./#{argv.src}"
    companies = Engine.loadCompanies(companiesSrc)
    if "startups" in argv._
      Helper.printStartupsAnalysis(companies)
    else if "investors" in argv._
      investors = Engine.loadInvestors(companies)
      Helper.printTopInvestorsAnalysis(investors)

getArgs = ->
  opt = require("optimist").usage(
    "Fetch and analyse startups/investor data from Crunchbase.\nUsage:\n
      $0 fetch [--src companies.json] [--dest data.json]\n
      $0 analyse (startups|investors) [--src data.json]"
  )
  if "analyse" in process.argv
    argv = opt.default("src": "data.json")
      .string("src")
      .check((argv) -> argv.src.length > 0)
      .check((argv) -> "startups" in argv._ or "investors" in argv._)
      .argv
  else if "fetch" in process.argv
    argv = opt.default("src": "companies.json", "dest": "data.json")
      .string(["src", "dest"])
      .check((argv) -> argv.src.length > 0 and argv.dest.length > 0)
      .describe("src", "JSON array of startup names to check.")
      .describe("dest", "Filename.json that will contain the output.")
      .argv

  if argv is undefined or argv.h?
    opt.showHelp()
    process.exit(0)

  argv

start()
