(function() {
  var AuthStats, JsonRenderer, MarketHelper, MarketStats, Order, Payment, Transaction, User, UserToken, Wallet, jsonBeautifier, _;

  Wallet = global.db.Wallet;

  User = global.db.User;

  Transaction = global.db.Transaction;

  Payment = global.db.Payment;

  Order = global.db.Order;

  AuthStats = global.db.AuthStats;

  UserToken = global.db.UserToken;

  MarketStats = global.db.MarketStats;

  MarketHelper = require("../lib/market_helper");

  JsonRenderer = require("../lib/json_renderer");

  jsonBeautifier = require("../lib/json_beautifier");

  _ = require("underscore");

  module.exports = function(app) {
    var login;
    app.get("/administratie/login", function(req, res, next) {
      return res.render("admin/login");
    });
    app.post("/administratie/login", function(req, res, next) {
      return login(req, res, next);
    });
    app.get("/administratie/logout", function(req, res, next) {
      req.logout();
      return res.redirect("/administratie");
    });
    app.get("/administratie*", function(req, res, next) {
      if (!req.user) {
        res.redirect("/administratie/login");
      }
      return next();
    });
    app.get("/administratie", function(req, res) {
      return MarketStats.findRemovedCurrencies(function(err, removedCurrencies) {
        var currencies;
        currencies = MarketHelper.getCurrencyTypes().filter(function(curr) {
          return removedCurrencies.indexOf(curr) === -1;
        });
        return res.render("admin/stats", {
          title: "Stats - Admin - Separdaz",
          page: "stats",
          adminUser: req.user,
          currencies: currencies
        });
      });
    });
    app.get("/administratie/users", function(req, res) {
      var count, from, query;
      count = req.query.count || 20;
      from = req.query.from != null ? parseInt(req.query.from) : 0;
      query = {
        order: [["updated_at", "DESC"]],
        limit: count,
        offset: from
      };
      return User.findAndCountAll(query).complete(function(err, result) {
        if (result == null) {
          result = {
            rows: [],
            count: 0
          };
        }
        return res.render("admin/users", {
          title: "Users - Admin - Separdaz",
          page: "users",
          adminUser: req.user,
          currencies: MarketHelper.getCurrencyTypes(),
          users: result.rows,
          totalUsers: result.count,
          from: from,
          count: count
        });
      });
    });
    app.get("/administratie/user/:id", function(req, res) {
      return User.findById(req.params.id, function(err, user) {
        return Wallet.findAll({
          where: {
            user_id: req.params.id
          }
        }).complete(function(err, wallets) {
          var query;
          query = {
            where: {
              user_id: req.params.id
            },
            order: [["created_at", "DESC"]],
            limit: 20
          };
          return AuthStats.findAll(query).complete(function(err, authStats) {
            return UserToken.findByUserAndType(user.id, "google_auth", function(err, userToken) {
              return res.render("admin/user", {
                title: "User " + user.email + " - " + user.id + " - Admin - Separdaz",
                page: "users",
                adminUser: req.user,
                currencies: MarketHelper.getCurrencyTypes(),
                user: user,
                userToken: userToken,
                wallets: wallets,
                authStats: authStats
              });
            });
          });
        });
      });
    });
    app.get("/administratie/wallet/:id", function(req, res) {
      return Wallet.findById(req.params.id, function(err, wallet) {
        var closedOptions, openOptions;
        openOptions = {
          sell_currency: wallet.currency,
          status: "open",
          user_id: wallet.user_id,
          currency1: wallet.currency,
          include_logs: true
        };
        closedOptions = {
          sell_currency: wallet.currency,
          status: "completed",
          user_id: wallet.user_id,
          currency1: wallet.currency,
          include_logs: true
        };
        return Order.findByOptions(openOptions, function(err, openOrders) {
          return Order.findByOptions(closedOptions, function(err, closedOrders) {
            return res.render("admin/wallet", {
              title: "Wallet " + wallet.id + " - Admin - Separdaz",
              page: "wallets",
              adminUser: req.user,
              currencies: MarketHelper.getCurrencyTypes(),
              wallet: wallet,
              openOrders: openOrders,
              closedOrders: closedOrders
            });
          });
        });
      });
    });
    app.get("/administratie/wallets", function(req, res) {
      var count, currency, from, query;
      count = req.query.count || 20;
      from = req.query.from != null ? parseInt(req.query.from) : 0;
      currency = req.query.currency != null ? req.query.currency : "BTC";
      query = {
        where: {
          currency: MarketHelper.getCurrency(currency)
        },
        order: [["balance", "DESC"]],
        limit: count,
        offset: from
      };
      return Wallet.findAndCountAll(query).complete(function(err, result) {
        if (result == null) {
          result = {
            rows: [],
            count: 0
          };
        }
        return res.render("admin/wallets", {
          title: "Wallets - Admin - Separdaz",
          page: "wallets",
          adminUser: req.user,
          currencies: MarketHelper.getCurrencyTypes(),
          wallets: result.rows,
          totalWallets: result.count,
          from: from,
          count: count,
          currency: currency
        });
      });
    });
    app.get("/administratie/transactions", function(req, res) {
      var count, from, query, userId;
      userId = req.query.user_id || "";
      count = req.query.count || 20;
      from = req.query.from != null ? parseInt(req.query.from) : 0;
      query = {
        order: [["created_at", "DESC"]],
        limit: count,
        offset: from,
        include: [
          {
            model: global.db.User,
            attributes: ["username", "email"]
          }
        ]
      };
      if (userId) {
        query.where = {
          user_id: userId
        };
      }
      return Transaction.findAndCountAll(query).complete(function(err, result) {
        if (result == null) {
          result = {
            rows: [],
            count: 0
          };
        }
        return res.render("admin/transactions", {
          title: "Transactions - Admin - Separdaz",
          page: "transactions",
          adminUser: req.user,
          currencies: MarketHelper.getCurrencyTypes(),
          transactions: result.rows,
          totalTransactions: result.count,
          from: from,
          count: count,
          jsonBeautifier: jsonBeautifier
        });
      });
    });
    app.get("/administratie/payments", function(req, res) {
      var count, from, query, userId;
      userId = req.query.user_id || "";
      count = req.query.count || 20;
      from = req.query.from != null ? parseInt(req.query.from) : 0;
      query = {
        include: [
          {
            model: global.db.PaymentLog
          }
        ],
        order: [["created_at", "DESC"]],
        limit: count,
        offset: from
      };
      if (userId) {
        query.where = {
          user_id: userId
        };
      }
      return Payment.findAndCountAll(query).complete(function(err, result) {
        if (result == null) {
          result = {
            rows: [],
            count: 0
          };
        }
        return res.render("admin/payments", {
          title: "Payments - Admin - Separdaz",
          page: "payments",
          adminUser: req.user,
          currencies: MarketHelper.getCurrencyTypes(),
          payments: result.rows,
          totalPayments: result.count,
          from: from,
          count: count,
          jsonBeautifier: jsonBeautifier
        });
      });
    });
    app.put("/administratie/pay/:id", function(req, res) {
      var id;
      id = req.params.id;
      return global.coreAPIClient.send("process_payment", [id], (function(_this) {
        return function(err, res2, body) {
          if (err) {
            return JsonRenderer.error(err, res);
          }
          if (body && (body.paymentId != null)) {
            return Payment.findById(id, function(err, payment) {
              if (!payment.isProcessed()) {
                return JsonRenderer.error("Could not process payment - " + (JSON.stringify(body)), res);
              }
              if (err) {
                return JsonRenderer.error(err, res);
              }
              return res.json(JsonRenderer.payment(payment));
            });
          } else {
            return JsonRenderer.error("Could not process payment - " + (JSON.stringify(body)), res);
          }
        };
      })(this));
    });
    app.del("/administratie/payment/:id", function(req, res) {
      var id;
      id = req.params.id;
      return global.coreAPIClient.send("cancel_payment", [id], (function(_this) {
        return function(err, res2, body) {
          if (err) {
            return JsonRenderer.error(err, res);
          }
          if (body && (body.paymentId != null)) {
            return res.json({
              id: id,
              status: "removed"
            });
          } else {
            return JsonRenderer.error("Could not cancel payment - " + (JSON.stringify(body)), res);
          }
        };
      })(this));
    });
    app.get("/administratie/banksaldo/:currency", function(req, res) {
      var currency;
      currency = req.params.currency;
      return global.coreAPIClient.send("wallet_balance", [currency], (function(_this) {
        return function(err, res2, body) {
          if (err) {
            return JsonRenderer.error(err, res);
          }
          if (body && (body.balance != null)) {
            return res.json(body);
          } else {
            return res.json({
              currency: currency,
              balance: "wallet error"
            });
          }
        };
      })(this));
    });
    app.post("/administratie/wallet_info", function(req, res) {
      var currency;
      currency = req.body.currency;
      return global.coreAPIClient.send("wallet_info", [currency], (function(_this) {
        return function(err, res2, body) {
          if (err) {
            return JsonRenderer.error(err, res);
          }
          if (body && (body.info != null)) {
            return res.json(body);
          } else {
            return res.json({
              currency: currency,
              info: "wallet error"
            });
          }
        };
      })(this));
    });
    app.post("/administratie/search_user", function(req, res) {
      var renderUser, term;
      term = req.body.term;
      renderUser = function(err, user) {
        if (user == null) {
          user = {};
        }
        return res.json(user);
      };
      if (!_.isNaN(parseInt(term))) {
        return User.findById(term, renderUser);
      }
      if (term.indexOf("@") > -1) {
        return User.findByEmail(term, renderUser);
      }
      return User.findByUsername(term, function(err, user) {
        if (user) {
          return renderUser(err, user);
        }
        return Wallet.findByAddress(term, function(err, wallet) {
          if (wallet) {
            return User.findById(wallet.user_id, renderUser);
          }
          return res.json({
            error: "Could not find user by " + term
          });
        });
      });
    });
    app.get("/administratie/markets", function(req, res) {
      return MarketStats.getStats(function(err, markets) {
        return res.render("admin/markets", {
          title: "Markets - Admin - Separdaz",
          page: "markets",
          adminUser: req.user,
          currencies: MarketHelper.getCurrencyTypes(),
          markets: markets
        });
      });
    });
    app.put("/administratie/markets/:id", function(req, res) {
      return MarketStats.setMarketStatus(req.params.id, req.body.status, function(err, market) {
        if (err) {
          console.error(err);
        }
        return res.json(market);
      });
    });
    app.post("/administratie/resend_user_verification_email/:id", function(req, res) {
      return User.findById(req.params.id, function(err, user) {
        if (user) {
          return user.sendEmailVerificationLink(function(err) {
            if (err) {
              console.error(err);
              return res.json({
                error: "Could not send email " + err
              });
            } else {
              return res.json({
                user_id: user.id
              });
            }
          });
        } else {
          return res.json({
            error: "Could not find user " + userId
          });
        }
      });
    });
    return login = function(req, res, next) {
      return passport.authenticate("local", function(err, user, info) {
        if (err) {
          return res.redirect("/administratie/login");
        }
        if (!user) {
          return res.redirect("/administratie/login");
        }
        return req.logIn(user, function(err) {
          if (err) {
            return res.redirect("/administratie/login");
          }
          if (process.env.NODE_ENV === "production") {
            if (user.gauth_key && !user.isValidGAuthPass(req.body.gauth_pass)) {
              req.logout();
              return res.redirect("/administratie/login");
            }
          }
          return res.redirect("/administratie");
        });
      })(req, res, next);
    };
  };

}).call(this);
