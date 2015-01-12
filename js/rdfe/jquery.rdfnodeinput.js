/*
literal editor:
- options:
  - type (string, int, decimal, datetime, date)
  - optional lang select for "type == string"
  - optional type selection if the type is not given (dropdown)
- input verification
- date and datetime selection

resource editor:
- options
  - list of possibilities (uri + optional label + curi)
  - custom input yes/no
*/

(function ($) {
  var defaults = {
    type: null,
    showLangSelect: true,
  };

  var intVerify = function(v, includeZero, includeNeg, includePos, maxi, mini) {
    var i = parseInt(v, 10);
    if(isNaN(i))
      return false;
    if(!includeZero && i == 0)
      return false;
    if(!includeNeg && i < 0)
      return false;
    if(!includePos && i > 0)
      return false;
    if(maxi != undefined && i > maxi)
      return false;
    if(mini != undefined && i < mini)
      return false;
    return true;
  };

  var decimalCheck = function(v) {
    return $.isNumeric(v);
  };

  var literalTypes = {
    'http://www.w3.org/2000/01/rdf-schema#Literal': {
      label: 'Plain Literal'
    },
    "http://www.w3.org/2001/XMLSchema#integer": {
      label: 'Integer',
      verify: function(v) {
        return intVerify(v, true, true, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#decimal": {
      label: 'Decimal',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#double": {
      label: 'Double',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#float": {
      label: 'Float',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#nonPositiveInteger": {
      label: 'Non-Positive Integer',
      verify: function(v) {
        return intVerify(v, true, true, false);
      }
    },
    "http://www.w3.org/2001/XMLSchema#negativeInteger": {
      label: 'Negative Integer',
      verify: function(v) {
        return intVerify(v, false, true, false);
      }
    },
    "http://www.w3.org/2001/XMLSchema#long": {
      label: 'Long',
      verify: function(v) {
        return intVerify(v, true, true, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#int": {
      label: 'Int',
      verify: function(v) {
        return intVerify(v, true, true, true, 2147483647, -2147483648);
      }
    },
    "http://www.w3.org/2001/XMLSchema#short": {
      label: 'Short',
      verify: function(v) {
        return intVerify(v, true, true, true, 32767, -32768);
      }
    },
    "http://www.w3.org/2001/XMLSchema#byte": {
      label: 'Byte',
      verify: function(v) {
        return intVerify(v, true, true, true, 127, -128);
      }
    },
    "http://www.w3.org/2001/XMLSchema#nonNegativeInteger": {
      label: 'Non-Negative Integer',
      verify: function(v) {
        return intVerify(v, true, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedLong": {
      label: 'Unsigned Long',
      verify: function(v) {
        return intVerify(v, true, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedInt": {
      label: 'Unsigned Int',
      verify: function(v) {
        return intVerify(v, true, false, true, 4294967295);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedShort": {
      label: 'Unsigned Short',
      verify: function(v) {
        return intVerify(v, true, false, true, 65535);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedByte": {
      label: 'Unsigned Byte',
      verify: function(v) {
        return intVerify(v, true, true, true, 255);
      }
    },
    "http://www.w3.org/2001/XMLSchema#positiveInteger": {
      label: 'Positive Integer',
      verify: function(v) {
        return intVerify(v, false, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#boolean": {
      label: 'Boolean'
    },
    "http://www.w3.org/2001/XMLSchema#string": {
      label: 'String'
    },
    "http://www.w3.org/2001/XMLSchema#dateTime": {
      label: 'Datetime'
    },
    "http://www.w3.org/2001/XMLSchema#date": {
      label: 'Date'
    }
  };

  var toStoreNodeFct = function(store) {
    return store.rdf.createLiteral(this.value, this.language, this.datatype);
  };

  var toStringFct = function() {
    return this.value;
  };

  var LiteralEditor = function(elem, options) {
    var self = this;

    self.mainElem = elem;
    self.options = $.extend({}, defaults, options);
    self.currentType = self.options.type || 'http://www.w3.org/2000/01/rdf-schema#Literal';

    self.mainElem.on('input', function() { self.verifyInput(); });

    // put the input into a div for easier control
    var $c = $(document.createElement('div')).addClass('literalEditor');
    var $e = $(elem);
    $e.after($c);
    $c.append($e);

    // create language input
    var $ls = $(document.createElement('input'));
    self.langElem = $ls;
    $ls.addClass('form-control');
    $c.append($ls);
    if(self.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal')
      $ls.hide();
    $ls.on('input', function() {
      self.lang = $ls.val();
      self.verifyInput();
    });
    if (!self.options.showLangSelect) {
      $ls.hide();
    }

    // create type-selection
    var $t = $(document.createElement('select'));
    self.typeElem = $t;
    $t.addClass('form-control');
    for(t in literalTypes) {
      $t.append($(document.createElement('option')).attr('value', t).text(literalTypes[t].label));
    }
    $c.append($t);
    $t.change(function() {
      self.currentType = $t.val();
      self.verifyFct = literalTypes[self.currentType].verify;
      if(self.options.showLangSelect) {
        if(self.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal')
          $ls.hide();
        else
          $ls.show();
      }
      self.verifyInput();
    });
    if(self.options.type) {
      $t.val(self.options.type);
      $t.hide();
    }
  };

  LiteralEditor.prototype.getValue = function() {
    return {
      value: this.mainElem.val(),
      datatype: (this.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal' ? this.currentType : undefined),
      language: (this.lang ? this.lang : undefined),
      toStoreNode: toStoreNodeFct,
      toString: toStringFct
    };
  };

  LiteralEditor.prototype.setValue = function(node) {
    //console.log('LiteralEditor.prototype.setValue ', node);
    if(node) {
      this.currentType = node.datatype || 'http://www.w3.org/2000/01/rdf-schema#Literal';
      this.lang = node.language;

      this.mainElem.val(node.value || node.nominalValue);
      this.langElem.val(this.lang);
      this.typeElem.val(this.currentType);

      // always show the type selection field if the type differs
      if(this.options.type != node.datatype)
        this.typeElem.show();
      if(this.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal')
        this.langElem.hide();
    }
  };

  LiteralEditor.prototype.isValid = function(node) {
    return(this.verifyFct ? this.verifyFct(this.mainElem.val()) : true);
  };

  LiteralEditor.prototype.verifyInput = function() {
    var self = this;
    var val = $(this.mainElem).val();
    var v = true;
    if(val.length > 0)
      v = (this.verifyFct ? this.verifyFct(val) : true);
    if (v)
      self.mainElem.removeClass('has-error');
    else
      self.mainElem.addClass('has-error');
  };

  LiteralEditor.prototype.setEditFocus = function() {
    this.mainElem.focus();
  };

  $.fn.literalEditor = function(methodOrOptions) {
    var le = this.data('literalEditor');
    if(!le) {
      le = new LiteralEditor(this, methodOrOptions);
      this.data('literalEditor', le);
    }
    return le;
  };
})(jQuery);
