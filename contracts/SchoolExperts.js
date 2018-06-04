"use strict"

var BalanceContent = function (text) {
  this.experts = []
};

var SchoolExperts = function() {
  LocalContractStorage.defineProperty(this, "owner", null)
  LocalContractStorage.defineMapProperty(this, "list")
  LocalContractStorage.defineMapProperty(this, "balances")
  LocalContractStorage.defineMapProperty(this, "experts")
};

SchoolExperts.prototype = {
    init: function() {
      this.owner = Blockchain.transaction.from;
      this.list.set("experts", []);
    },

    start: function(payee) {
      if (!Blockchain.verifyAddress(payee)) {
        throw new Error("Invalid address");
      }

      var from = Blockchain.transaction.from;
      var value = Blockchain.transaction.value;

      var expert = this.experts.get(payee);
      if (expert) {
        if (!new BigNumber(expert.cost).eq(new BigNumber(value))) {
          throw new Error("You need to pay " + expert.cost);
        }
      } else {
        throw new Error("Expert does not exist");
      }

      var orig_balance = this.balances.get(from);
      if (orig_balance) {
        var result_object = this._search(payee, orig_balance.experts);
        if (result_object) {
          orig_balance.experts[result_object.pos].value = new BigNumber(orig_balance.experts[result_object.pos].value).plus(new BigNumber(value))
        } else {
          orig_balance.experts.push({
            payee: payee,
            value: value
          })
        }
        this.balances.set(from, orig_balance)
      } else {
        var balance = new BalanceContent();
        balance.experts.push({
          payee: payee,
          value: value
        })
        this.balances.set(from, balance);
      }
      return this.balances.get(from)
    },

    end: function(payer, payee) {
      if (!Blockchain.verifyAddress(payer) || !Blockchain.verifyAddress(payee)) {
        throw new Error("Invalid adress");
      }

      var from = Blockchain.transaction.from;
      this._onlyOwner(from);

      var balances = this.balances.get(from);
      var result_object = this._search(payee, balances.experts);
      if (result_object) {
        var payment = balances.experts[result_object.pos].value;
        if (Blockchain.transfer(payee, payment)) {
          balances.experts[result_object.pos].value = 0
          this.balances.set(payer, balances)
          return true
        }
      }
    },

    refund: function(payer, payee) {
      if (!Blockchain.verifyAddress(payer) || !Blockchain.verifyAddress(payee)) {
        throw new Error("Invalid adress");
      }

      var from = Blockchain.transaction.from;
      this._onlyOwner(from);

      var balances = this.balances.get(from);
      var result_object = this._search(payee, balances.experts);
      if (result_object) {
        var value = balances.experts[result_object.pos].value;
        balances.experts[result_object.pos].value = 0
        if (Blockchain.transfer(payer, value)) {
          return true
        }
      }
    },

    addExpert: function(name, description, cost, address) {
      if (this.owner != Blockchain.transaction.from) {
        throw new Error("Invalid action");
      }

      if (!Blockchain.verifyAddress(address) || !name || !description || !cost) {
        throw new Error("Something is wrong");
      }

      this.experts.set(address, {
        name: name,
        description: description,
        cost: new BigNumber(cost),
        address: address
      })

      var _experts = this.list.get("experts")
      _experts.push(address)
      this.list.set("experts", _experts)

      return this.experts.get(address)
    },

    getAllExperts: function() {
      var experts = this.list.get("experts");
      var response = [];
      for (var i = 0; i < experts.length; i++) {
          response.push(this.experts.get(experts[i]))
      }

      return response
    },

    getExpert: function(address) {
      if (!Blockchain.verifyAddress(address)) {
        throw new Error("Invalid address");
      }

      var expert = this.experts.get(address)
      if (expert) {
        return expert
      } else {
        throw new Error("Expert does not exist");
      }
    },

    _onlyOwner: function() {
      if (this.owner != Blockchain.transaction.from) {
        throw new Error("Invalid action");
      }
    },

    _search: function(nameKey, myArray) {
      for (var i = 0; i < myArray.length; i++) {
        if (myArray[i].payee === nameKey) {
          return {
            obj: myArray[i],
            pos: i
          };
        }
      }
    }
};

module.exports = SchoolExperts;