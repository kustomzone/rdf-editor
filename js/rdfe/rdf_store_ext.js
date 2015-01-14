/* Extensions for rdfstore.js */
/**
 * Try to abbreviate a URI using the prefixes defined in the rdfstore.
 * @param uri An rdfstore URI node
 * @return The abbreviated CURI string or a @p null if no prefix could be found to match the URI.
 */
rdfstore.Store.prototype.uriToCuri = function(uri) {
    var x = node.toString();
    for (prefix in this.rdf.prefixes) {
        var ns = this.rdf.prefixes[prefix];
        if(ns.length > 0 && x.startsWith(ns)) {
            return x.replace(ns, prefix + ':');
        }
    }
    return null;
};

/**
 * Try to convert an abbreviated CURI into a URI using the prefixes defined in the rdfstore.
 * @param curi The abbreviated URI (Example: @p rdf:type)
 * @return The full URI if the prefix could be found, @p null otherwise.
 */
rdfstore.Store.prototype.curiToUri = function(curi) {
    return this.rdf.resolve(curi);
};

rdfstore.Store.prototype.parseLiteral = function(literalString) {
    var parts = literalString.lastIndexOf("@");
    if(parts!=-1 && literalString[parts-1]==='"' && literalString.substring(parts, literalString.length).match(/^@[a-zA-Z\-]+$/g)!=null) {
        var value = literalString.substring(1,parts-1);
        var lang = literalString.substring(parts+1, literalString.length);
        return {token: "literal", value:value, lang:lang};
    }
    var parts = literalString.lastIndexOf("^^");
    if(parts!=-1 && literalString[parts-1]==='"' && literalString[parts+2] === '<' && literalString[literalString.length-1] === '>') {
        var value = literalString.substring(1,parts-1);
        var type = literalString.substring(parts+3, literalString.length-1);
        return {token: "literal", value:value, type:type};
    }
    var value = literalString.substring(1,literalString.length-1);
    return {token:"literal", value:value};
};


rdfstore.Store.prototype.termToNode = function(term) {
  if (term.token == "literal")
    return this.rdf.createLiteral(term.value, term.lang, term.type);
  else if(term.token == "uri")
    return this.rdf.createNamedNode(term.value);
  else
    return this.rdf.createNamedNode(term.value); // FIXME: blank nodes are so much trouble. We need to find a way to handle them properly
};

rdfstore.Store.prototype.rdf.api.NamedNode.prototype.localeCompare = function(compareNode, locales, options) {
    return this.toString().localeCompare(compareNode.toString(), locales, options);
};

rdfstore.Store.prototype.rdf.api.Literal.prototype.localeCompare = function(compareNode, locales, options) {
    return this.toString().localeCompare(compareNode.toString(), locales, options);
};

// FIXME: No Blank node support!!!!!
rdfstore.Store.prototype.n3ToRdfStoreTriple = function(triple) {
  //console.log('Convert N3 triple: ', triple);
  var s = this.rdf.createNamedNode(triple.subject);
  var p = this.rdf.createNamedNode(triple.predicate);
  var o = null;
  if(N3.Util.isLiteral(triple.object)) {
      // rdfstore treats the empty string as a valid language
      var l = N3.Util.getLiteralLanguage(triple.object);
      if(l == '')
          l = null;
      o = this.rdf.createLiteral(N3.Util.getLiteralValue(triple.object), l, N3.Util.getLiteralType(triple.object));
  }
  else {
      o = this.rdf.createNamedNode(triple.object);
  }
  //console.log('Converted triple: ', this.rdf.createTriple(s, p, o));
  return this.rdf.createTriple(s, p, o);
};