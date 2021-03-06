// Generated by CoffeeScript 1.7.1
(function() {
  var Company, Engine, Helper, Investor, async, crunchbaseKey, getArgs, start,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  crunchbaseKey = "YOUR-CRUNCHBASE-API-KEY";

  async = require("async");

  Array.prototype.unique = function() {
    var key, output, value, _i, _ref, _results;
    output = {};
    for (key = _i = 0, _ref = this.length; 0 <= _ref ? _i < _ref : _i > _ref; key = 0 <= _ref ? ++_i : --_i) {
      output[this[key]] = this[key];
    }
    _results = [];
    for (key in output) {
      value = output[key];
      _results.push(value);
    }
    return _results;
  };

  Company = (function() {
    function Company(args) {
      var _ref;
      _ref = args || [], this.name = _ref.name, this.moneyRaised = _ref.moneyRaised, this.category = _ref.category, this.tags = _ref.tags;
      this.fundingRounds = args.fundingRounds || [];
    }

    Company.prototype.hasFunding = function() {
      return (this.fundingRounds != null) && this.fundingRounds.length > 0;
    };

    Company.prototype.investors = function() {
      var investor, result, round, _i, _j, _len, _len1, _ref, _ref1, _ref2;
      result = [];
      _ref = this.fundingRounds;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        round = _ref[_i];
        _ref1 = round.investors;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          investor = _ref1[_j];
          if (_ref2 = investor.name, __indexOf.call(result, _ref2) < 0) {
            result.push(investor.name);
          }
        }
      }
      return result;
    };

    return Company;

  })();

  Investor = (function() {
    function Investor(args) {
      this.name = args.name || "";
      this.companies = [];
      this.sectors = {};
    }

    Investor.prototype.companiesNames = function() {
      var c, _i, _len, _ref, _results;
      _ref = this.companies;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        _results.push(c.name);
      }
      return _results;
    };

    return Investor;

  })();

  Helper = (function() {
    function Helper() {}

    Helper.printStartupsAnalysis = function(companies) {
      var c, i, inv, round, roundInvestors, _i, _j, _len, _len1, _ref, _results;
      _results = [];
      for (_i = 0, _len = companies.length; _i < _len; _i++) {
        c = companies[_i];
        if (c.hasFunding()) {
          console.log("" + c.name + " received " + c.moneyRaised + " in " + c.fundingRounds.length + " rounds:");
          _ref = c.fundingRounds;
          for (i = _j = 0, _len1 = _ref.length; _j < _len1; i = ++_j) {
            round = _ref[i];
            roundInvestors = (function() {
              var _k, _len2, _ref1, _results1;
              _ref1 = round.investors;
              _results1 = [];
              for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
                inv = _ref1[_k];
                _results1.push(inv.name);
              }
              return _results1;
            })();
            console.log("Round " + (i + 1) + ": " + round.money + " " + round.currency + " from " + roundInvestors);
          }
        } else {
          console.log("" + c.name + " don't have funding");
        }
        _results.push(console.log(Array(10).join("-")));
      }
      return _results;
    };

    Helper.printTopInvestorsAnalysis = function(investors) {
      var i, investor, key, sectors, value, _i, _results;
      investors.sort(function(one, two) {
        return two.companies.length - one.companies.length;
      });
      _results = [];
      for (i = _i = 0; _i <= 4; i = ++_i) {
        investor = investors[i];
        console.log("#" + (i + 1) + " " + investor.name + " - " + investor.companies.length + " companies:");
        console.log("" + (investor.companiesNames()));
        sectors = (function() {
          var _ref, _results1;
          _ref = investor.sectors;
          _results1 = [];
          for (key in _ref) {
            value = _ref[key];
            _results1.push("" + key + ": " + value);
          }
          return _results1;
        })();
        console.log("Companies per sector: " + sectors);
        _results.push(console.log(Array(10).join("-")));
      }
      return _results;
    };

    Helper.saveNormalisedData = function(data, dest) {
      var fs;
      fs = require("fs");
      fs.writeFileSync("./" + dest, JSON.stringify(data, null, 2));
      return console.log("Data saved in ./" + dest);
    };

    return Helper;

  })();

  Engine = (function() {
    function Engine() {}

    Engine.getCompany = function(companyName, callback) {
      var crunchbase;
      crunchbase = require("crunchbase");
      crunchbase.init(crunchbaseKey);
      console.log("Getting data for " + companyName);
      return crunchbase.getEntity("company", companyName, function(err, res) {
        var company;
        if (res.name != null) {
          company = new Company({
            name: res.name,
            moneyRaised: res.total_money_raised,
            category: res.category_code,
            tags: res.tag_list != null ? res.tag_list.split(", ") : void 0
          });
          company.fundingRounds = Engine.parseFundingRounds(res.funding_rounds);
          console.log("  - Investment: " + (company.hasFunding()));
          console.log("  - Investors: " + (company.investors()));
          return callback(null, company);
        } else {
          console.log("  - Error retrieving data for " + companyName);
          return callback(null, void 0);
        }
      });
    };

    Engine.parseFundingRounds = function(frs) {
      var fr, i, inv, investor, round, rounds, _i, _j, _len, _len1, _ref;
      rounds = [];
      for (i = _i = 0, _len = frs.length; _i < _len; i = ++_i) {
        fr = frs[i];
        round = {
          month: fr.funded_month,
          year: fr.funded_year,
          money: fr.raised_amount,
          currency: fr.raised_currency_code,
          investors: []
        };
        rounds[i] = round;
        _ref = fr.investments;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          inv = _ref[_j];
          investor = {};
          if (inv.company != null) {
            investor.name = inv.company.name;
            investor.type = "company";
          } else if (inv.financial_org != null) {
            investor.name = inv.financial_org.name;
            investor.type = "financial_org";
          } else {
            investor.name = inv.person.first_name + " " + inv.person.last_name;
            investor.type = "person";
          }
          rounds[i].investors.push(investor);
        }
      }
      return rounds;
    };

    Engine.loadCompanies = function(src) {
      var result;
      result = [];
      async.each(src, function(item, callback) {
        if (item != null) {
          result.push(new Company(item));
        }
        return callback();
      }, function(err) {
        console.log("" + result.length + " processed");
        return console.log(Array(10).join("-"));
      });
      return result;
    };

    Engine.loadInvestors = function(companies) {
      var company, investor, investorName, investorNames, result, _i, _j, _len, _len1;
      result = [];
      investorNames = Engine.getUniqueInvestorNames(companies);
      for (_i = 0, _len = investorNames.length; _i < _len; _i++) {
        investorName = investorNames[_i];
        investor = new Investor({
          name: investorName
        });
        for (_j = 0, _len1 = companies.length; _j < _len1; _j++) {
          company = companies[_j];
          if (__indexOf.call(company.investors(), investorName) >= 0 && __indexOf.call(investor.companies, company) < 0) {
            investor.companies.push(company);
            if (investor.sectors[company.category]) {
              investor.sectors[company.category] += 1;
            } else {
              investor.sectors[company.category] = 1;
            }
          }
        }
        result.push(investor);
      }
      return result;
    };

    Engine.getUniqueInvestorNames = function(companies) {
      var c, filteredInvestorNames, investorNames;
      investorNames = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = companies.length; _i < _len; _i++) {
          c = companies[_i];
          _results.push(c.investors());
        }
        return _results;
      })();
      return filteredInvestorNames = [].concat.apply([], investorNames).unique();
    };

    return Engine;

  })();

  start = function() {
    var argv, companies, companiesList, companiesSrc, investors;
    argv = getArgs();
    if (__indexOf.call(argv._, "fetch") >= 0 && (argv.src != null) && (argv.dest != null)) {
      companiesList = require("./" + argv.src);
      return async.mapSeries(companiesList, Engine.getCompany, function(err, result) {
        return Helper.saveNormalisedData(result, argv.dest);
      });
    } else if (__indexOf.call(argv._, "analyse") >= 0 && (argv.src != null)) {
      companiesSrc = require("./" + argv.src);
      companies = Engine.loadCompanies(companiesSrc);
      if (__indexOf.call(argv._, "startups") >= 0) {
        return Helper.printStartupsAnalysis(companies);
      } else if (__indexOf.call(argv._, "investors") >= 0) {
        investors = Engine.loadInvestors(companies);
        return Helper.printTopInvestorsAnalysis(investors);
      }
    }
  };

  getArgs = function() {
    var argv, opt;
    opt = require("optimist").usage("Fetch and analyse startups/investor data from Crunchbase.\nUsage:\n $0 fetch [--src companies.json] [--dest data.json]\n $0 analyse (startups|investors) [--src data.json]");
    if (__indexOf.call(process.argv, "analyse") >= 0) {
      argv = opt["default"]({
        "src": "data.json"
      }).string("src").check(function(argv) {
        return argv.src.length > 0;
      }).check(function(argv) {
        return __indexOf.call(argv._, "startups") >= 0 || __indexOf.call(argv._, "investors") >= 0;
      }).argv;
    } else if (__indexOf.call(process.argv, "fetch") >= 0) {
      argv = opt["default"]({
        "src": "companies.json",
        "dest": "data.json"
      }).string(["src", "dest"]).check(function(argv) {
        return argv.src.length > 0 && argv.dest.length > 0;
      }).describe("src", "JSON array of startup names to check.").describe("dest", "Filename.json that will contain the output.").argv;
    }
    if (argv === void 0 || (argv.h != null)) {
      opt.showHelp();
      process.exit(0);
    }
    return argv;
  };

  start();

}).call(this);
