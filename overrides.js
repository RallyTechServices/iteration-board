Ext.override(Rally.ui.cardboard.CardBoard,{
    /*
     * Define a set of filters to choose which columns to show
     * based on the iterations starting with a given column
     * 
     * (Start with current if null provided)
     */
    _getColumnFilters: function() {
        var start_date = new Date();
        if ( this.startIteration && this.startIteration.get('StartDate') ) {
            start_date = this.startIteration.get('StartDate');
        }
        var filters = [{property:'EndDate', value: Rally.util.DateTime.toIsoString(start_date) , operator: ">"}];
        return filters;
    },
    
    _buildColumnsFromModel: function() {
        var retrievedColumns = [];
        var model = this.models[this.types[0]];
        
        // create an empty column
        retrievedColumns.push({
               value: "",
               displayValue:  "None"
        });
        if (model) {
            var attribute = model.getField(this.attribute);
            // get particular iterations
            
            console.log( this.startIteration );
            var filters = this._getColumnFilters();
            Ext.create('Rally.data.WsapiDataStore',{
                model:'Iteration',
                autoLoad:true,
                limit: 4,
                pageSize: 4,
                context: {
                    projectScopeUp: false,
                    projectScopeDown: false    
                },
                filters: filters,
                listeners: {
                    scope: this,
                    load:function(store,iterations){
                        Ext.Array.each(iterations,function(iteration){
                            var value = iteration.getData();
                            value.StringValue = value.Name;
                            
                            retrievedColumns.push({
                                   value: value,
                                   displayValue: iteration.get('Name') || "None"
                            });
                        });
                       this.fireEvent('columnsretrieved', this, retrievedColumns);

                        this.columnDefinitions = [];
                        Ext.each(retrievedColumns, function(column) {
                            this._addColumn(column);
                        }, this);
                        this._renderColumns();
                    }
                }
            });
        }
    }
});

Ext.override(Rally.ui.cardboard.plugin.ColumnDropController,{
    onCardDropped: function(dragData, index) {
        var card = dragData.card,
            record = card.getRecord(),
            sourceColumn = dragData.column,
            sourceIndex = sourceColumn.findCardInfo(record).index,
            params = {},
            column = this.column,
            records = column.getRecords();

        // no index is provided if dropped in the bottom of the column
        if (isNaN(index)) {
            index = records.length;
        }
        if (records.length && column.mayRank() && (sourceColumn === column || column.enableCrossColumnRanking)) {
            if (index === 0) {
                params = {
                    rankAbove: Rally.util.Ref.getRelativeUri(records[index].get("_ref"))
                };
            } else {
                params = {
                    rankBelow: Rally.util.Ref.getRelativeUri(records[index - 1].get("_ref"))
                };
            }
        }

        //Adjust for moving down in same column
        if (sourceColumn === column && index > column.findCardInfo(record).index) {
            index--;
        }

        //clearing ready if card is dropped in new column, has a _hasReadyField function, and has a ready field
        var currentReadyValue;
        if(sourceColumn !== column && record.isFieldVisible('Ready')){
            currentReadyValue = record.get('Ready');
            record.set('Ready', false);
        }

        column.addCard(card, index);

        var type = sourceColumn === column ? "reorder" : "move";

        
        if (column.fireEvent("beforecarddroppedsave", column, card, type) !== false) {
            if ( !record.get('Iteration') || record.get("Iteration")._ref === null ) {
                record.set("Iteration","");
            }
            record.save({
                requester: column,
                callback: function(updatedRecord, operation) {
                    if (operation.success) {
                        this._onDropSaveSuccess(column, sourceColumn, card, updatedRecord, type);
                    } else {
                        this._onDropSaveFailure(column, sourceColumn, currentReadyValue, record, card, sourceIndex);
                    }
                },

                scope: this,
                params: Ext.apply({
                    fetch: column.getAllFetchFields()
                }, params)
            });
        }
    }
});

Ext.override(Rally.ui.cardboard.Column, {
    _buildTypeColumnStore: function(type, filter) {
        var columnValue,
            wsapiStoreConfig = Ext.apply({
            model: type,
            requester: this
        }, Ext.clone(this.storeConfig));

        wsapiStoreConfig.fetch = this.getAllFetchFields();

        columnValue = this.getValue();
        wsapiStoreConfig.filters.push(filter || {
            property: "Iteration.Name",
            operator: "=",
            value: columnValue.StringValue
        });

        return Ext.create('Rally.data.WsapiDataStore', wsapiStoreConfig);
    },
    refreshCard: function(record, options) {
            var foundCard = typeof record.card !== 'undefined' ? record : this.findCardInfo(record);
            if (foundCard) {
                record = foundCard.record;
                this.refreshRecord(record, function(records) {
                    if (records.length === 0) {
                        this.removeCard(foundCard);
                    } else if (records.length == 1) {
                        var record = records[0],
                            card = foundCard.card;
                        card.setRecord(record);
                        
                        var record_value = record.get(this.attribute);
                        
                        if (record_value && record_value.Name != this.getValue().StringValue) {
                            this.fireEvent('cardinvalid', card, this);
                        } else {
                            card.reRender();
                        }
                        options = options || {};
                        Ext.callback(options.callback, options.scope, [card]);
                    }
                    this.fireEvent('contentupdated');
                });
            }
        },
        
    isMatchingRecord: function(record) {
        
        var recordValue = record.get(this.attribute),
            field = record.fields.get(this.attribute);

        if (!field) {
            return false;
        }

        var columnValue = this.getValue();
        // Field values can be converted from null. So we need to convert the column
        // value in case it is null
        if (Ext.isFunction(field.convert)) {
            columnValue = field.convert(columnValue);
        }
        
        var isMatching = false;
        if ( columnValue.StringValue ) {
            return ( columnValue.StringValue === recordValue.Name ) ;
        } else {
            return true;
        }
    }
});

