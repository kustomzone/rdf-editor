(function($) {
  if (!window.RDFE) {
    window.RDFE = {};
  }

  RDFE.SubjectEditor = (function() {
    // constructor
    var c = function(doc, ontologyManager, subject) {
      this.doc = doc;
      this.namingSchema = doc.config.options[doc.config.options["namingSchema"]];
      this.ontologyManager = ontologyManager;
      this.subject = subject;
    };

    var nodeFormatter = function(value) {
      if (value.interfaceName == "Literal") {
        if (value.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime') {
          return (new Date(value.nominalValue)).toString();
        }
        return value.nominalValue;
      }
      return value.toString();
    };

    c.prototype.template = _.template(' \
      <div class="panel panel-default"> \
        <div class="panel-heading clearfix"> \
          <form class="form-inline"> \
            <div class="form-group" style="width: 80%;"> \
              <label>Selected <%= RDFE.Utils.namingSchemaLabel("s", this.namingSchema) %> </label> \
              <input name="subject" class="form-control" style="width: 85%;" disabled="disabled" /> \
            </div> \
            <div class="btn-group pull-right" role="group"> \
              <button type="button" class="btn btn-default btn-sm" id="backButton">Back</button> \
            </div> \
          </form> \
        </div> \
        <div class="panel-body" id="subjectTable"> \
        </div> \
        <div class="panel-body" id="subjectForm" style="display: none;"> \
      </div>'
    );

    c.prototype.render = function(editor, container, backCallback) {
      var self = this;

      var subjectEditorNew = function(container, backCallback) {
        var $ontologiesSelect, ontologiesSelect;
        var $classesSelect, classesSelect;

        var classesList = function (e) {
          var ontology = self.ontologyManager.ontologyByURI(e.currentTarget.selectedOntologyURI());
          classesSelect.clearOptions();
          classesSelect.addOption(ontology ? ontology.classesAsArray() : self.ontologyManager.allClasses());
        };

        container.html(
          '<div class="panel panel-default">' +
          '  <div class="panel-heading">' +
          '    <h3 class="panel-title">Add new ' + RDFE.Utils.namingSchemaLabel('s', self.namingSchema) + '</h3>' +
          '  </div>' +
          '  <div class="panel-body">' +
          '    <div class="form-horizontal"> ' +
          '      <div class="form-group"> ' +
          '        <label for="ontology" class="col-sm-2 control-label">Ontology</label> ' +
          '        <div class="col-sm-10"> ' +
          '          <select name="ontology" id="ontology" class="form-control" /> ' +
          '        </div> ' +
          '      </div> ' +
          '      <div class="form-group"> ' +
          '        <label for="class" class="col-sm-2 control-label">Type</label> ' +
          '        <div class="col-sm-10"> ' +
          '          <select name="class" id="class" class="form-control" /> ' +
          '        </div> ' +
          '      </div> ' +
          '      <div class="form-group"> ' +
          '         <label for="subject" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('s', self.namingSchema) + ((self.doc.config.options.entityUriTmpl) ? ' Name' : ' URI') + '</label> ' +
          '         <div class="col-sm-10"> ' +
          '           <input name="subject" id="subject" class="form-control" /> ' +
          '         </div> ' +
          '      </div> ' +
          '      <div class="form-group"> ' +
          '        <div class="col-sm-10 col-sm-offset-2"> ' +
          '          <a href="#" class="btn btn-default triple-action triple-action-new-cancel">Cancel</a> ' +
          '          <a href="#" class="btn btn-primary triple-action triple-action-new-save">OK</a> ' +
          '        </div> ' +
          '      </div> ' +
          '    </div>' +
          '  </div>' +
          '</div>\n');

        ontologiesSelect = $('#ontology').ontoBox({ "ontoManager": self.ontologyManager });
        ontologiesSelect.on('changed', classesList);
        ontologiesSelect.sel.focus();

        // FIXME: this is all pretty much the same as in the PropertyBox, in any case it should be moved into a separate class/file
        $classesSelect = $('#class').selectize({
          "create": true,
          "valueField": 'URI',
          "labelField": 'URI',
          "searchField": [ "title", "label", "prefix", "URI" ],
          "sortField": [ "prefix", "URI" ],
          "options": self.ontologyManager.allClasses(),
          "create": function(input, cb) {
            // search for and optionally create a new class
            cb(self.ontologyManager.ontologyClassByURI(self.ontologyManager.uriDenormalize(input), true));
          },
          "render": {
            "item": function(item, escape) {
              var x = item.title || item.label || name.curi || item.name;
              if(item.curi && item.curi != x) {
                x = escape(x) + ' <small>(' + escape(item.curi) + ')</small>';
              }
              else {
                x = escape(x);
              }
              return '<div>' + x + '</div>';
            },
            "option": function(item, escape) {
              return '<div>' + escape(item.title || item.label || name.curi || item.name) + '<br/><small>(' + escape(item.URI) + ')</small></div>';
            },
            "option_create": function(data, escape) {
              var url = self.ontologyManager.uriDenormalize(data.input);
              if (url !== data.input) {
                return '<div class="create">Add <strong>' + escape(data.input) + '</strong> <small>(' + escape(url) + ')</small>&hellip;</div>';
              }
              return '<div class="create">Add <strong>' + escape(url) + '</strong>&hellip;</div>';
            }
          }
        });
        classesSelect = $classesSelect[0].selectize;

        // if we have an entity uri template we ask the user to provide a nem instead of the uri
        container.find('a.triple-action-new-cancel').click(function(e) {
          e.preventDefault();
          backCallback();
        });

        var saveFct = function() {
          var uri = container.find('input[name="subject"]').val(),
              name = null,
              type = container.find('#class')[0].selectize.getValue();

          if (self.doc.config.options.entityUriTmpl) {
            name = uri;
            uri = null;
          }

          self.doc.addEntity(uri, name, type, function(entity) {
            $(self).trigger('rdf-editor-success', {
              "type": "entity-insert-success",
              "message": "Successfully created new entity."
            });
            self.doc.getSubject(entity.uri, function (subject) {
              editor.subjectView.addSubject(subject);

              self.subject = subject;
              self.render(editor, container, backCallback);
            });
          }, function() {
            $(self).trigger('rdf-editor-error', {
              "type": 'triple-insert-failed',
              "message": "Failed to add new triple to store."
            });
          });
        };

        container.find('a.triple-action-new-save').click(function(e) {
          e.preventDefault();
          saveFct();
        });

        container.find('input#subject').keypress(function(e) {
          if (e.which === 13) {
            saveFct();
          }
        })
      };

      var subjectEditorData = function(container, backCallback) {
        $list.bootstrapTable({
          "striped": true,
          "sortName": 'subject',
          "pagination": true,
          "search": true,
          "searchAlign": 'left',
          "showHeader": true,
          "editable": true,
          "data": [],
          "dataSetter": subjectEditorDataSetter,
          "columns": [{
            "field": 'predicate',
            "title": RDFE.Utils.namingSchemaLabel('p', self.namingSchema),
            "sortable": true,
            "editable": function(triple) {
              return {
                "mode": "inline",
                "type": "rdfnode",
                "rdfnode": {
                  "type": 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource'
                },
                "value": triple.predicate
              }
            },
            "formatter": nodeFormatter
          }, {
            "field": 'object',
            "title": RDFE.Utils.namingSchemaLabel('o', self.namingSchema),
            "sortable": true,
            "editable": function(triple) {
              return {
                "mode": "inline",
                "type": "rdfnode",
                "value": triple.object
              };
            },
            formatter: nodeFormatter
          }, {
            "field": 'actions',
            "title": '<button class="add btn btn-default" title="Add Relation" style="display: none;"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span> New</button>',
            "align": 'center',
            "valign": 'middle',
            "class": 'small-column',
            "clickToSelect": false,
            "editable": false,
            "formatter": function(value, row, index) {
              return [
                '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
                '<i class="glyphicon glyphicon-remove"></i>',
                '</a>'
              ].join('');
            },
            "events": {
              'click .remove': function (e, value, row, index) {
                self.doc.deleteTriple(row, function() {
                  $list.bootstrapTable('remove', {
                    field: 'id',
                    values: [row.id]
                  });
                }, function() {
                  $(self).trigger('rdf-editor-error', { "type": 'triple-delete-failed', "message": 'Failed to delete triple.' });
                });
              }
            }
          }]
        });

        self.subjectTable = $list;
        self.subjectTableContainer = container.find('#subjectTable');
        self.subjectFormContainer = container.find('#subjectForm');
        self.addButton = $($list).find('.add');
        self.addButton.click(function() {
          self.createNewRelationEditor();
        });

        // reftersh subjects data
        self.renderData();
      };

      var subjectEditorDataSetter = function(triple, field, newValue) {
        var newNode = newValue;

        if (field === 'subject') {
          newNode = self.doc.store.rdf.createNamedNode(newValue);
        }
        if (newValue.toStoreNode) {
          if (newValue.type == 'uri') {
            newValue.value = self.ontologyManager.uriDenormalize(newValue.value);
          }
          newNode = newValue.toStoreNode(self.doc.store);
        }
        else if (field != 'object' ||
          triple.object.interfaceName == 'NamedNode') {
          newNode = self.doc.store.rdf.createNamedNode(newValue);
        }
        else if (triple.object.datatype == 'http://www.w3.org/2001/XMLSchema#dateTime') {
          var d = new Date(newValue);
          newNode = self.doc.store.rdf.createLiteral(d.toISOString(), triple.object.language, triple.object.datatype);
        }
        else {
          newNode = self.doc.store.rdf.createLiteral(newValue, triple.object.language, triple.object.datatype);
        }

        var newTriple = self.doc.store.rdf.createTriple(triple.subject, triple.subject, triple.object);
        newTriple[field] = newNode;
        self.doc.updateTriple(triple, newTriple, function(success) {
          // do nothing
        }, function(msg) {
          $(self).trigger('rdf-editor-error', { message: 'Failed to update triple in document: ' + msg });
        });
      };

      container.empty();
      if (self.subject) {
        // create the basic entity editor layout using the template above
        container.append(self.template(self.subject));

        var $list = $(document.createElement('table')).addClass('table');
        container.find('#subjectTable').append($list);

        // add click handlers to our buttons (we have three handlers because we used to have three buttons)
        var backButton = container.find('button#backButton');
        backButton.click(function() {
          backCallback();
        });

        var inputSelect = container.find('input[name="subject"]');
        inputSelect.val(self.subject.uri);

        subjectEditorData(container, backCallback);
      }
      else {
        subjectEditorNew(container, backCallback);
      }

    };

    c.prototype.renderData = function() {
      var self = this;

      var subjects = (self.subject) ? self.subject.items : [];
      for(var i = 0; i < subjects.length; i++) {
        subjects[i].id = i;
      }
      self.subjectTable.data('maxindex', i);
      self.subjectTable.bootstrapTable('load', subjects);;
      if (self.subject) {
        self.addButton.show();
      }
      else {
        self.addButton.hide();
      }
    },

    c.prototype.addTriple = function(triple) {
      var i = this.subjectTable.data('maxindex');
      this.subjectTable.bootstrapTable('append', $.extend(triple, {
        id: i
      }));
      this.subjectTable.data('maxindex', ++i);
    };

    c.prototype.createNewRelationEditor = function() {
      var self = this;

      self.subjectTableContainer.hide();
      self.subjectFormContainer.html(
        '<div class="panel panel-default"> ' +
        '  <div class="panel-heading"><h3 class="panel-title">Add Relation</h3></div> ' +
        '  <div class="panel-body"> ' +
        '    <form class="form-horizontal"> ' +
        '      <div class="form-group"> ' +
        '        <label for="predicate" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('p', self.namingSchema) + '</label> ' +
        '        <div class="col-sm-10"><select name="predicate" class="form-control"></select></div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <label for="object" class="col-sm-2 control-label">' + RDFE.Utils.namingSchemaLabel('o', self.namingSchema) + '</label> ' +
        '        <div class="col-sm-10"><input name="object" class="form-control" /></div> ' +
        '      </div> ' +
        '      <div class="form-group"> ' +
        '        <div class="col-sm-10 col-sm-offset-2"> ' +
        '          <button type="button" class="btn btn-default subject-action subject-action-new-cancel">Cancel</button> ' +
        '          <button type="button" class="btn btn-primary subject-action subject-action-new-save">OK</button> ' +
        '        </div> ' +
        '      </div> ' +
        '    </form> ' +
        '  </div> ' +
        '</div>'
      ).show();

      var objectEdit = self.subjectFormContainer.find('input[name="object"]').rdfNodeEditor();
      objectEdit.setValue(new RDFE.RdfNode('literal', '', null, ''));

      var predicateEdit = self.subjectFormContainer.find('select[name="predicate"]').propertyBox({
        ontoManager: self.ontologyManager
      }).on('changed', function(e, predicate) {
        var newNode;
        var currentNode = objectEdit.getValue();
        var range = predicate.getRange();

        if (objectEdit.isLiteralType(range)) {
          newNode = new RDFE.RdfNode('literal', currentNode.value, range, currentNode.language);
        }
        else if (self.ontologyManager.ontologyClassByURI(range)) {
          newNode = new RDFE.RdfNode('uri', currentNode.value);
        }
        else {
          newNode = new RDFE.RdfNode('literal', currentNode.value, null, '');
        }
        objectEdit.setValue(newNode);
      });

      self.subjectFormContainer.find('button.subject-action-new-cancel').click(function(e) {
        self.subjectFormContainer.hide();
        self.subjectTableContainer.show();
      });

      self.subjectFormContainer.find('button.subject-action-new-save').click(function(e) {
        var s = self.subject.uri;
        var p = predicateEdit.selectedURI();
        var o = objectEdit.getValue();
        if (o.type == 'uri') {
          o.value = self.ontologyManager.uriDenormalize(o.value);
        }
        var t = self.doc.store.rdf.createTriple(self.doc.store.rdf.createNamedNode(s), self.doc.store.rdf.createNamedNode(p), o.toStoreNode(self.doc.store));
        self.doc.addTriples([t], function() {
          if (!self.subjectView) {
            self.addTriple(t);
          }
          $(self).trigger('rdf-editor-success', {
            "type": "triple-insert-success",
            "message": "Successfully added new statement."
          });
          self.subjectFormContainer.hide();
          self.subjectTableContainer.show();
        }, function() {
          $(self).trigger('rdf-editor-error', {
            "type": 'triple-insert-failed',
            "message": "Failed to add new statement to store."
          });
        });
      });
    };

    return c;
  })();
})(jQuery);