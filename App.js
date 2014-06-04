
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    
    items:[ 
        {xtype:'container', itemId:'selector_box', layout: { type:'hbox'} },
        {xtype:'container',itemId:'feature_box',tpl:"<tpl>Feature chosen: {FormattedID}:{Name}</tpl>" },
        {xtype:'container',itemId:'display_box'}
    ],
    
    launch: function() {
        
        this.down('#selector_box').add({
            xtype:'rallybutton',
            text:'Choose Feature',
            margin: 5,
            listeners: {
                scope: this,
                click: function(){
                    this._showFeatureChooser();
                }
            }
        });
       
        // add an empty separator
        this.down('#selector_box').add({xtype:'container',width: 100});
        
        this.down('#selector_box').add({
            xtype: 'rallyiterationcombobox',
            fieldLabel: 'First Column',
            margin: 5,
            labelWidth: 75,
            width: 250,
            listeners: {
                scope: this,
                change: function(picker){ 
                    this.picker = picker;
                    this._createCardboard();
                },
                ready: function(picker){ 
                    this.picker = picker;
                    this._createCardboard();
                }
            }
        });
        
    },
    _showFeatureChooser: function(){
        console.log('here we are');
        Ext.create('Rally.ui.dialog.ChooserDialog',{
            artifactTypes:['portfolioitem/feature'],
            autoShow: true,
            title:'Feature Chooser',
            listeners: {
                scope: this,
                artifactChosen: function(selected_record){
                    this.feature = selected_record;
                    var feature_data = null;
                    if ( this.feature ) { feature_data = this.feature.getData(); }
                    this.down('#feature_box').update(feature_data);

                    this._createCardboard();
                }
            }
        });
    },
    _createCardboard:function(){
        var feature = this.feature;
        var picker = this.picker;
        
        if ( this.board ) { this.board.destroy(); }
        if ( feature ) {

            var filters = [];
        
            filters.push({property:'DirectChildrenCount',value: 0});
            filters.push({property:'Feature.ObjectID',value:feature.get('ObjectID')});
           
            var start_iteration = picker.getRecord();
            
            this.board = this.down('#display_box').add({
                xtype:'rallycardboard',
                types: ['HierarchicalRequirement'],
                attribute: 'Iteration',
                startIteration: start_iteration,
                storeConfig: {
                    filters: filters
                }
            });
        } else {
            this.board = this.down('#display_box').add({ xtype:'container',html:'Nope.'});
        }
    }
});
